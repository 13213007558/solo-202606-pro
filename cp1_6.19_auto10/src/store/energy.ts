import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { BuildingData, EnergySnapshot, HistoryDataPoint } from '@dataModule/types'
import { dataSimulator } from '@dataModule/dataSimulator'

export const useEnergyStore = defineStore('energy', () => {
  const currentSnapshot = ref<EnergySnapshot | null>(null)
  const historyData = ref<HistoryDataPoint[]>([])
  const selectedBuilding = ref<BuildingData | null>(null)
  const timelineIndex = ref<number>(-1)
  const isPlaying = ref<boolean>(true)
  const panelCollapsed = ref<boolean>(false)
  const fps = ref<number>(60)
  const qualityLevel = ref<'high' | 'medium' | 'low'>('high')

  const totalEnergy = computed(() => currentSnapshot.value?.totalEnergy ?? 0)
  const totalCarbon = computed(() => currentSnapshot.value?.totalCarbon ?? 0)
  const buildingCount = computed(() => currentSnapshot.value?.buildings.length ?? 0)
  const avgEnergyLevel = computed(() => {
    if (!currentSnapshot.value) return 'C'
    const avg = currentSnapshot.value.totalEnergy / currentSnapshot.value.buildings.length
    const maxEnergy = dataSimulator.getMaxEnergy()
    const ratio = avg / maxEnergy
    if (ratio <= 0.2) return 'A'
    if (ratio <= 0.4) return 'B'
    if (ratio <= 0.6) return 'C'
    if (ratio <= 0.8) return 'D'
    return 'E'
  })

  function setSnapshot(snapshot: EnergySnapshot) {
    if (timelineIndex.value === -1 || isPlaying.value) {
      currentSnapshot.value = snapshot
    }
  }

  function setHistory(history: HistoryDataPoint[]) {
    historyData.value = history
  }

  function selectBuilding(building: BuildingData | null) {
    selectedBuilding.value = building
  }

  function setTimelineIndex(index: number) {
    timelineIndex.value = index
    if (index >= 0 && index < historyData.value.length) {
      const hist = historyData.value[index]
      if (currentSnapshot.value) {
        currentSnapshot.value = {
          ...currentSnapshot.value,
          timestamp: hist.timestamp,
          totalEnergy: hist.totalEnergy,
          totalCarbon: hist.totalCarbon
        }
      }
    }
  }

  function setPlaying(playing: boolean) {
    isPlaying.value = playing
    if (playing) {
      timelineIndex.value = -1
    }
  }

  function togglePanel() {
    panelCollapsed.value = !panelCollapsed.value
  }

  function setFps(value: number) {
    fps.value = value
    if (value < 30) {
      qualityLevel.value = 'low'
    } else if (value < 50) {
      qualityLevel.value = 'medium'
    } else {
      qualityLevel.value = 'high'
    }
  }

  function initialize() {
    const snapshot = dataSimulator.getCurrentSnapshot()
    currentSnapshot.value = snapshot
    historyData.value = dataSimulator.getHistory()
  }

  return {
    currentSnapshot,
    historyData,
    selectedBuilding,
    timelineIndex,
    isPlaying,
    panelCollapsed,
    fps,
    qualityLevel,
    totalEnergy,
    totalCarbon,
    buildingCount,
    avgEnergyLevel,
    setSnapshot,
    setHistory,
    selectBuilding,
    setTimelineIndex,
    setPlaying,
    togglePanel,
    setFps,
    initialize
  }
})
