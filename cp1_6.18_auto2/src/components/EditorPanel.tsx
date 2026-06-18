import { useCallback, useRef, useState } from 'react'
import ColorPicker from './ColorPicker'
import {
  clamp,
  generateGradientCSS,
  generateId,
  hexToRgb,
  rgbToHex,
  type ColorStop,
  type GradientConfig,
  type GradientType,
} from '../utils/gradientUtils'

interface EditorPanelProps {
  config: GradientConfig
  onChange: (config: GradientConfig) => void
}

const MIN_STOPS = 2
const MAX_STOPS = 8

function colorAtPosition(stops: ColorStop[], pos: number): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  if (pos <= sorted[0].position) return sorted[0].color
  if (pos >= sorted[sorted.length - 1].position) return sorted[sorted.length - 1].color
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (pos >= a.position && pos <= b.position) {
      const t = (pos - a.position) / (b.position - a.position)
      const ca = hexToRgb(a.color)
      const cb = hexToRgb(b.color)
      return rgbToHex(
        ca.r + (cb.r - ca.r) * t,
        ca.g + (cb.g - ca.g) * t,
        ca.b + (cb.b - ca.b) * t,
      )
    }
  }
  return sorted[0].color
}

export default function EditorPanel({ config, onChange }: EditorPanelProps) {
  const [openStopId, setOpenStopId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const barRef = useRef<HTMLDivElement>(null)
  const dragId = useRef<string | null>(null)
  const dragRect = useRef<DOMRect | null>(null)
  const didDrag = useRef(false)

  const configRef = useRef(config)
  configRef.current = config

  const onDragMove = useCallback((e: PointerEvent) => {
    if (!dragId.current || !dragRect.current) return
    didDrag.current = true
    const rect = dragRect.current
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const position = Math.round(x * 100)
    const cfg = configRef.current
    const stops = cfg.stops.map((s) =>
      s.id === dragId.current ? { ...s, position } : s,
    )
    configRef.current = { ...cfg, stops }
    onChange(configRef.current)
  }, [onChange])

  const endDrag = useCallback(() => {
    const id = dragId.current
    const moved = didDrag.current
    dragId.current = null
    dragRect.current = null
    didDrag.current = false
    setDraggingId(null)
    window.removeEventListener('pointermove', onDragMove)
    window.removeEventListener('pointerup', endDrag)
    if (id && !moved) setOpenStopId(id)
  }, [onDragMove])

  const startDrag = useCallback(
    (e: React.PointerEvent, stop: ColorStop) => {
      e.preventDefault()
      e.stopPropagation()
      dragId.current = stop.id
      didDrag.current = false
      setDraggingId(stop.id)
      if (barRef.current) dragRect.current = barRef.current.getBoundingClientRect()
      window.addEventListener('pointermove', onDragMove)
      window.addEventListener('pointerup', endDrag)
    },
    [onDragMove, endDrag],
  )

  const updateType = (type: GradientType) => {
    onChange({ ...config, type })
  }

  const updateAngle = (angle: number) => {
    onChange({ ...config, angle })
  }

  const updateStopPosition = (id: string, position: number) => {
    const stops = config.stops.map((s) =>
      s.id === id ? { ...s, position: clamp(position, 0, 100) } : s,
    )
    onChange({ ...config, stops })
  }

  const updateStopColor = (id: string, color: string) => {
    const stops = config.stops.map((s) => (s.id === id ? { ...s, color } : s))
    onChange({ ...config, stops })
  }

  const addStop = () => {
    if (config.stops.length >= MAX_STOPS) return
    const sorted = [...config.stops].sort((a, b) => a.position - b.position)
    let bestGap = 0
    let bestPos = 50
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].position - sorted[i].position
      if (gap > bestGap) {
        bestGap = gap
        bestPos = Math.round((sorted[i].position + sorted[i + 1].position) / 2)
      }
    }
    const newStop: ColorStop = {
      id: generateId(),
      position: bestPos,
      color: colorAtPosition(config.stops, bestPos),
    }
    onChange({ ...config, stops: [...config.stops, newStop] })
  }

  const removeStop = (id: string) => {
    if (config.stops.length <= MIN_STOPS) return
    onChange({ ...config, stops: config.stops.filter((s) => s.id !== id) })
    if (openStopId === id) setOpenStopId(null)
  }

  const openStop = config.stops.find((s) => s.id === openStopId) || null
  const gradientCss = generateGradientCSS(config)

  return (
    <div className="editor-panel">
      <div className="panel-head">
        <span className="panel-dot" />
        <h2 className="panel-title">渐变编辑器</h2>
      </div>

      <div className="editor-section">
        <label className="editor-label">渐变类型</label>
        <div className="type-toggle">
          <button
            type="button"
            className={config.type === 'linear' ? 'active' : ''}
            onClick={() => updateType('linear')}
          >
            线性
          </button>
          <button
            type="button"
            className={config.type === 'radial' ? 'active' : ''}
            onClick={() => updateType('radial')}
          >
            径向
          </button>
        </div>
      </div>

      <div className={`editor-section angle-section ${config.type === 'radial' ? 'is-disabled' : ''}`}>
        <label className="editor-label">
          角度
          <span className="editor-value">{config.angle}°</span>
        </label>
        <input
          type="range"
          min={0}
          max={360}
          value={config.angle}
          disabled={config.type === 'radial'}
          onChange={(e) => updateAngle(Number(e.target.value))}
          className="angle-slider"
        />
      </div>

      <div className="editor-section">
        <label className="editor-label">
          颜色节点
          <span className="editor-value">{config.stops.length} 个</span>
        </label>
        <div className="gradient-bar" ref={barRef} style={{ background: gradientCss }}>
          {config.stops.map((stop) => (
            <button
              type="button"
              key={stop.id}
              className={`color-stop ${openStopId === stop.id ? 'is-active' : ''} ${draggingId === stop.id ? 'is-dragging' : ''}`}
              style={{ left: `${stop.position}%`, backgroundColor: stop.color }}
              onPointerDown={(e) => startDrag(e, stop)}
              aria-label={`颜色节点 ${stop.color} 位置 ${stop.position}%`}
            />
          ))}
        </div>

        <div className="stops-list">
          {config.stops.map((stop) => (
            <div className="stop-item" key={stop.id}>
              <button
                type="button"
                className="stop-swatch"
                style={{ backgroundColor: stop.color }}
                onClick={() => setOpenStopId(stop.id)}
                aria-label="打开颜色选择器"
              />
              <span className="stop-color">{stop.color.toUpperCase()}</span>
              <div className="stop-position">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={stop.position}
                  onChange={(e) =>
                    updateStopPosition(stop.id, Number(e.target.value))
                  }
                />
                <span className="pos-unit">%</span>
              </div>
              <button
                type="button"
                className="stop-remove"
                onClick={() => removeStop(stop.id)}
                disabled={config.stops.length <= MIN_STOPS}
                aria-label="删除节点"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="add-stop"
          onClick={addStop}
          disabled={config.stops.length >= MAX_STOPS}
        >
          + 添加节点
        </button>
      </div>

      {openStop && (
        <div className="picker-popover">
          <div className="picker-arrow" />
          <ColorPicker
            color={openStop.color}
            onChange={(hex) => updateStopColor(openStop.id, hex)}
            onClose={() => setOpenStopId(null)}
          />
        </div>
      )}
    </div>
  )
}
