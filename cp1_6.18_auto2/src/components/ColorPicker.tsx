import { useEffect, useRef, useState } from 'react'
import {
  clamp,
  hexToHsv,
  hexToRgb,
  hslToRgb,
  hsvToRgb,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  type HSL,
  type RGB,
} from '../utils/gradientUtils'

interface ColorPickerProps {
  color: string
  onChange: (hex: string) => void
  onClose: () => void
}

export default function ColorPicker({ color, onChange, onClose }: ColorPickerProps) {
  const initial = hexToHsv(color)
  const [h, setH] = useState(initial.h)
  const [s, setS] = useState(initial.s)
  const [v, setV] = useState(initial.v)

  const panelRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const draggingPanel = useRef(false)
  const draggingHue = useRef(false)

  useEffect(() => {
    const rgb = hsvToRgb(h, s, v)
    const derived = rgbToHex(rgb.r, rgb.g, rgb.b)
    if (color.toLowerCase() !== derived.toLowerCase()) {
      const hsv = hexToHsv(color)
      setH(hsv.h)
      setS(hsv.s)
      setV(hsv.v)
    }
  }, [color])

  useEffect(() => {
    const stopDrag = () => {
      draggingPanel.current = false
      draggingHue.current = false
    }
    window.addEventListener('pointerup', stopDrag)
    return () => window.removeEventListener('pointerup', stopDrag)
  }, [])

  const emit = (nh: number, ns: number, nv: number) => {
    const rgb = hsvToRgb(nh, ns, nv)
    onChange(rgbToHex(rgb.r, rgb.g, rgb.b))
  }

  const rgb: RGB = hsvToRgb(h, s, v)
  const hsl: HSL = rgbToHsl(rgb)
  const pureHueRgb = hsvToRgb(h, 100, 100)
  const pureHueHex = rgbToHex(pureHueRgb.r, pureHueRgb.g, pureHueRgb.b)

  const handlePanelPointer = (e: React.PointerEvent) => {
    if (!panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1)
    const ns = Math.round(x * 100)
    const nv = Math.round((1 - y) * 100)
    setS(ns)
    setV(nv)
    emit(h, ns, nv)
  }

  const handleHuePointer = (e: React.PointerEvent) => {
    if (!hueRef.current) return
    const rect = hueRef.current.getBoundingClientRect()
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const nh = Math.round(x * 360)
    setH(nh)
    emit(nh, s, v)
  }

  const onPanelDown = (e: React.PointerEvent) => {
    draggingPanel.current = true
    handlePanelPointer(e)
  }
  const onPanelMove = (e: React.PointerEvent) => {
    if (draggingPanel.current) handlePanelPointer(e)
  }
  const onHueDown = (e: React.PointerEvent) => {
    draggingHue.current = true
    handleHuePointer(e)
  }
  const onHueMove = (e: React.PointerEvent) => {
    if (draggingHue.current) handleHuePointer(e)
  }

  const setHex = (val: string) => {
    const cleaned = val.startsWith('#') ? val : `#${val}`
    const parsed = hexToRgb(cleaned)
    const hsv = rgbToHsv(parsed)
    setH(hsv.h)
    setS(hsv.s)
    setV(hsv.v)
    onChange(rgbToHex(parsed.r, parsed.g, parsed.b))
  }

  const setRgbField = (field: keyof RGB, val: number) => {
    const nr: RGB = { ...rgb, [field]: clamp(val, 0, 255) }
    const hsv = rgbToHsv(nr)
    setH(hsv.h)
    setS(hsv.s)
    setV(hsv.v)
    onChange(rgbToHex(nr.r, nr.g, nr.b))
  }

  const setHslField = (field: keyof HSL, val: number) => {
    const nhsl: HSL = {
      ...hsl,
      [field]: clamp(val, 0, field === 'h' ? 360 : 100),
    }
    const nr = hslToRgb(nhsl.h, nhsl.s, nhsl.l)
    const hsv = rgbToHsv(nr)
    setH(hsv.h)
    setS(hsv.s)
    setV(hsv.v)
    onChange(rgbToHex(nr.r, nr.g, nr.b))
  }

  const hexValue = rgbToHex(rgb.r, rgb.g, rgb.b).replace('#', '')

  return (
    <div className="color-picker" role="dialog" aria-label="颜色选择器">
      <div className="cp-header">
        <span className="cp-title">颜色选择器</span>
        <button className="cp-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </div>

      <div
        className="cp-panel"
        ref={panelRef}
        onPointerDown={onPanelDown}
        onPointerMove={onPanelMove}
        style={{ backgroundColor: pureHueHex }}
      >
        <div className="cp-panel-overlay cp-panel-white" />
        <div className="cp-panel-overlay cp-panel-black" />
        <div
          className="cp-cursor"
          style={{
            left: `${s}%`,
            top: `${100 - v}%`,
            backgroundColor: rgbToHex(rgb.r, rgb.g, rgb.b),
          }}
        />
      </div>

      <div
        className="cp-hue"
        ref={hueRef}
        onPointerDown={onHueDown}
        onPointerMove={onHueMove}
      >
        <div
          className="cp-hue-thumb"
          style={{ left: `${(h / 360) * 100}%`, backgroundColor: pureHueHex }}
        />
      </div>

      <div className="cp-fields">
        <label className="cp-field cp-field-hex">
          <span>HEX</span>
          <div className="cp-input-wrap">
            <em>#</em>
            <input
              type="text"
              value={hexValue}
              maxLength={6}
              onChange={(e) => setHex(e.target.value)}
            />
          </div>
        </label>

        <div className="cp-field-row">
          {(['r', 'g', 'b'] as (keyof RGB)[]).map((f) => (
            <label className="cp-field" key={f}>
              <span>{f.toUpperCase()}</span>
              <input
                type="number"
                min={0}
                max={255}
                value={rgb[f]}
                onChange={(e) => setRgbField(f, Number(e.target.value))}
              />
            </label>
          ))}
        </div>

        <div className="cp-field-row">
          {(['h', 's', 'l'] as (keyof HSL)[]).map((f) => (
            <label className="cp-field" key={f}>
              <span>{f.toUpperCase()}</span>
              <input
                type="number"
                min={0}
                max={f === 'h' ? 360 : 100}
                value={hsl[f]}
                onChange={(e) => setHslField(f, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="cp-preview" style={{ backgroundColor: rgbToHex(rgb.r, rgb.g, rgb.b) }} />
    </div>
  )
}
