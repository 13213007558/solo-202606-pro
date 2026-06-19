import {
  BuildingData,
  EnergySnapshot,
  HistoryDataPoint,
  DataUpdateCallback,
  SimulatorConfig,
  DEFAULT_SIMULATOR_CONFIG,
  getEnergyLevel
} from './types'

type EventType = 'dataUpdate' | 'historyUpdate'

interface BuildingState {
  baseEnergy: number
  phase: number
  amplitude: number
  frequency: number
}

class EventBus {
  private listeners: Map<EventType, Set<DataUpdateCallback>> = new Map()

  on(event: EventType, callback: DataUpdateCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: EventType, callback: DataUpdateCallback): void {
    this.listeners.get(event)?.delete(callback)
  }

  emit(event: EventType, data: EnergySnapshot): void {
    this.listeners.get(event)?.forEach(cb => cb(data))
  }
}

export class DataSimulator {
  private config: SimulatorConfig
  private buildings: Map<string, BuildingState> = new Map()
  private buildingDataList: BuildingData[] = []
  private history: HistoryDataPoint[] = []
  private eventBus: EventBus = new EventBus()
  private timer: number | null = null
  private isRunning: boolean = false
  private gridSize: number = 0

  constructor(config: Partial<SimulatorConfig> = {}) {
    this.config = { ...DEFAULT_SIMULATOR_CONFIG, ...config }
    this.gridSize = Math.ceil(Math.sqrt(this.config.buildingCount))
    this.initializeBuildings()
  }

  private initializeBuildings(): void {
    const buildingNames = ['研发中心', '数据中心', '办公楼', '商业综合体', '酒店', '医院', '学校', '体育馆']
    const spacing = 8
    const offset = (this.gridSize * spacing) / 2

    for (let i = 0; i < this.config.buildingCount; i++) {
      const row = Math.floor(i / this.gridSize)
      const col = i % this.gridSize
      const id = `building_${i.toString().padStart(4, '0')}`
      const name = `${buildingNames[i % buildingNames.length]} ${Math.floor(i / buildingNames.length) + 1}`

      const baseEnergy = this.config.minEnergy + Math.random() * (this.config.maxEnergy - this.config.minEnergy) * 0.5

      this.buildings.set(id, {
        baseEnergy,
        phase: Math.random() * Math.PI * 2,
        amplitude: (0.2 + Math.random() * 0.4) * baseEnergy,
        frequency: 0.5 + Math.random() * 1.5
      })

      this.buildingDataList.push({
        id,
        name,
        position: {
          x: col * spacing + (Math.random() - 0.5) * 2 - offset,
          z: row * spacing + (Math.random() - 0.5) * 2 - offset
        },
        width: 3 + Math.random() * 2,
        depth: 3 + Math.random() * 2,
        height: 5 + Math.random() * 25,
        energyConsumption: baseEnergy,
        carbonEmission: baseEnergy * 0.5,
        energyLevel: getEnergyLevel(baseEnergy, this.config.maxEnergy),
        timestamp: Date.now()
      })
    }
  }

  private generateSnapshot(): EnergySnapshot {
    const now = Date.now()
    const timeSeconds = now / 1000
    let totalEnergy = 0
    let totalCarbon = 0

    const updatedBuildings: BuildingData[] = this.buildingDataList.map(building => {
      const state = this.buildings.get(building.id)!
      const periodicTrend = Math.sin(timeSeconds * state.frequency * 0.1 + state.phase)
      const randomFluctuation = (Math.random() - 0.5) * 0.2
      const energy = state.baseEnergy + state.amplitude * periodicTrend + randomFluctuation * state.baseEnergy
      const clampedEnergy = Math.max(this.config.minEnergy, Math.min(this.config.maxEnergy, energy))
      const carbon = clampedEnergy * 0.5

      totalEnergy += clampedEnergy
      totalCarbon += carbon

      return {
        ...building,
        energyConsumption: clampedEnergy,
        carbonEmission: carbon,
        energyLevel: getEnergyLevel(clampedEnergy, this.config.maxEnergy),
        timestamp: now
      }
    })

    this.buildingDataList = updatedBuildings

    return {
      timestamp: now,
      buildings: updatedBuildings,
      totalEnergy,
      totalCarbon
    }
  }

  private update(): void {
    const snapshot = this.generateSnapshot()

    this.history.push({
      timestamp: snapshot.timestamp,
      totalEnergy: snapshot.totalEnergy,
      totalCarbon: snapshot.totalCarbon
    })

    if (this.history.length > this.config.historySize) {
      this.history.shift()
    }

    this.eventBus.emit('dataUpdate', snapshot)
    this.eventBus.emit('historyUpdate', snapshot)
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.update()
    this.timer = window.setInterval(() => this.update(), this.config.updateInterval)
  }

  stop(): void {
    this.isRunning = false
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  onDataUpdate(callback: DataUpdateCallback): void {
    this.eventBus.on('dataUpdate', callback)
  }

  offDataUpdate(callback: DataUpdateCallback): void {
    this.eventBus.off('dataUpdate', callback)
  }

  onHistoryUpdate(callback: DataUpdateCallback): void {
    this.eventBus.on('historyUpdate', callback)
  }

  offHistoryUpdate(callback: DataUpdateCallback): void {
    this.eventBus.off('historyUpdate', callback)
  }

  getCurrentSnapshot(): EnergySnapshot {
    return {
      timestamp: Date.now(),
      buildings: [...this.buildingDataList],
      totalEnergy: this.buildingDataList.reduce((sum, b) => sum + b.energyConsumption, 0),
      totalCarbon: this.buildingDataList.reduce((sum, b) => sum + b.carbonEmission, 0)
    }
  }

  getHistory(): HistoryDataPoint[] {
    return [...this.history]
  }

  getHistorySize(): number {
    return this.config.historySize
  }

  getMinEnergy(): number {
    return this.config.minEnergy
  }

  getMaxEnergy(): number {
    return this.config.maxEnergy
  }

  getBuildingCount(): number {
    return this.config.buildingCount
  }
}

export const dataSimulator = new DataSimulator()
