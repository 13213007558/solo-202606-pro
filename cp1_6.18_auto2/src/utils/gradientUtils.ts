// ============================================================
// gradientUtils.ts
// 工具模块：类型定义、颜色转换（hex/rgb/hsl 互转）、
// CSS 字符串生成、预设模板数据
// ============================================================

export type GradientType = 'linear' | 'radial'

export interface ColorStop {
  id: string
  position: number
  color: string
}

export interface GradientConfig {
  type: GradientType
  angle: number
  stops: ColorStop[]
}

export interface SavedGradient {
  id: string
  name: string
  config: GradientConfig
  createdAt: number
}

export interface PresetGradient {
  id: string
  name: string
  style: string
  config: GradientConfig
}

// ---------------------- 通用工具 ----------------------

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

let idCounter = 0
export const generateId = (): string => {
  idCounter += 1
  return `gs_${Date.now().toString(36)}_${idCounter.toString(36)}`
}

// ---------------------- 颜色转换 ----------------------

export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

export function hexToRgb(hex: string): RGB {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (clean.length !== 6 || /[^0-9a-fA-F]/.test(clean)) {
    return { r: 0, g: 0, b: 0 }
  }
  const num = parseInt(clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number): string =>
    clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex))
}

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rN = r / 255
  const gN = g / 255
  const bN = b / 255
  const max = Math.max(rN, gN, bN)
  const min = Math.min(rN, gN, bN)
  const delta = max - min
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    switch (max) {
      case rN:
        h = (gN - bN) / delta + (gN < bN ? 6 : 0)
        break
      case gN:
        h = (bN - rN) / delta + 2
        break
      default:
        h = (rN - gN) / delta + 4
        break
    }
    h *= 60
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const hN = (((h % 360) + 360) % 360) / 360
  const sN = clamp(s, 0, 100) / 100
  const lN = clamp(l, 0, 100) / 100

  if (sN === 0) {
    const v = Math.round(lN * 255)
    return { r: v, g: v, b: v }
  }

  const q = lN < 0.5 ? lN * (1 + sN) : lN + sN - lN * sN
  const p = 2 * lN - q

  const hueToRgb = (p: number, q: number, t: number): number => {
    let tN = t
    if (tN < 0) tN += 1
    if (tN > 1) tN -= 1
    if (tN < 1 / 6) return p + (q - p) * 6 * tN
    if (tN < 1 / 2) return q
    if (tN < 2 / 3) return p + (q - p) * (2 / 3 - tN) * 6
    return p
  }

  return {
    r: Math.round(hueToRgb(p, q, hN + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hN) * 255),
    b: Math.round(hueToRgb(p, q, hN - 1 / 3) * 255),
  }
}

export interface HSV {
  h: number
  s: number
  v: number
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rN = r / 255
  const gN = g / 255
  const bN = b / 255
  const max = Math.max(rN, gN, bN)
  const min = Math.min(rN, gN, bN)
  const delta = max - min
  let h = 0
  const v = max
  const s = max === 0 ? 0 : delta / max

  if (delta !== 0) {
    switch (max) {
      case rN:
        h = (gN - bN) / delta + (gN < bN ? 6 : 0)
        break
      case gN:
        h = (bN - rN) / delta + 2
        break
      default:
        h = (rN - gN) / delta + 4
        break
    }
    h *= 60
  }

  return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) }
}

