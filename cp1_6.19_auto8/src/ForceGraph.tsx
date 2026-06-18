import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  Simulation,
  SimulationNodeDatum,
  SimulationLinkDatum
} from 'd3-force';
import {
  CityNode,
  FlowEdge,
  CULTURE_COLORS,
  CULTURE_LABELS,
  REGION_LABELS,
  getNodeInfluenceAtYear,
  getEdgeStrengthAtYear,
  Region,
  CultureType
} from './SimulationEngine';

interface ForceGraphProps {
  nodes: CityNode[];
  edges: FlowEdge[];
  year: number;
  activeRegions: Region[];
  allRegions: Region[];
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  name: string;
  nameCN: string;
  region: Region;
  culture: CultureType;
  baseInfluence: number;
  connections: string[];
  isActive: boolean;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  baseStrength: number;
  culture: CultureType;
  source: SimNode | string;
  target: SimNode | string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  node: CityNode | null;
}

const ForceGraph: React.FC<ForceGraphProps> = ({
  nodes,
  edges,
  year,
  activeRegions,
  allRegions
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, node: null });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const zoomRef = useRef({ k: 1, tx: 0, ty: 0 });
  const dragInfoRef = useRef<{ nodeId: string; startX: number; startY: number } | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(400, rect.width),
          height: Math.max(300, rect.height)
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const activeRegionSet = useMemo(() => new Set(activeRegions), [activeRegions]);
  const allRegionSet = useMemo(() => new Set(allRegions), [allRegions]);

  const { width, height } = dimensions;

  useEffect(() => {
    const nodeMap = new Map<string, SimNode>();

    const simNodes: SimNode[] = nodes.map(n => {
      const existing = simNodesRef.current.find(sn => sn.id === n.id);
      const isActive = activeRegionSet.has(n.region);
      const newNode: SimNode = {
        id: n.id,
        name: n.name,
        nameCN: n.nameCN,
        region: n.region,
        culture: n.culture,
        baseInfluence: n.baseInfluence,
        connections: [...n.connections],
        isActive,
        x: existing?.x ?? n.x,
        y: existing?.y ?? n.y,
        fx: isActive ? null : (existing?.fx ?? existing?.x ?? n.x),
        fy: isActive ? null : (existing?.fy ?? existing?.y ?? n.y)
      };
      nodeMap.set(n.id, newNode);
      return newNode;
    });

    const rawLinks = edges.map(e => {
      const source = nodeMap.get(e.source);
      const target = nodeMap.get(e.target);
      if (!source || !target) return null;
      return {
        source,
        target,
        baseStrength: e.baseStrength,
        culture: e.culture
      };
    }).filter(l => l !== null);
    const simLinks: SimLink[] = rawLinks as SimLink[];

    simNodesRef.current = simNodes;
    simLinksRef.current = simLinks;

    if (simRef.current) {
      simRef.current.stop();
    }

    const activeNodes = simNodes.filter(n => n.isActive);
    const cx = width / 2;
    const cy = height / 2;

    const sim = forceSimulation<SimNode>(simNodes)
      .force('link', forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(l => {
          const s = typeof l.source === 'object' ? l.source : null;
          const t = typeof l.target === 'object' ? l.target : null;
          if (!s || !t) return 200;
          const base = 120;
          const influencePenalty = (200 - (s.baseInfluence + t.baseInfluence)) * 0.3;
          const cultureBonus = s.culture === t.culture ? -30 : 40;
          return Math.max(60, base + influencePenalty + cultureBonus);
        })
        .strength(l => getEdgeStrengthAtYear({
          source: typeof l.source === 'object' ? l.source.id : l.source,
          target: typeof l.target === 'object' ? l.target.id : l.target,
          baseStrength: l.baseStrength,
          culture: l.culture
        }, year) * 0.5)
      )
      .force('charge', forceManyBody<SimNode>()
        .strength(d => -80 - getNodeInfluenceAtYear({
          ...d,
          x: 0, y: 0
        }, year) * 1.5)
        .distanceMax(400)
      )
      .force('collide', forceCollide<SimNode>()
        .radius(d => 6 + getNodeInfluenceAtYear({
          ...d, x: 0, y: 0
        }, year) * 0.25)
        .strength(0.8)
        .iterations(2)
      )
      .force('centerX', forceX<SimNode>(cx).strength(d => d.isActive ? 0.04 : 0))
      .force('centerY', forceY<SimNode>(cy).strength(d => d.isActive ? 0.04 : 0));

    if (activeNodes.length < simNodes.length) {
      sim.force('center', forceCenter<SimNode>(cx, cy).strength(0.015));
    } else {
      sim.force('center', forceCenter<SimNode>(cx, cy).strength(0.025));
    }

    sim.alphaDecay(0.025);
    sim.velocityDecay(0.35);

    simRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [nodes, edges, width, height, activeRegionSet, year]);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;

    let rafId: number;
    let lastUpdate = 0;
    const targetFps = 30;
    const frameInterval = 1000 / targetFps;

    const updatePositions = (timestamp: number) => {
      if (timestamp - lastUpdate >= frameInterval) {
        const linkElements = gRef.current?.querySelectorAll<SVGLineElement>('.flow-edge');
        const nodeElements = gRef.current?.querySelectorAll<SVGCircleElement>('.city-node');
        const labelElements = gRef.current?.querySelectorAll<SVGTextElement>('.node-label');

        simNodesRef.current.forEach((node, i) => {
          if (nodeElements && nodeElements[i]) {
            nodeElements[i].setAttribute('cx', String(node.x));
            nodeElements[i].setAttribute('cy', String(node.y));
          }
          if (labelElements && labelElements[i]) {
            labelElements[i].setAttribute('x', String(node.x));
            labelElements[i].setAttribute('y', String(node.y));
          }
        });

        if (linkElements) {
          simLinksRef.current.forEach((link, i) => {
            const s = typeof link.source === 'object' ? link.source : null;
            const t = typeof link.target === 'object' ? link.target : null;
            if (s && t && linkElements[i]) {
              linkElements[i].setAttribute('x1', String(s.x));
              linkElements[i].setAttribute('y1', String(s.y));
              linkElements[i].setAttribute('x2', String(t.x));
              linkElements[i].setAttribute('y2', String(t.y));
            }
          });
        }

        lastUpdate = timestamp;
      }

      rafId = requestAnimationFrame(updatePositions);
    };

    sim.on('tick', () => {
    });

    rafId = requestAnimationFrame(updatePositions);

    return () => {
      cancelAnimationFrame(rafId);
      sim.on('tick', null);
    };
  }, []);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.alpha(0.6).restart();
  }, [nodes, edges, activeRegionSet, year]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newK = Math.min(3, Math.max(0.3, zoomRef.current.k * delta));

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      zoomRef.current.tx = mx - (mx - zoomRef.current.tx) * (newK / zoomRef.current.k);
      zoomRef.current.ty = my - (my - zoomRef.current.ty) * (newK / zoomRef.current.k);
      zoomRef.current.k = newK;

      if (gRef.current) {
        gRef.current.setAttribute(
          'transform',
          `translate(${zoomRef.current.tx},${zoomRef.current.ty}) scale(${zoomRef.current.k})`
        );
      }
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const node = simNodesRef.current.find(n => n.id === nodeId);
    if (!node || !node.isActive) return;

    const sim = simRef.current;
    if (sim) {
      sim.alphaTarget(0.3).restart();
    }

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      dragInfoRef.current = {
        nodeId,
        startX: (e.clientX - rect.left - zoomRef.current.tx) / zoomRef.current.k,
        startY: (e.clientY - rect.top - zoomRef.current.ty) / zoomRef.current.k
      };
    }

    node.fx = node.x;
    node.fy = node.y;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragInfoRef.current && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mx = (e.clientX - rect.left - zoomRef.current.tx) / zoomRef.current.k;
      const my = (e.clientY - rect.top - zoomRef.current.ty) / zoomRef.current.k;

      const node = simNodesRef.current.find(n => n.id === dragInfoRef.current!.nodeId);
      if (node) {
        node.fx = mx;
        node.fy = my;
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (dragInfoRef.current) {
      const node = simNodesRef.current.find(n => n.id === dragInfoRef.current!.nodeId);
      if (node) {
        const sim = simRef.current;
        if (sim) {
          sim.alphaTarget(0);
        }
        node.fx = null;
        node.fy = null;
      }
      dragInfoRef.current = null;
    }
  }, []);

  const handleNodeMouseEnter = useCallback((e: React.MouseEvent, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setHoveredNodeId(nodeId);
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node
    });
  }, [nodes]);

  const handleNodeMouseMove = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (hoveredNodeId === nodeId) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        node
      });
    }
  }, [hoveredNodeId, nodes]);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
    setTooltip({ visible: false, x: 0, y: 0, node: null });
  }, []);

  const hoveredConnections = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const node = nodes.find(n => n.id === hoveredNodeId);
    return new Set(node?.connections || []);
  }, [hoveredNodeId, nodes]);

  const isEdgeHighlighted = useCallback((link: SimLink): boolean => {
    if (!hoveredNodeId) return false;
    const sId = typeof link.source === 'object' ? link.source.id : link.source;
    const tId = typeof link.target === 'object' ? link.target.id : link.target;
    return sId === hoveredNodeId || tId === hoveredNodeId;
  }, [hoveredNodeId]);

  const renderDefs = () => (
    <defs>
      {(['Eastern', 'Western', 'African', 'SouthAmerican'] as CultureType[]).map(culture => (
        <radialGradient key={culture} id={`grad-${culture}`} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor={CULTURE_COLORS[culture]} stopOpacity="1" />
          <stop offset="100%" stopColor={CULTURE_COLORS[culture]} stopOpacity="0.85" />
        </radialGradient>
      ))}
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-strong" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 400,
        background: '#1a1a2e',
        borderRadius: 12,
        overflow: 'hidden'
      }}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block', cursor: dragInfoRef.current ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {renderDefs()}
        <g
          ref={gRef}
          transform={`translate(${zoomRef.current.tx},${zoomRef.current.ty}) scale(${zoomRef.current.k})`}
        >
          <g className="edges-layer">
            {simLinksRef.current.map((link, idx) => {
              const s = typeof link.source === 'object' ? link.source : null;
              const t = typeof link.target === 'object' ? link.target : null;
              if (!s || !t) return null;

              const strength = getEdgeStrengthAtYear({
                source: s.id,
                target: t.id,
                baseStrength: link.baseStrength,
                culture: link.culture
              }, year);

              const isActive = s.isActive && t.isActive;
              const highlighted = isEdgeHighlighted(link);
              const lineWidth = highlighted ? strength * 5 + 0.8 : strength * 3.5 + 0.3;
              const opacity = highlighted
                ? 0.95
                : (hoveredNodeId && !highlighted)
                  ? 0.06
                  : isActive
                    ? strength * 0.65 + 0.12
                    : 0.04;

              return (
                <line
                  key={`edge-${idx}`}
                  className="flow-edge"
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={CULTURE_COLORS[link.culture]}
                  strokeWidth={lineWidth}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-width 200ms ease, stroke-opacity 200ms ease'
                  }}
                />
              );
            })}
          </g>

          <g className="nodes-layer">
            {simNodesRef.current.map(simNode => {
              const baseNode = nodes.find(n => n.id === simNode.id);
              if (!baseNode) return null;

              const influence = getNodeInfluenceAtYear(baseNode, year);
              const baseRadius = 3.5 + influence * 0.22;
              const isHovered = hoveredNodeId === simNode.id;
              const isHighlighted = hoveredConnections.has(simNode.id) || isHovered;
              const radius = isHovered ? baseRadius * 1.4 : baseRadius;
              const color = CULTURE_COLORS[simNode.culture];
              const opacity = simNode.isActive
                ? (isHighlighted || !hoveredNodeId ? 1 : 0.25)
                : 0.1;

              return (
                <g
                  key={`node-group-${simNode.id}`}
                  style={{
                    cursor: simNode.isActive ? 'pointer' : 'default',
                    pointerEvents: simNode.isActive ? 'all' : 'none'
                  }}
                >
                  {(isHovered) && (
                    <circle
                      cx={simNode.x}
                      cy={simNode.y}
                      r={radius + 8}
                      fill={color}
                      opacity={0.15}
                    />
                  )}

                  <circle
                    className="city-node"
                    cx={simNode.x}
                    cy={simNode.y}
                    r={radius}
                    fill={`url(#grad-${simNode.culture})`}
                    stroke={color}
                    strokeWidth={isHovered ? 2.5 : 1}
                    opacity={opacity}
                    filter={isHovered ? 'url(#glow-strong)' : (isHighlighted ? 'url(#glow)' : undefined)}
                    onMouseDown={(e) => handleMouseDown(e, simNode.id)}
                    onMouseEnter={(e) => handleNodeMouseEnter(e, simNode.id)}
                    onMouseMove={(e) => handleNodeMouseMove(e, simNode.id)}
                    onMouseLeave={handleNodeMouseLeave}
                    style={{
                      transition: 'r 180ms ease-out, stroke-width 180ms ease, opacity 180ms ease'
                    }}
                  />

                  <text
                    className="node-label"
                    x={simNode.x}
                    y={simNode.y}
                    dy={radius + 12}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight={isHovered ? 600 : 400}
                    fill="#e8e8f0"
                    opacity={opacity * 0.85}
                    style={{
                      userSelect: 'none',
                      pointerEvents: 'none',
                      transition: 'opacity 180ms ease'
                    }}
                  >
                    {simNode.nameCN}
                  </text>
                </g>
              );
            })}
          </g>
        </g>

        <g transform={`translate(16, ${height - 110})`} opacity={0.85}>
          {(['Eastern', 'Western', 'African', 'SouthAmerican'] as CultureType[]).map((culture, i) => (
            <g key={culture} transform={`translate(0, ${i * 22})`}>
              <circle cx={8} cy={8} r={7} fill={CULTURE_COLORS[culture]} opacity={0.9} />
              <text x={22} y={12} fontSize="12" fill="#d0d0dc">{CULTURE_LABELS[culture]}</text>
            </g>
          ))}
        </g>

        <text
          x={width - 16}
          y={height - 16}
          textAnchor="end"
          fontSize="11"
          fill="#70708a"
        >
          滚轮缩放 · 拖拽节点 · 共 {simNodesRef.current.filter(n => allRegionSet.has(n.region)).length} 座城市
        </text>
      </svg>

      {tooltip.visible && tooltip.node && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 16,
            top: tooltip.y + 16,
            zIndex: 1000,
            pointerEvents: 'none',
            animation: 'tooltipFadeIn 160ms ease-out'
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(8px)',
              borderRadius: 10,
              padding: '14px 18px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15)',
              border: `1.5px solid ${CULTURE_COLORS[tooltip.node.culture]}66`,
              minWidth: 210,
              color: '#1a1a2e'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: CULTURE_COLORS[tooltip.node.culture],
                  boxShadow: `0 0 8px ${CULTURE_COLORS[tooltip.node.culture]}`
                }}
              />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>
                {tooltip.node.nameCN}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginLeft: 'auto' }}>
                {tooltip.node.name}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: 13 }}>
              <div style={{ color: '#777' }}>影响力分数</div>
              <div style={{ fontWeight: 600, color: CULTURE_COLORS[tooltip.node.culture] }}>
                {Math.round(getNodeInfluenceAtYear(tooltip.node, year))}
              </div>

              <div style={{ color: '#777' }}>文化流派</div>
              <div style={{ fontWeight: 500 }}>{CULTURE_LABELS[tooltip.node.culture]}</div>

              <div style={{ color: '#777' }}>所属地区</div>
              <div style={{ fontWeight: 500 }}>{REGION_LABELS[tooltip.node.region]}</div>

              <div style={{ color: '#777' }}>连接城市数</div>
              <div style={{ fontWeight: 500 }}>{tooltip.node.connections.length} 座</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ForceGraph;
