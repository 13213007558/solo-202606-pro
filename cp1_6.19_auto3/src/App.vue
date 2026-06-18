<template>
  <div class="app-container">
    <div ref="canvasContainer" class="canvas-container"></div>
    <UIPanel />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject } from 'vue'
import UIPanel from './renderModule/UIPanel.vue'
import { useEnergyStore } from '@/store/energy'
import type { ThreeScene } from './renderModule/ThreeScene'
import type { DataSimulator } from './dataModule/dataSimulator'
import type { TimeSeriesData, BuildingData } from '@/dataModule/types'

const canvasContainer = ref<HTMLElement | null>(null)
const energyStore = useEnergyStore()

const threeScene = inject<ThreeScene>('threeScene')
const dataSimulator = inject<DataSimulator>('dataSimulator')

onMounted(() => {
  if (canvasContainer.value && threeScene && dataSimulator) {
    threeScene.init(canvasContainer.value)

    const simulator = dataSimulator
    const scene = threeScene

    energyStore.setHistoryData(simulator.getHistory())
    const currentData = simulator.getCurrentData()
    if (currentData) {
      energyStore.setCurrentData(currentData)
      scene.updateBuildings(currentData.buildingData)
    }

    energyStore.setTimeIndex(simulator.getCurrentTimeIndex())
    energyStore.setBuildingCount(simulator.getBuildings().length)

    const handleDataUpdate = (data: TimeSeriesData) => {
      energyStore.setCurrentData(data)
      energyStore.setHistoryData(simulator.getHistory())
      scene.updateBuildings(data.buildingData)
    }

    simulator.onDataUpdate(handleDataUpdate)

    const handleBuildingClick = (building: BuildingData) => {
      energyStore.selectBuilding(building)
    }

    scene.onBuildingClick(handleBuildingClick)

    const handleFpsUpdate = (fps: number) => {
      energyStore.setFps(fps)
    }

    scene.onFpsUpdate(handleFpsUpdate)

    const handleTimelineChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>
      simulator.setTimeIndex(customEvent.detail)
      energyStore.setTimeIndex(customEvent.detail)
    }

    const handleTogglePlay = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>
      if (customEvent.detail) {
        simulator.setTimeIndex(simulator.getHistory().length - 1)
        energyStore.setTimeIndex(simulator.getHistory().length - 1)
      }
    }

    window.addEventListener('timeline-change', handleTimelineChange as EventListener)
    window.addEventListener('toggle-play', handleTogglePlay as EventListener)

    onUnmounted(() => {
      window.removeEventListener('timeline-change', handleTimelineChange as EventListener)
      window.removeEventListener('toggle-play', handleTogglePlay as EventListener)
    })
  }
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.canvas-container {
  width: 100%;
  height: 100%;
}
</style>
