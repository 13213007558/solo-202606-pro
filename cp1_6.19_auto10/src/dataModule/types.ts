export interface BuildingData {
  id: string
  name: string
  position: { x: number; z: number }
  width: number
  depth: number
  height: number
  energyConsumption: number
  carbonEmission: number
  energyLevel: 'A' | 'B' | 'C' | 'D' | 'E'
  timestamp: number
}

export interface HeatmapPoint {
  x: number
  z: number
  value: number
  radius: number
}

export interface EnergySnapshot {
  timestamp: number
  buildings: BuildingData[]
  totalEnergy: number
  totalCarbon: number
}

export interface HistoryDataPoint {
  timestamp: number
  totalEnergy: number
  totalCarbon: number
}

export type DataUpdateCallback = (snapshot: EnergySnapshot) => void

export interface SimulatorConfig {
  buildingCount: number
  updateInterval: number
  historySize: number
  minEnergy: number
  maxEnergy: number
}

export const DEFAULT_SIMULATOR_CONFIG: SimulatorConfig = {
  buildingCount: 100,
  updateInterval: 1000,
  historySize: 30,
  minEnergy: 10,
  maxEnergy: 100
}

export function getEnergyLevel(energy: number, maxEnergy: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  const ratio = energy / maxEnergy
  if (ratio <= 0.2) return 'A'
  if (ratio <= 0.4) return 'B'
  if (ratio <= 0.6) return 'C'
  if (ratio <= 0.8) return 'D'
  return 'E'
}

export interface RGB {
  r: number
  g: number
  b: number
}

export function getEnergyRGB(value: number, minVal: number, maxVal: number): RGB {
  const t = Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)))
  return {
    r: t,
    g: 1 - t,
    b: 50 / 255
  }
}

export function getEnergyHexColor(value: number, minVal: number, maxVal: number): string {
  const t = Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)))
  const r = Math.floor(255 * t).toString(16).padStart(2, '0')
  const g = Math.floor(255 * (1 - t)).toString(16).padStart(2, '0')
  const b = '32'
  return `#${r}${g}${b}`
}
