export interface BuildingData {
  id: string
  name: string
  position: { x: number; z: number }
  height: number
  width: number
  depth: number
  energyConsumption: number
  carbonEmission: number
  energyLevel: 'A' | 'B' | 'C' | 'D' | 'E'
}

export interface HeatmapPoint {
  x: number
  z: number
  value: number
  radius: number
}

export interface TimeSeriesData {
  timestamp: number
  totalEnergy: number
  totalCarbon: number
  buildingData: BuildingData[]
}

export interface EnergyTrendPoint {
  time: string
  energy: number
  carbon: number
}

export interface SimulatorEventMap {
  dataUpdate: TimeSeriesData
  buildingClick: BuildingData
}

export type EventCallback<T = unknown> = (data: T) => void

export interface IEventBus {
  on<K extends keyof SimulatorEventMap>(
    event: K,
    callback: EventCallback<SimulatorEventMap[K]>
  ): void
  off<K extends keyof SimulatorEventMap>(
    event: K,
    callback: EventCallback<SimulatorEventMap[K]>
  ): void
  emit<K extends keyof SimulatorEventMap>(
    event: K,
    data: SimulatorEventMap[K]
  ): void
}

export interface IDataSimulator {
  start(): void
  stop(): void
  getHistory(): TimeSeriesData[]
  getBuildingById(id: string): BuildingData | undefined
  setTimeIndex(index: number): void
  getCurrentData(): TimeSeriesData | null
  getBuildings(): BuildingData[]
  getCurrentTimeIndex(): number
}

export interface IThreeScene {
  init(container: HTMLElement): void
  dispose(): void
  updateBuildings(data: BuildingData[]): void
  setTimeIndex(index: number): void
  onBuildingClick(callback: (building: BuildingData) => void): void
}

export interface HeatmapConfig {
  minValue: number
  maxValue: number
  colorStops: { value: number; color: string }[]
}

export const HEATMAP_CONFIG: HeatmapConfig = {
  minValue: 0,
  maxValue: 100,
  colorStops: [
    { value: 0, color: '#00ff88' },
    { value: 25, color: '#88ff00' },
    { value: 50, color: '#ffff00' },
    { value: 75, color: '#ff8800' },
    { value: 100, color: '#ff3300' }
  ]
}

export const ENERGY_LEVELS: Record<string, { min: number; max: number; label: string }> = {
  A: { min: 0, max: 20, label: '优秀' },
  B: { min: 20, max: 40, label: '良好' },
  C: { min: 40, max: 60, label: '中等' },
  D: { min: 60, max: 80, label: '较高' },
  E: { min: 80, max: 100, label: '严重' }
}
