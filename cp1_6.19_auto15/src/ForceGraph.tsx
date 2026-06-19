import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCollide,
  forceX,
  forceY,
  forceCenter
} from 'd3-force'
import type { Simulation } from 'd3-force'
import { geoEqualEarth, geoPath, geoGraticule10 } from 'd3-geo'
import type { GeoProjection, GeoPermissibleObjects } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { FeatureCollection } from 'geojson'
import {
  CULTURES,
  REGIONS,
  nodeDegree,
  YEAR_MIN,
  YEAR_MAX
} from './SimulationEngine'
import type { SimulationData, CityNode, CultureLink, CultureType, Region } from './SimulationEngine'

const REGION_LABEL: Record<Region, string> = REGIONS.reduce(
  (acc, r) => {
    acc[r.id] = r.label
    return acc
  },
  {} as Record<Region, string>
)

const CULTURE_KEYS: CultureType[] = ['eastern', 'western', 'african', 'southamerican']

interface ViewState {
  k: number
  x: number
  y: number
}

interface SimState {
  simulation: Simulation<CityNode, undefined>
  nodes: CityNode[]
  links: CultureLink[]
  anchors: Map<string, { x: number; y: number }>
}

interface ProjectionState {
  projection: GeoProjection
  anchors: Map<string, { x: number; y: number }>
  w: number
  h: number
}

function radiusForActive(n: CityNode): number {
  return n.radius
}

interface ForceGraphProps {
  data: SimulationData
}

