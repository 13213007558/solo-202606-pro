import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ForceGraph from './ForceGraph'
import RegionSlider from './RegionSlider'
import {
  generateSimulationData,
  CULTURES,
  YEAR_MIN,
  YEAR_MAX
} from './SimulationEngine'
import type { RegionFilter, CultureType } from './SimulationEngine'

const CULTURE_KEYS: CultureType[] = ['eastern', 'western', 'african', 'southamerican']
const TICK_YEARS = [1900, 1940, 1980, 2020]
const PLAY_STEP = 5

function App() {
  const [year, setYear] = useState<number>(1925)
  const [region, setRegion] = useState<RegionFilter>('all')
  const [playing, setPlaying] = useState<boolean>(false)

  const data = useMemo(
    () => generateSimulationData({ year, region }),
    [year, region]
  )

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setYear((y) => {
        const next = y + PLAY_STEP
        return next > YEAR_MAX ? YEAR_MIN : next
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [playing])

  const activeCities = data.nodes.filter((n) => n.active).length

  return (
    <div className="cf-app">
      <header className="cf-header">
        <h1 className="cf-title">CultureFlow</h1>
        <p className="cf-subtitle">Cultural Influence Propagation Network</p>
        <div className="cf-yearblock">
          <span className="cf-year">{year}</span>
          <span className="cf-year-tag">A.D. · 公元</span>
        </div>
      </header>

      <aside className="cf-legend">
        <div className="cf-legend-title">文化流派 · Schools</div>
        {CULTURE_KEYS.map((key) => {
          const c = CULTURES[key]
          return (
            <div className="cf-legend-item" key={key}>
              <span className="cf-dot" style={{ background: c.color, color: c.color }} />
              {c.label}
            </div>
          )
        })}
        <div className="cf-legend-item" style={{ marginTop: 6, color: 'var(--ink-faint)' }}>
          活跃节点 {activeCities}
        </div>
      </aside>

      <ForceGraph data={data} />

      <div className="cf-controls">
        <div className="cf-control">
          <div className="cf-control-head">
            <span className="cf-control-label">时间轴 · Timeline</span>
            <span className="cf-control-value">{year}</span>
          </div>
          <div className="cf-timeline">
            <button
              type="button"
              className={`cf-play${playing ? ' is-playing' : ''}`}
              aria-label={playing ? '暂停' : '播放'}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                  <rect x="2" y="1.5" width="3.2" height="11" rx="1" />
                  <rect x="8.8" y="1.5" width="3.2" height="11" rx="1" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                  <path d="M3 1.5 L12 7 L3 12.5 Z" />
                </svg>
              )}
            </button>
            <div className="cf-ticks">
              <input
                className="cf-range"
                type="range"
                min={YEAR_MIN}
                max={YEAR_MAX}
                step={PLAY_STEP}
                value={year}
                aria-label="年份"
                onChange={(e) => {
                  setPlaying(false)
                  setYear(Number(e.target.value))
                }}
              />
              <div className="cf-tickrow">
                {TICK_YEARS.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <RegionSlider value={region} onChange={setRegion} />
      </div>
    </div>
  )
}

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(<App />)
}

export default App
