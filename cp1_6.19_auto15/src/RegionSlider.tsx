import { REGIONS } from './SimulationEngine'
import type { RegionFilter } from './SimulationEngine'

interface RegionSliderProps {
  value: RegionFilter
  onChange: (value: RegionFilter) => void
}

const STEPS: { v: RegionFilter; label: string }[] = [
  { v: 'all', label: '全部' },
  ...REGIONS.map((r) => ({ v: r.id as RegionFilter, label: r.label }))
]

export default function RegionSlider({ value, onChange }: RegionSliderProps) {
  const index = Math.max(0, STEPS.findIndex((s) => s.v === value))
  const current = STEPS[index]

  return (
    <div className="cf-control cf-region">
      <div className="cf-control-head">
        <span className="cf-control-label">地理区域 · Region</span>
        <span className="cf-control-value">{current.label}</span>
      </div>
      <input
        className="cf-range"
        type="range"
        min={0}
        max={STEPS.length - 1}
        step={1}
        value={index}
        aria-label="按大洲筛选区域"
        onChange={(e) => {
          const i = Number(e.target.value)
          if (STEPS[i]) onChange(STEPS[i].v)
        }}
      />
      <div className="cf-region-stops">
        {STEPS.map((s) => (
          <span key={s.v} style={{ opacity: s.v === value ? 1 : 0.55 }}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