export function hsvToRgb(h: number, s: number, v: number): RGB {
  const hN = (((h % 360) + 360) % 360) / 60
  const sN = clamp(s, 0, 100) / 100
  const vN = clamp(v, 0, 100) / 100

  if (sN === 0) {
    const val = Math.round(vN * 255)
    return { r: val, g: val, b: val }
  }

  const i = Math.floor(hN)
  const f = hN - i
  const p = vN * (1 - sN)
  const q = vN * (1 - sN * f)
  const t = vN * (1 - sN * (1 - f))
  const mod = i % 6

  let r = 0
  let g = 0
  let b = 0
  switch (mod) {
    case 0: r = vN; g = t; b = p; break
    case 1: r = q; g = vN; b = p; break
    case 2: r = p; g = vN; b = t; break
    case 3: r = p; g = q; b = vN; break
    case 4: r = t; g = p; b = vN; break
    default: r = vN; g = p; b = q; break
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
}

export function hexToHsv(hex: string): HSV {
  return rgbToHsv(hexToRgb(hex))
}

// ---------------------- CSS 字符串生成 ----------------------

export function generateGradientCSS(config: GradientConfig): string {
  const stops = config.stops
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${Math.round(s.position)}%`)
    .join(', ')

  return config.type === 'linear'
    ? `linear-gradient(${Math.round(config.angle)}deg, ${stops})`
    : `radial-gradient(circle, ${stops})`
}

export function generateGradientCSSRule(config: GradientConfig): string {
  return `background: ${generateGradientCSS(config)};`
}

// ---------------------- 默认配置 ----------------------

const makeStop = (position: number, color: string): ColorStop => ({
  id: generateId(),
  position,
  color,
})

export function createDefaultGradient(): GradientConfig {
  return {
    type: 'linear',
    angle: 135,
    stops: [
      makeStop(0, '#1a1a2e'),
      makeStop(33, '#16213e'),
      makeStop(66, '#0f3460'),
      makeStop(100, '#e94560'),
    ],
  }
}

export const cloneConfig = (config: GradientConfig): GradientConfig => ({
  type: config.type,
  angle: config.angle,
  stops: config.stops.map((s) => ({ ...s, id: generateId() })),
})

// ---------------------- 预设模板数据 ----------------------

export const PRESETS: PresetGradient[] = [
  {
    id: 'preset-neon',
    name: '霓虹',
    style: 'Neon',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'n1', position: 0, color: '#f72585' },
        { id: 'n2', position: 33, color: '#7209b7' },
        { id: 'n3', position: 66, color: '#3a0ca3' },
        { id: 'n4', position: 100, color: '#4cc9f0' },
      ],
    },
  },
  {
    id: 'preset-sunset',
    name: '日落',
    style: 'Sunset',
    config: {
      type: 'linear',
      angle: 45,
      stops: [
        { id: 's1', position: 0, color: '#ff6e7f' },
        { id: 's2', position: 33, color: '#ff9472' },
        { id: 's3', position: 66, color: '#ffd86f' },
        { id: 's4', position: 100, color: '#c44dc2' },
      ],
    },
  },
  {
    id: 'preset-ocean',
    name: '海洋',
    style: 'Ocean',
    config: {
      type: 'linear',
      angle: 90,
      stops: [
        { id: 'o1', position: 0, color: '#00c6ff' },
        { id: 'o2', position: 33, color: '#0072ff' },
        { id: 'o3', position: 66, color: '#004e92' },
        { id: 'o4', position: 100, color: '#001f3f' },
      ],
    },
  },
  {
    id: 'preset-forest',
    name: '森林',
    style: 'Forest',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'f1', position: 0, color: '#134e5e' },
        { id: 'f2', position: 33, color: '#71b280' },
        { id: 'f3', position: 66, color: '#a8e063' },
        { id: 'f4', position: 100, color: '#56ab2f' },
      ],
    },
  },
  {
    id: 'preset-minimal',
    name: '极简',
    style: 'Minimal',
    config: {
      type: 'linear',
      angle: 135,
      stops: [
        { id: 'm1', position: 0, color: '#f5f7fa' },
        { id: 'm2', position: 33, color: '#c3cfe2' },
        { id: 'm3', position: 66, color: '#8e9eab' },
        { id: 'm4', position: 100, color: '#536976' },
      ],
    },
  },
  {
    id: 'preset-cyberpunk',
    name: '赛博朋克',
    style: 'Cyberpunk',
    config: {
      type: 'radial',
      angle: 0,
      stops: [
        { id: 'c1', position: 0, color: '#fc5c7d' },
        { id: 'c2', position: 33, color: '#6a82fb' },
        { id: 'c3', position: 66, color: '#302b63' },
        { id: 'c4', position: 100, color: '#0f0c29' },
      ],
    },
  },
]
