import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TimeSeriesData, BuildingData, EnergyTrendPoint } from '@/dataModule/types'

export const useEnergyStore = defineStore('energy', () => {
  const currentData = ref<TimeSeriesData | null>(null)
  const historyData = ref<TimeSeriesData[]>([])
  const selectedBuilding = ref<BuildingData | null>(null)
  const timeIndex = ref(0)
  const isPlaying = ref(true)
  const panelCollapsed = ref(false)
  const fps = ref(60)
  const buildingCount = ref(100)

  const totalEnergy = computed(() => currentData.value?.totalEnergy ?? 0)
  const totalCarbon = computed(() => currentData.value?.totalCarbon ?? 0)
  const avgEnergy = computed(() => {
    const buildings = currentData.value?.buildingData
    if (!buildings || buildings.length === 0) return 0
    return buildings.reduce((sum, b) => sum + b.energyConsumption, 0) / buildings.length
  })

  const energyTrend = computed<EnergyTrendPoint[]>(() => {
    return historyData.value.map((d) => {
      const date = new Date(d.timestamp)
      return {
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`,
        energy: d.totalEnergy,
        carbon: d.totalCarbon
      }
    })
  })

  const energyLevelDistribution = computed(() => {
    const dist = { A: 0, B: 0, C: 0, D: 0, E: 0 }
    const buildings = currentData.value?.buildingData
    if (!buildings) return dist
    buildings.forEach((b) => {
      dist[b.energyLevel]++
    })
    return dist
  })

  function setCurrentData(data: TimeSeriesData) {
    currentData.value = data
  }

  function setHistoryData(data: TimeSeriesData[]) {
    historyData.value = data
  }

  function selectBuilding(building: BuildingData | null) {
    selectedBuilding.value = building
  }

  function setTimeIndex(index: number) {
    timeIndex.value = index
  }

  function togglePlay() {
    isPlaying.value = !isPlaying.value
  }

  function togglePanel() {
    panelCollapsed.value = !panelCollapsed.value
  }

  function setFps(value: number) {
    fps.value = value
  }

  function setBuildingCount(count: number) {
    buildingCount.value = count
  }

  return {
    currentData,
    historyData,
    selectedBuilding,
    timeIndex,
    isPlaying,
    panelCollapsed,
    fps,
    buildingCount,
    totalEnergy,
    totalCarbon,
    avgEnergy,
    energyTrend,
    energyLevelDistribution,
    setCurrentData,
    setHistoryData,
    selectBuilding,
    setTimeIndex,
    togglePlay,
    togglePanel,
    setFps,
    setBuildingCount
  }
})
