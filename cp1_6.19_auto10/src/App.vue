<template>
  <div class="app-container">
    <UIPanel />

    <div class="scene-container" ref="sceneContainer">
      <div class="heatmap-legend">
        <div class="legend-title">能耗热力图</div>
        <div class="legend-bar-horizontal">
          <div class="legend-gradient-h"></div>
          <div class="legend-labels-h">
            <span>低 ({{ minEnergy }})</span>
            <span>高 ({{ maxEnergy }})</span>
          </div>
        </div>
      </div>

      <div class="timeline-container">
        <div class="timeline-controls">
          <button class="control-btn" @click="togglePlayback">
            {{ store.isPlaying ? '⏸' : '▶' }}
          </button>
          <div class="timeline-wrapper">
            <input
              type="range"
              class="timeline-slider"
              :min="-1"
              :max="Math.max(0, store.historyData.length - 1)"
              :value="store.timelineIndex"
              @input="onSliderChange"
              :disabled="store.historyData.length < 2"
            />
            <div class="timeline-track">
              <div
                v-for="(point, i) in store.historyData"
                :key="i"
                class="timeline-dot"
                :class="{ active: i === store.timelineIndex || (store.isPlaying && i === store.historyData.length - 1) }"
                :style="{ left: `${(i / Math.max(1, store.historyData.length - 1)) * 100}%` }"
              ></div>
            </div>
          </div>
          <div class="timeline-label">
            {{ currentTimeLabel }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import UIPanel from '@renderModule/UIPanel.vue'
import { ThreeScene } from '@renderModule/ThreeScene'
import { dataSimulator } from '@dataModule/dataSimulator'
import { useEnergyStore } from '@store/energy'
import { EnergySnapshot } from '@dataModule/types'

const store = useEnergyStore()
const sceneContainer = ref<HTMLElement | null>(null)
let threeScene: ThreeScene | null = null

const minEnergy = computed(() => dataSimulator.getMinEnergy())
const maxEnergy = computed(() => dataSimulator.getMaxEnergy())

const currentTimeLabel = computed(() => {
  if (store.historyData.length === 0) return '--:--'
  let idx = store.timelineIndex
  if (idx < 0 || idx >= store.historyData.length) {
    idx = store.historyData.length - 1
  }
  const ts = store.historyData[idx]?.timestamp ?? Date.now()
  const date = new Date(ts)
  return `${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
})

function handleDataUpdate(snapshot: EnergySnapshot): void {
  store.setSnapshot(snapshot)
  store.setHistory(dataSimulator.getHistory())
  if (threeScene && store.isPlaying) {
    threeScene.updateData(snapshot)
  }
}

function onSliderChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const value = parseInt(target.value, 10)
  store.setTimelineIndex(value)
  store.setPlaying(value === -1)
}

function togglePlayback(): void {
  if (store.isPlaying) {
    store.setPlaying(false)
    if (store.historyData.length > 0) {
      store.setTimelineIndex(store.historyData.length - 1)
    }
  } else {
    store.setPlaying(true)
    const snapshot = dataSimulator.getCurrentSnapshot()
    if (threeScene) {
      threeScene.updateData(snapshot)
    }
  }
}

watch(() => store.fps, (fps) => {
  threeScene?.setQualityLevel(store.qualityLevel)
})

onMounted(() => {
  store.initialize()

  if (sceneContainer.value) {
    threeScene = new ThreeScene(
      sceneContainer.value,
      dataSimulator.getMinEnergy(),
      dataSimulator.getMaxEnergy(),
      200
    )

    const initialSnapshot = dataSimulator.getCurrentSnapshot()
    threeScene.createBuildings(initialSnapshot.buildings)

    threeScene.onBuildingClick((building) => {
      store.selectBuilding(building)
    })

    threeScene.onFpsUpdate((fps) => {
      store.setFps(fps)
    })

    threeScene.start()
  }

  dataSimulator.onDataUpdate(handleDataUpdate)
  dataSimulator.start()
})

onUnmounted(() => {
  dataSimulator.stop()
  dataSimulator.offDataUpdate(handleDataUpdate)
  threeScene?.dispose()
  threeScene = null
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #1a1a2e;
}

.scene-container {
  position: absolute;
  top: 0;
  left: 320px;
  right: 0;
  bottom: 0;
  transition: left 0.3s ease;
}

.app-container :deep(.ui-panel.collapsed) + .scene-container {
  left: 40px;
}

.heatmap-legend {
  position: absolute;
  bottom: 100px;
  right: 24px;
  background: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 10px;
  padding: 14px 18px;
  z-index: 50;
}

.legend-title {
  font-size: 12px;
  color: #00d4ff;
  margin-bottom: 10px;
  font-weight: 600;
}

.legend-bar-horizontal {
  width: 200px;
}

.legend-gradient-h {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(to right,
    #00ff88 0%,
    #88ff44 25%,
    #ffdd00 50%,
    #ff8800 75%,
    #ff3333 100%
  );
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

.legend-labels-h {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 10px;
  color: #718096;
}

.timeline-container {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 100px);
  max-width: 800px;
  z-index: 50;
}

.timeline-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 14px;
  padding: 14px 20px;
}

.control-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(0, 212, 255, 0.3);
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.control-btn:hover {
  background: rgba(0, 212, 255, 0.25);
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.4);
  transform: scale(1.05);
}

.control-btn:active {
  transform: scale(0.98);
}

.timeline-wrapper {
  flex: 1;
  position: relative;
  height: 36px;
  display: flex;
  align-items: center;
}

.timeline-slider {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  transform: translateY(-50%);
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: transparent;
  cursor: pointer;
  z-index: 2;
}

.timeline-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #00d4ff;
  border: 2px solid #fff;
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.6);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.timeline-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.timeline-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #00d4ff;
  border: 2px solid #fff;
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.6);
  cursor: pointer;
}

.timeline-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.timeline-track {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 6px;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: visible;
}

.timeline-dot {
  position: absolute;
  top: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(0, 212, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: all 0.2s ease;
}

.timeline-dot.active {
  background: #00d4ff;
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.8);
  width: 10px;
  height: 10px;
}

.timeline-label {
  font-family: monospace;
  font-size: 14px;
  color: #00d4ff;
  min-width: 50px;
  text-align: right;
  flex-shrink: 0;
}

@media (max-width: 1366px) {
  .scene-container {
    left: 280px;
  }
  .heatmap-legend {
    bottom: 90px;
    right: 16px;
    padding: 10px 14px;
  }
  .legend-bar-horizontal {
    width: 160px;
  }
  .timeline-container {
    width: calc(100% - 60px);
    bottom: 16px;
  }
  .timeline-controls {
    padding: 10px 16px;
    gap: 12px;
  }
}
</style>
