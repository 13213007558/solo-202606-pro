import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  generateSimulation,
  ALL_REGIONS,
  Region,
  SimulationResult
} from './SimulationEngine';
import ForceGraph from './ForceGraph';
import RegionSlider from './RegionSlider';

const MIN_YEAR = 1900;
const MAX_YEAR = 2020;
const PLAY_INTERVAL_MS = 1000;
const PLAY_STEP_YEARS = 5;

const YEAR_MILESTONES = [
  { year: 1900, label: '1900', desc: '世纪初' },
  { year: 1930, label: '1930', desc: '战前' },
  { year: 1950, label: '1950', desc: '战后' },
  { year: 1980, label: '1980', desc: '冷战' },
  { year: 2000, label: '2000', desc: '千禧' },
  { year: 2020, label: '2020', desc: '当代' }
];

const App: React.FC = () => {
  const [activeRegions, setActiveRegions] = useState<Region[]>([...ALL_REGIONS]);
  const [year, setYear] = useState<number>(2020);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const checkNarrow = () => setIsNarrow(window.innerWidth < 768);
    checkNarrow();
    window.addEventListener('resize', checkNarrow);
    return () => window.removeEventListener('resize', checkNarrow);
  }, []);

  const simulation: SimulationResult = useMemo(() => {
    return generateSimulation({ regions: activeRegions, year });
  }, [activeRegions, year]);

  const totalCities = simulation.nodes.length;
  const totalConnections = simulation.edges.length;

  const handleRegionsChange = useCallback((regions: Region[]) => {
    setActiveRegions(regions);
  }, []);

  const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSlider(true);
    updateYearFromMouse(e.clientX);
  }, []);

  const updateYearFromMouse = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const trackLeft = rect.left + 16;
    const trackWidth = rect.width - 32;
    const ratio = Math.max(0, Math.min(1, (clientX - trackLeft) / trackWidth));
    const newYear = Math.round(MIN_YEAR + ratio * (MAX_YEAR - MIN_YEAR));
    setYear(newYear);
  }, []);

  useEffect(() => {
    if (!isDraggingSlider) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateYearFromMouse(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDraggingSlider(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSlider, updateYearFromMouse]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setYear(prevYear => {
          const nextYear = prevYear + PLAY_STEP_YEARS;
          if (nextYear > MAX_YEAR) {
            return MIN_YEAR;
          }
          return nextYear;
        });
      }, PLAY_INTERVAL_MS);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying]);

  const yearProgress = (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 40%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: isNarrow ? '12px' : '20px 28px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        color: '#e0e0f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: isNarrow ? 10 : 14,
          gap: 16,
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #00d2ff 0%, #ff6b6b 50%, #ffa502 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              boxShadow: '0 4px 20px rgba(0, 210, 255, 0.25)'
            }}
          >
            🌐
          </div>
          <div>
            <div
              style={{
                fontSize: isNarrow ? 18 : 22,
                fontWeight: 700,
                letterSpacing: 0.5,
                background: 'linear-gradient(90deg, #00d2ff, #ff6b6b, #ffa502, #2ed573)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              CultureFlow
            </div>
            <div style={{ fontSize: 12, color: '#7a7a95', marginTop: 2 }}>
              文化影响力传播网络可视化 · 人文地理数据
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              padding: '8px 18px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <div style={{ fontSize: 11, color: '#707090', marginBottom: 2 }}>当前年份</div>
            <div
              style={{
                fontSize: isNarrow ? 20 : 26,
                fontWeight: 800,
                color: '#ffffff',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1
              }}
            >
              {year}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '6px 12px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.03)',
              fontSize: 12,
              color: '#8a8aa5'
            }}
          >
            <span>🏙️ {totalCities} 城</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span>🔗 {totalConnections} 连接</span>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isNarrow ? 'column' : 'row',
          gap: isNarrow ? 10 : 14,
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        {isNarrow && (
          <RegionSlider
            activeRegions={activeRegions}
            onChange={handleRegionsChange}
            orientation="vertical"
          />
        )}

        <div
          style={{
            flex: 1,
            minHeight: isNarrow ? 320 : 0,
            minWidth: 0,
            display: 'flex'
          }}
        >
          <ForceGraph
            nodes={simulation.nodes}
            edges={simulation.edges}
            year={year}
            activeRegions={activeRegions}
            allRegions={ALL_REGIONS}
          />
        </div>

        {!isNarrow && (
          <div style={{ width: 200, flexShrink: 0 }}>
            <RegionSlider
              activeRegions={activeRegions}
              onChange={handleRegionsChange}
              orientation="vertical"
            />
          </div>
        )}
      </div>

      <div
        ref={sliderRef}
        style={{
          marginTop: isNarrow ? 10 : 14,
          padding: '16px 16px 18px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 14,
          border: '1px solid rgba(255, 255, 255, 0.06)',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onMouseDown={handleSliderMouseDown}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 10
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 50,
              border: 'none',
              background: isPlaying
                ? 'linear-gradient(135deg, #ff6b6b, #ee5a5a)'
                : 'linear-gradient(135deg, #00d2ff, #0099cc)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isPlaying
                ? '0 4px 16px rgba(255, 107, 107, 0.35)'
                : '0 4px 16px rgba(0, 210, 255, 0.35)',
              flexShrink: 0,
              transition: 'transform 120ms ease'
            }}
            onMouseDown={e => e.stopPropagation()}
            title={isPlaying ? '暂停' : '播放（每秒推进5年）'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div style={{ flex: 1, position: 'relative', height: 18 }}>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: 6,
                marginTop: -3,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.05)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${yearProgress * 100}%`,
                  background: 'linear-gradient(90deg, #00d2ff, #ff6b6b, #ffa502)',
                  borderRadius: 3,
                  transition: isDraggingSlider ? 'none' : 'width 200ms ease-out',
                  boxShadow: '0 0 12px rgba(0, 210, 255, 0.3)'
                }}
              />
            </div>

            {YEAR_MILESTONES.map(m => (
              <div
                key={m.year}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${((m.year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`,
                  width: 2,
                  height: 10,
                  marginTop: -5,
                  background: year >= m.year ? '#00d2ff' : 'rgba(255, 255, 255, 0.12)',
                  transform: 'translateX(-0.5px)',
                  pointerEvents: 'none'
                }}
              />
            ))}

            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: `${yearProgress * 100}%`,
                width: 18,
                height: 18,
                marginTop: -9,
                marginLeft: -9,
                borderRadius: '50%',
                background: '#ffffff',
                border: `3px solid ${isPlaying ? '#ff6b6b' : '#00d2ff'}`,
                boxShadow: `0 0 0 4px ${isPlaying ? 'rgba(255, 107, 107, 0.18)' : 'rgba(0, 210, 255, 0.18)'}, 0 3px 10px rgba(0,0,0,0.4)`,
                cursor: isDraggingSlider ? 'grabbing' : 'grab',
                transition: isDraggingSlider ? 'none' : 'all 200ms ease-out',
                pointerEvents: 'none'
              }}
            />
          </div>

          <div
            style={{
              fontSize: 12,
              color: '#7a7a95',
              whiteSpace: 'nowrap',
              fontWeight: 500,
              flexShrink: 0
            }}
          >
            {MIN_YEAR} – {MAX_YEAR}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 4px 0 50px',
            fontSize: 10,
            color: '#60607a',
            pointerEvents: 'none'
          }}
        >
          {YEAR_MILESTONES.map(m => (
            <div
              key={m.year}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transform: 'translateX(-50%)',
                marginLeft: `${((m.year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%`,
                position: 'relative',
                left: 0,
                marginRight: '-1px',
                opacity: year >= m.year ? 1 : 0.5,
                fontWeight: year >= m.year ? 600 : 400,
                color: year >= m.year ? '#9090ad' : '#555570'
              }}
            >
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{m.label}</span>
              <span style={{ fontSize: 9, marginTop: 1, opacity: 0.7 }}>{m.desc}</span>
            </div>
          ))}
          <div style={{ visibility: 'hidden' }}>0</div>
        </div>
      </div>
    </div>
  );
};

export default App;
