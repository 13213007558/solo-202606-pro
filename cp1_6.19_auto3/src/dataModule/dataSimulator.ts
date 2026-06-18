import type {
  BuildingData,
  TimeSeriesData,
  IDataSimulator,
  IEventBus,
  SimulatorEventMap,
  EventCallback
} from './types'

class EventBus implements IEventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map()

  on<K extends keyof SimulatorEventMap>(
    event: K,
    callback: EventCallback<SimulatorEventMap[K]>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback as EventCallback)
  }

  off<K extends keyof SimulatorEventMap>(
    event: K,
    callback: EventCallback<SimulatorEventMap[K]>
  ): void {
    this.listeners.get(event)?.delete(callback as EventCallback)
  }

  emit<K extends keyof SimulatorEventMap>(
    event: K,
    data: SimulatorEventMap[K]
  ): void {
    this.listeners.get(event)?.forEach((cb) => cb(data))
  }
}

const BUILDING_NAME_PREFIXES = [
  '科技大厦', '商业中心', '产业园', '写字楼', '研发中心',
  '数据中心', '综合办公楼', '创新基地', '金融大厦', '能源中心'
]

export class DataSimulator implements IDataSimulator {
  private eventBus = new EventBus()
  private buildings: BuildingData[] = []
  private history: TimeSeriesData[] = []
  private maxHistoryLength = 30
  private timerId: number | null = null
  private isRunning = false
  private timeIndex = -1
  private baseEnergyValues: Map<string, number> = new Map()
  private buildingCount = 0

  constructor(buildingCount: number = 100) {
    this.buildingCount = Math.max(50, Math.min(200, buildingCount))
    this.generateBuildings()
    this.initHistory()
  }

  private generateBuildings(): void {
    const gridSize = Math.ceil(Math.sqrt(this.buildingCount))
    const spacing = 12

    for (let i = 0; i < this.buildingCount; i++) {
      const row = Math.floor(i / gridSize)
      const col = i % gridSize
      const offsetX = (Math.random() - 0.5) * 4
      const offsetZ = (Math.random() - 0.5) * 4

      const height = 15 + Math.random() * 60
      const width = 4 + Math.random() * 6
      const depth = 4 + Math.random() * 6
      const baseEnergy = 20 + Math.random() * 60

      const building: BuildingData = {
        id: `building_${i}`,
        name: `${BUILDING_NAME_PREFIXES[i % BUILDING_NAME_PREFIXES.length]}${Math.floor(i / BUILDING_NAME_PREFIXES.length) + 1}号楼`,
        position: {
          x: (col - gridSize / 2) * spacing + offsetX,
          z: (row - gridSize / 2) * spacing + offsetZ
        },
        height,
        width,
        depth,
        energyConsumption: baseEnergy,
        carbonEmission: baseEnergy * 0.5,
        energyLevel: this.getEnergyLevel(baseEnergy)
      }

      this.buildings.push(building)
      this.baseEnergyValues.set(building.id, baseEnergy)
    }
  }

  private getEnergyLevel(value: number): BuildingData['energyLevel'] {
    if (value < 20) return 'A'
    if (value < 40) return 'B'
    if (value < 60) return 'C'
    if (value < 80) return 'D'
    return 'E'
  }

  private initHistory(): void {
    const now = Date.now()
    for (let i = this.maxHistoryLength - 1; i >= 0; i--) {
      this.history.push(
        this.generateTimeSeriesData(now - i * 1000)
      )
    }
    this.timeIndex = this.history.length - 1
  }

  private generateTimeSeriesData(timestamp: number): TimeSeriesData {
    const timeOfDay = (timestamp % 86400000) / 86400000
    const periodicFactor = 0.6 + 0.4 * Math.sin(timeOfDay * Math.PI * 2 - Math.PI / 2)

    let totalEnergy = 0
    let totalCarbon = 0

    const buildingData = this.buildings.map((b) => {
      const baseEnergy = this.baseEnergyValues.get(b.id) || 50
      const randomFactor = 0.85 + Math.random() * 0.3
      const energy = Math.max(5, Math.min(100, baseEnergy * periodicFactor * randomFactor))
      const carbon = energy * 0.5 + Math.random() * 5

      totalEnergy += energy
      totalCarbon += carbon

      return {
        ...b,
        energyConsumption: energy,
        carbonEmission: carbon,
        energyLevel: this.getEnergyLevel(energy)
      }
    })

    return {
      timestamp,
      totalEnergy,
      totalCarbon,
      buildingData
    }
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true

    this.timerId = window.setInterval(() => {
      if (this.timeIndex === this.history.length - 1) {
        const newData = this.generateTimeSeriesData(Date.now())
        this.history.push(newData)
        if (this.history.length > this.maxHistoryLength) {
          this.history.shift()
        }
        this.timeIndex = this.history.length - 1
        this.eventBus.emit('dataUpdate', newData)
      }
    }, 1000)
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
    this.isRunning = false
  }

  getHistory(): TimeSeriesData[] {
    return [...this.history]
  }

  getBuildingById(id: string): BuildingData | undefined {
    const currentData = this.getCurrentData()
    return currentData?.buildingData.find((b) => b.id === id)
  }

  setTimeIndex(index: number): void {
    const clampedIndex = Math.max(0, Math.min(this.history.length - 1, index))
    if (clampedIndex !== this.timeIndex) {
      this.timeIndex = clampedIndex
      const data = this.history[clampedIndex]
      if (data) {
        this.eventBus.emit('dataUpdate', data)
      }
    }
  }

  getCurrentData(): TimeSeriesData | null {
    if (this.timeIndex >= 0 && this.timeIndex < this.history.length) {
      return this.history[this.timeIndex]
    }
    return null
  }

  getCurrentTimeIndex(): number {
    return this.timeIndex
  }

  getMaxHistoryLength(): number {
    return this.maxHistoryLength
  }

  getBuildings(): BuildingData[] {
    return [...this.buildings]
  }

  onDataUpdate(callback: (data: TimeSeriesData) => void): void {
    this.eventBus.on('dataUpdate', callback)
  }

  offDataUpdate(callback: (data: TimeSeriesData) => void): void {
    this.eventBus.off('dataUpdate', callback)
  }

  onBuildingClick(callback: (building: BuildingData) => void): void {
    this.eventBus.on('buildingClick', callback)
  }

  offBuildingClick(callback: (building: BuildingData) => void): void {
    this.eventBus.off('buildingClick', callback)
  }

  emitBuildingClick(building: BuildingData): void {
    this.eventBus.emit('buildingClick', building)
  }
}
