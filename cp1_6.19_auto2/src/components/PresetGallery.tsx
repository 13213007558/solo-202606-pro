import { PRESETS, generateGradientCSS, type PresetGradient } from '../utils/gradientUtils'

interface PresetGalleryProps {
  onSelect: (preset: PresetGradient) => void
  activeId?: string | null
}

export default function PresetGallery({ onSelect, activeId }: PresetGalleryProps) {
  return (
    <div className="preset-gallery">
      <div className="panel-head">
        <span className="panel-dot" />
        <h2 className="panel-title">预设模板</h2>
      </div>
      <div className="preset-grid">
        {PRESETS.map((preset) => {
          const isActive = activeId === preset.id
          return (
            <button
              type="button"
              key={preset.id}
              className={`preset-card ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelect(preset)}
            >
              <div
                className="preset-thumb"
                style={{ background: generateGradientCSS(preset.config) }}
              />
              <div className="preset-meta">
                <span className="preset-name">{preset.name}</span>
                <span className="preset-style">{preset.style}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