export default function ForceGraph({ data }: ForceGraphProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const sceneRef = useRef<SVGGElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  const simRef = useRef<SimState | null>(null)
  const projRef = useRef<ProjectionState | null>(null)
  const viewRef = useRef<ViewState>({ k: 1, x: 0, y: 0 })
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null)
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; view: ViewState } | null>(null)
  const prevRegionRef = useRef<string>(data.region)
  const rafDrawRef = useRef<number | null>(null)

  const nodeGroupRefs = useRef<Map<string, SVGGElement>>(new Map())
  const lineRefs = useRef<Map<string, SVGLineElement>>(new Map())

  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [view, setView] = useState<ViewState>({ k: 1, x: 0, y: 0 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mapFeatures, setMapFeatures] = useState<FeatureCollection | null>(null)
  const [paths, setPaths] = useState<{ land: string; grat: string; sphere: string } | null>(null)

  viewRef.current = view

  const draw = useCallback(() => {
    const sim = simRef.current
    if (!sim) return
    for (const n of sim.nodes) {
      const g = nodeGroupRefs.current.get(n.id)
      if (g) g.setAttribute('transform', `translate(${n.x ?? 0},${n.y ?? 0})`)
    }
    for (const lk of sim.links) {
      const s = lk.source as CityNode
      const t = lk.target as CityNode
      const el = lineRefs.current.get(lk.id)
      if (el) {
        el.setAttribute('x1', String(s.x ?? 0))
        el.setAttribute('y1', String(s.y ?? 0))
        el.setAttribute('x2', String(t.x ?? 0))
        el.setAttribute('y2', String(t.y ?? 0))
      }
    }
  }, [])

  const scheduleDraw = useCallback(() => {
    if (rafDrawRef.current != null) return
    rafDrawRef.current = requestAnimationFrame(() => {
      rafDrawRef.current = null
      draw()
    })
  }, [draw])

  const computeProjection = useCallback((w: number, h: number): ProjectionState => {
    const pad = Math.min(w, h) * 0.04
    const projection = geoEqualEarth()
      .fitExtent(
        [[pad, pad], [w - pad, h - pad]],
        { type: 'Sphere' } as unknown as GeoPermissibleObjects
      )
    const anchors = new Map<string, { x: number; y: number }>()
    for (const n of data.nodes) {
      const p = projection([n.lng, n.lat])
      if (p) anchors.set(n.id, { x: p[0], y: p[1] })
    }
    return { projection, anchors, w, h }
  }, [data.nodes])

  const buildForces = useCallback((sim: Simulation<CityNode, undefined>, st: SimState, w: number, h: number) => {
    const anchors = st.anchors
    sim
      .force(
        'charge',
        forceManyBody<CityNode>().strength((d) => -44 - d.radius * 2.4)
      )
      .force(
        'link',
        forceLink<CityNode, CultureLink>(st.links)
          .id((d) => d.id)
          .distance((d) => 50 + (1 - d.strength) * 48)
          .strength((d) => 0.1 + d.strength * 0.34)
      )
      .force(
        'collide',
        forceCollide<CityNode>().radius((d) => d.radius + 2.6).iterations(2)
      )
      .force('x', forceX<CityNode>((d) => anchors.get(d.id)?.x ?? w / 2).strength(0.05))
      .force('y', forceY<CityNode>((d) => anchors.get(d.id)?.y ?? h / 2).strength(0.05))
      .force('center', forceCenter<CityNode>(w / 2, h / 2).strength(0.03))
  }, [])

  const applyPins = useCallback((st: SimState) => {
    for (const n of st.nodes) {
      const anchor = st.anchors.get(n.id)
      if (!n.active && anchor) {
        n.fx = anchor.x
        n.fy = anchor.y
      } else if (n.active) {
        n.fx = null
        n.fy = null
      }
    }
  }, [])

  // ---- measure stage ----
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect
        setSize({ w: Math.max(2, cr.width), h: Math.max(2, cr.height) })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ---- projection + paths on size / map change ----
  useEffect(() => {
    if (size.w < 2 || size.h < 2) return
    const ps = computeProjection(size.w, size.h)
    projRef.current = ps
    if (mapFeatures) {
      const path = geoPath(ps.projection)
      const land = path(mapFeatures) ?? ''
      const grat = path(geoGraticule10()) ?? ''
      const sphere = path({ type: 'Sphere' } as unknown as GeoPermissibleObjects) ?? ''
      setPaths({ land, grat, sphere })
    }
    const sim = simRef.current
    if (sim) {
      sim.anchors = ps.anchors
      buildForces(sim.simulation, sim, ps.w, ps.h)
      applyPins(sim)
      sim.simulation.alpha(0.35).restart()
      scheduleDraw()
    }
  }, [size, mapFeatures, computeProjection, buildForces, applyPins, scheduleDraw])

  // ---- fetch world topojson once ----
  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json', { signal: ctrl.signal })
      .then((r) => r.json())
      .then((topo) => {
        if (cancelled) return
        const topology = topo as Topology
        const fc = feature(topology, topology.objects.countries) as unknown as FeatureCollection
        setMapFeatures(fc)
      })
      .catch(() => {
        // offline / blocked: render without a world map backdrop
      })
      .finally(() => clearTimeout(timer))
    return () => {
      cancelled = true
      ctrl.abort()
      clearTimeout(timer)
    }
  }, [])

  // ---- simulation init / data merge ----
  useEffect(() => {
    if (size.w < 2 || size.h < 2) return
    let ps = projRef.current
    if (!ps || ps.w !== size.w || ps.h !== size.h) {
      ps = computeProjection(size.w, size.h)
      projRef.current = ps
    }

    const regionChanged = prevRegionRef.current !== data.region
    prevRegionRef.current = data.region

    if (!simRef.current) {
      const simNodes: CityNode[] = data.nodes.map((n) => {
        const anchor = ps.anchors.get(n.id)
        const jitter = (Math.random() - 0.5) * 6
        const node: CityNode = {
          ...n,
          x: (anchor?.x ?? size.w / 2) + jitter,
          y: (anchor?.y ?? size.h / 2) + jitter,
          vx: 0,
          vy: 0
        }
        return node
      })
      const simLinks: CultureLink[] = data.links.map((l) => ({ ...l }))
      const anchors = new Map(ps.anchors)
      const simulation = forceSimulation<CityNode>(simNodes).alphaDecay(0.024).velocityDecay(0.42)
      const st: SimState = { simulation, nodes: simNodes, links: simLinks, anchors }
      simRef.current = st
      buildForces(simulation, st, size.w, size.h)
      applyPins(st)
      simulation.on('tick', draw)
      simulation.alpha(1).restart()
      draw()
    } else {
      const st = simRef.current
      const byId = new Map(data.nodes.map((n) => [n.id, n]))
      for (const sn of st.nodes) {
        const fresh = byId.get(sn.id)
        if (fresh) {
          sn.influence = fresh.influence
          sn.radius = fresh.radius
          sn.active = fresh.active
        }
      }
      const linkById = new Map(data.links.map((l) => [l.id, l]))
      for (const sl of st.links) {
        const fresh = linkById.get(sl.id)
        if (fresh) sl.strength = fresh.strength
      }
      st.anchors = new Map(ps.anchors)
      buildForces(st.simulation, st, size.w, size.h)
      applyPins(st)
      st.simulation.alpha(regionChanged ? 0.6 : 0.22).restart()
      scheduleDraw()
    }
  }, [data, size, computeProjection, buildForces, applyPins, draw, scheduleDraw])

  // ---- cleanup on unmount ----
  useEffect(() => {
    return () => {
      const sim = simRef.current
      if (sim) {
        sim.simulation.on('tick', null)
        sim.simulation.stop()
      }
      if (rafDrawRef.current != null) cancelAnimationFrame(rafDrawRef.current)
    }
  }, [])

  // ---- wheel zoom (non-passive) ----
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const v = viewRef.current
      const factor = Math.exp(-e.deltaY * 0.0014)
      const k = Math.min(4, Math.max(0.45, v.k * factor))
      const ratio = k / v.k
      const nx = px - ratio * (px - v.x)
      const ny = py - ratio * (py - v.y)
      const next = { k, x: nx, y: ny }
      viewRef.current = next
      setView(next)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const clientToScene = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    const v = viewRef.current
    return { x: (px - v.x) / v.k, y: (py - v.y) / v.k }
  }, [])

  const handleNodePointerDown = useCallback((e: React.PointerEvent<SVGCircleElement>, id: string) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    dragRef.current = { id, pointerId: e.pointerId }
    const sim = simRef.current
    if (sim) {
      const node = sim.nodes.find((n) => n.id === id)
      if (node) {
        const scene = clientToScene(e.clientX, e.clientY)
        node.fx = scene.x
        node.fy = scene.y
        node.x = scene.x
        node.y = scene.y
        sim.simulation.alphaTarget(0.3).restart()
      }
    }
  }, [clientToScene])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const card = cardRef.current
    if (card) {
      card.style.left = `${e.clientX}px`
      card.style.top = `${e.clientY}px`
    }
    const drag = dragRef.current
    if (drag && drag.pointerId === e.pointerId) {
      const sim = simRef.current
      if (sim) {
        const node = sim.nodes.find((n) => n.id === drag.id)
        if (node) {
          const scene = clientToScene(e.clientX, e.clientY)
          node.fx = scene.x
          node.fy = scene.y
          sim.simulation.alphaTarget(0.3).restart()
        }
      }
      return
    }
    const pan = panRef.current
    if (pan && pan.pointerId === e.pointerId) {
      const dx = e.clientX - pan.startX
      const dy = e.clientY - pan.startY
      const next = { k: pan.view.k, x: pan.view.x + dx, y: pan.view.y + dy }
      viewRef.current = next
      setView(next)
    }
  }, [clientToScene])

  const endDrag = useCallback(() => {
    const sim = simRef.current
    if (dragRef.current && sim) {
      const node = sim.nodes.find((n) => n.id === dragRef.current!.id)
      if (node) {
        node.fx = null
        node.fy = null
      }
      sim.simulation.alphaTarget(0)
    }
    dragRef.current = null
    panRef.current = null
  }, [])

  const handleBackgroundPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    panRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      view: viewRef.current
    }
  }, [])

  // ---- hover highlight graph ----
  const highlight = useMemo(() => {
    if (!hoveredId) return null
    const linkIds = new Set<string>()
    const nodeIds = new Set<string>([hoveredId])
    for (const l of data.links) {
      const s = l.source as CityNode
      const t = l.target as CityNode
      if (s.id === hoveredId || t.id === hoveredId) {
        linkIds.add(l.id)
        nodeIds.add(s.id)
        nodeIds.add(t.id)
      }
    }
    return { linkIds, nodeIds }
  }, [hoveredId, data.links])

  const hoveredNode = useMemo(() => {
    if (!hoveredId) return null
    const n = data.nodes.find((x) => x.id === hoveredId)
    if (!n) return null
    return { ...n, degree: nodeDegree(n.id, data.links) }
  }, [hoveredId, data.nodes, data.links])

  const w = size.w || 1200
  const h = size.h || 720

  const linkStyle = (l: CultureLink): { stroke: string; width: number; opacity: number } => {
    const s = l.source as CityNode
    const t = l.target as CityNode
    const bothActive = s.active && t.active
    const baseWidth = 0.4 + l.strength * 3.4
    const baseOpacity = 0.06 + l.strength * 0.5
    const culture = CULTURES[l.culture]
    if (highlight) {
      const isHL = highlight.linkIds.has(l.id)
      return {
        stroke: culture.color,
        width: isHL ? baseWidth * 1.9 : baseWidth * 0.8,
        opacity: isHL ? Math.min(0.95, baseOpacity + 0.5) : baseOpacity * 0.18
      }
    }
    return {
      stroke: culture.color,
      width: baseWidth,
      opacity: bothActive ? baseOpacity : baseOpacity * 0.4
    }
  }

  return (
    <>
      <div ref={stageRef} className="cf-stage">
        <svg
          ref={svgRef}
          className="cf-svg"
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid slice"
          onPointerDown={handleBackgroundPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => {
            setHoveredId(null)
          }}
        >
          <defs>
            {CULTURE_KEYS.map((key) => {
              const c = CULTURES[key]
              const dark = shade(c.color, -0.45)
              return (
                <radialGradient key={c.gradientId} id={c.gradientId} cx="35%" cy="30%" r="75%">
                  <stop offset="0%" stopColor={lighten(c.color, 0.35)} />
                  <stop offset="55%" stopColor={c.color} />
                  <stop offset="100%" stopColor={dark} />
                </radialGradient>
              )
            })}
            <filter id="cf-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          <g ref={sceneRef} transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {paths?.sphere && <path d={paths.sphere} fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} />}
            {paths?.grat && <path className="cf-graticule" d={paths.grat} />}
            {paths?.land && <path className="cf-land" d={paths.land} />}

            <g className="cf-links">
              {data.links.map((l) => {
                const st = linkStyle(l)
                return (
                  <line
                    key={l.id}
                    ref={(el) => {
                      if (el) lineRefs.current.set(l.id, el)
                      else lineRefs.current.delete(l.id)
                    }}
                    className="cf-link"
                    stroke={st.stroke}
                    strokeWidth={st.width}
                    strokeOpacity={st.opacity}
                    strokeLinecap="round"
                  />
                )
              })}
            </g>

            <g className="cf-nodes">
              {data.nodes.map((n) => {
                const culture = CULTURES[n.culture]
                const isHovered = hoveredId === n.id
                const dimmed = !n.active
                const isHLNode = highlight?.nodeIds.has(n.id) ?? false
                const r = radiusForActive(n)
                const haloR = isHovered ? r * 2.7 : r * 1.75
                const haloOpacity = isHovered ? 0.55 : dimmed ? 0.04 : 0.16
                const coreOpacity = dimmed ? 0.1 : 1
                const showLabel = n.active && n.influence > 58
                return (
                  <g
                    key={n.id}
                    ref={(el) => {
                      if (el) nodeGroupRefs.current.set(n.id, el)
                      else nodeGroupRefs.current.delete(n.id)
                    }}
                    className="cf-node"
                    style={{ opacity: isHLNode && !dimmed ? 1 : undefined }}
                  >
                    <circle
                      className="cf-node-halo"
                      r={haloR}
                      fill={culture.color}
                      opacity={haloOpacity}
                      filter={isHovered ? 'url(#cf-blur)' : undefined}
                    />
                    <circle
                      r={isHovered ? r * 1.22 : r}
                      fill={`url(#${culture.gradientId})`}
                      stroke={isHovered ? '#ffffff' : 'rgba(255,255,255,0.35)'}
                      strokeWidth={isHovered ? 1.4 : 0.8}
                      opacity={coreOpacity}
                      style={{ color: culture.color }}
                      onPointerDown={(e) => handleNodePointerDown(e, n.id)}
                      onPointerEnter={() => {
                        if (!dragRef.current) setHoveredId(n.id)
                      }}
                      onPointerLeave={() => {
                        if (!dragRef.current) setHoveredId(null)
                      }}
                    />
                    {showLabel && (
                      <text
                        className="cf-node-label"
                        x={0}
                        y={-r - 5}
                        textAnchor="middle"
                        opacity={dimmed ? 0.1 : 0.85}
                      >
                        {n.name}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </g>
        </svg>

        <div
          ref={cardRef}
          className={`cf-card${hoveredNode ? ' is-visible' : ''}`}
        >
          {hoveredNode && (
            <>
              <p className="cf-card-name">{hoveredNode.name}</p>
              <div className="cf-card-culture">
                <span className="cf-dot" style={{ background: CULTURES[hoveredNode.culture].color, color: CULTURES[hoveredNode.culture].color }} />
                {CULTURES[hoveredNode.culture].label}文化 · {REGION_LABEL[hoveredNode.region]}
              </div>
              <div className="cf-card-rows">
                <span className="k">影响力分数</span>
                <span className="v">{hoveredNode.influence.toFixed(1)}</span>
                <span className="k">连接城市数</span>
                <span className="v">{hoveredNode.degree}</span>
                <span className="k">活跃年份</span>
                <span className="v">{Math.max(YEAR_MIN, Math.min(YEAR_MAX, data.year))}</span>
                <span className="cf-bar">
                  <i style={{ width: `${Math.min(100, hoveredNode.influence)}%`, background: CULTURES[hoveredNode.culture].color }} />
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ---- color helpers ----
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}
function rgbToHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}
function lighten(hex: string, amt: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * clamp01(amt), g + (255 - g) * clamp01(amt), b + (255 - b) * clamp01(amt))
}
function shade(hex: string, amt: number): string {
  const { r, g, b } = hexToRgb(hex)
  const f = 1 + amt
  return rgbToHex(r * f, g * f, b * f)
}
