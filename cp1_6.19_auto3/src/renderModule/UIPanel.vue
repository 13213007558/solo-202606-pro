<template>
  <div class="ui-container">
    <transition name="slide">
      <div v-if="!energyStore.panelCollapsed" class="left-panel">
        <div class="panel-header">
          <h2 class="panel-title">
            <span class="title-icon">⚡</span>
            能耗监控中心
          </h2>
          <button class="collapse-btn" @click="energyStore.togglePanel()">
            «
          </button>
        </div>

        <div class="stat-cards">
          <div class="stat-card primary">
            <div class="stat-label">总能耗</div>
            <div class="stat-value">{{ formatNumber(energyStore.totalEnergy) }}</div>
            <div class="stat-unit">kWh</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-label">碳排放</div>
            <div class="stat-value">{{ formatNumber(energyStore.totalCarbon) }}</div>
            <div class="stat-unit">tCO₂</div>
          </div>
          <div class="stat-card info">
            <div class="stat-label">平均能耗</div>
            <div class="stat-value">{{ energyStore.avgEnergy.toFixed(1) }}</div>
            <div class="stat-unit">kWh/栋</div>
          </div>
        </div>

        <div class="chart-section">
          <h3 class="section-title">能耗趋势</h3>
          <canvas ref="chartCanvas" class="trend-chart"></canvas>
        </div>

        <div class="legend-section">
          <h3 class="section-title">能耗等级</h3>
          <div class="energy-legend">
            <div
              v-for="(info, level) in levelInfo"
              :key="level"
              class="legend-item"
            >
              <div class="legend-color" :style="{ backgroundColor: info.color }"></div>
              <span class="legend-label">等级 {{ level }}</span>
              <span class="legend-count">{{ levelDistribution[level] }} 栋</span>
            </div>
          </div>
        </div>

        <div class="perf-section">
          <div class="perf-item">
            <span class="perf-label">帧率</span>
            <span class="perf-value" :class="{ low: energyStore.fps < 40 }">
              {{ energyStore.fps }} FPS
            </span>
          </div>
          <div class="perf-item">
            <span class="perf-label">建筑数量</span>
            <span class="perf-value">{{ energyStore.buildingCount }}</span>
          </div>
        </div>
      </div>
    </transition>

    <button
      v-if="energyStore.panelCollapsed"
      class="expand-btn"
      @click="energyStore.togglePanel()"
    >
      »
    </button>

    <div class="heatmap-legend">
      <div class="legend-title">热力图图例</div>
      <div class="legend-bar">
        <div class="gradient-bar"></div>
        <div class="legend-labels">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>
      <div class="legend-unit">能耗强度 (kWh)</div>
    </div>

    <div class="timeline-container">
      <div class="timeline-header">
        <span class="timeline-label">时间轴</span>
        <button class="play-btn" @click="togglePlay">
          {{ energyStore.isPlaying ? '⏸ 暂停' : '▶ 播放' }}
        </button>
        <span class="timeline-time">{{ currentTimeDisplay }}</span>
      </div>
      <div class="timeline-slider-container">
        <input
          type="range"
          :min="0"
          :max="maxTimeIndex"
          :value="energyStore.timeIndex"
          @input="onTimelineChange"
          class="timeline-slider"
        />
        <div class="timeline-ticks">
          <span v-for="i in 6" :key="i" class="tick">
            {{ formatTimeTick((i - 1) * 6) }}s
          </span>
        </div>
      </div>
    </div>

    <transition name="popup">
      <div v-if="energyStore.selectedBuilding" class="building-popup">
        <div class="popup-header">
          <h3 class="popup-title">{{ energyStore.selectedBuilding.name }}</h3>
          <button class="popup-close" @click="energyStore.selectBuilding(null)">×</button>
        </div>
        <div class="popup-body">
          <div class="popup-row">
            <span class="popup-label">当前能耗</span>
            <span class="popup-value energy">
              {{ energyStore.selectedBuilding.energyConsumption.toFixed(1) }} kWh
            </span>
          </div>
          <div class="popup-row">
            <span class="popup-label">碳排放量</span>
            <span class="popup-value carbon">
              {{ energyStore.selectedBuilding.carbonEmission.toFixed(1) }} tCO₂
            </span>
          </div>
          <div class="popup-row">
            <span class="popup-label">能耗等级</span>
            <span
              class="popup-value level"
              :class="'level-' + energyStore.selectedBuilding.energyLevel"
            >
              {{ getLevelLabel(energyStore.selectedBuilding.energyLevel) }}
            </span>
          </div>
          <div class="popup-row">
            <span class="popup-label">建筑高度</span>
            <span class="popup-value">{{ energyStore.selectedBuilding.height.toFixed(0) }} m</span>
          </div>
          <div class="energy-bar-container">
            <div class="energy-bar-label">能耗强度</div>
            <div class="energy-bar-bg">
              <div
                class="energy-bar-fill"
                :style="{
                  width: energyStore.selectedBuilding.energyConsumption + '%',
                  background: getEnergyGradient(energyStore.selectedBuilding.energyConsumption)
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useEnergyStore } from '@/store/energy'
import { ENERGY_LEVELS } from '@/dataModule/types'

const energyStore = useEnergyStore()
const chartCanvas = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number | null = null

const levelInfo: Record<string, { color: string; label: string }> = {
  A: { color: '#00ff88', label: '优秀' },
  B: { color: '#88ff00', label: '良好' },
  C: { color: '#ffff00', label: '中等' },
  D: { color: '#ff8800', label: '较高' },
  E: { color: '#ff3300', label: '严重' }
}

const levelDistribution = computed(() => {
  return energyStore.energyLevelDistribution as Record<string, number>
})

const maxTimeIndex = computed(() => {
  return Math.max(0, energyStore.historyData.length - 1)
})

const currentTimeDisplay = computed(() => {
  const data = energyStore.currentData
  if (!data) return '--:--:--'
  const date = new Date(data.timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
})

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toFixed(0)
}

function getLevelLabel(level: string): string {
  return ENERGY_LEVELS[level]?.label || level
}

function getEnergyGradient(value: number): string {
  const percent = Math.max(0, Math.min(100, value))
  if (percent < 25) return '#00ff88'
  if (percent < 50) return '#88ff00'
  if (percent < 75) return '#ff8800'
  return '#ff3300'
}

function formatTimeTick(seconds: number): string {
  return `-${30 - seconds}`
}

function togglePlay(): void {
  energyStore.togglePlay()
  const event = new CustomEvent('toggle-play', { detail: energyStore.isPlaying })
  window.dispatchEvent(event)
}

function onTimelineChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const index = parseInt(target.value)
  energyStore.setTimeIndex(index)
  const evt = new CustomEvent('timeline-change', { detail: index })
  window.dispatchEvent(evt)
}

function drawChart(): void {
  const canvas = chartCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const width = rect.width
  const height = rect.height
  const padding = { top: 20, right: 10, bottom: 20, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  ctx.clearRect(0, 0, width, height)

  const data = energyStore.energyTrend
  if (data.length < 2) return

  const maxEnergy = Math.max(...data.map((d) => d.energy)) * 1.1
  const minEnergy = 0

  ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(padding.left + chartWidth, y)
    ctx.stroke()
  }

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartWidth,
    y: padding.top + chartHeight - ((d.energy - minEnergy) / (maxEnergy - minEnergy)) * chartHeight
  }))

  const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight)
  gradient.addColorStop(0, 'rgba(0, 212, 255, 0.4)')
  gradient.addColorStop(1, 'rgba(0, 212, 255, 0)')

  ctx.beginPath()
  ctx.moveTo(points[0].x, padding.top + chartHeight)
  points.forEach((p) => ctx.lineTo(p.x, p.y))
  ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()

  ctx.shadowColor = '#00d4ff'
  ctx.shadowBlur = 10
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth = 2
  ctx.beginPath()
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  })
  ctx.stroke()
  ctx.shadowBlur = 0

  const carbonPoints = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartWidth,
    y: padding.top + chartHeight - ((d.carbon * 2 - minEnergy) / (maxEnergy - minEnergy)) * chartHeight
  }))

  ctx.shadowColor = '#ff6b35'
  ctx.shadowBlur = 8
  ctx.strokeStyle = '#ff6b35'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  carbonPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  })
  ctx.stroke()
  ctx.setLineDash([])
  ctx.shadowBlur = 0

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const value = maxEnergy - (maxEnergy / 4) * i
    const y = padding.top + (chartHeight / 4) * i
    ctx.fillText(Math.round(value).toString(), padding.left - 5, y + 3)
  }

  const currentIndex = energyStore.timeIndex
  if (currentIndex >= 0 && currentIndex < points.length) {
    const currentPoint = points[currentIndex]

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.moveTo(currentPoint.x, padding.top)
    ctx.lineTo(currentPoint.x, padding.top + chartHeight)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 15
    ctx.fillStyle = '#00d4ff'
    ctx.beginPath()
    ctx.arc(currentPoint.x, currentPoint.y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (chartCanvas.value) {
    resizeObserver = new ResizeObserver(() => {
      drawChart()
    })
    resizeObserver.observe(chartCanvas.value)
  }

  function animate() {
    drawChart()
    animationFrameId = requestAnimationFrame(animate)
  }
  animate()
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

watch(
  () => energyStore.energyTrend.length,
  () => {
    drawChart()
  }
)
</script>

<style scoped>
.ui-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 100;
}

.left-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 320px;
  max-height: calc(100vh - 200px);
  background: rgba(26, 26, 46, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  pointer-events: auto;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #00d4ff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 20px;
}

.collapse-btn {
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  color: #00d4ff;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  transform: scale(1.05);
}

.expand-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 36px;
  height: 60px;
  background: rgba(26, 26, 46, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 8px;
  color: #00d4ff;
  cursor: pointer;
  pointer-events: auto;
  font-size: 16px;
  transition: all 0.2s ease;
}

.expand-btn:hover {
  background: rgba(0, 212, 255, 0.2);
  transform: scale(1.05);
}

.stat-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.stat-card {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 12px 16px;
  border-left: 3px solid;
  position: relative;
  overflow: hidden;
}

.stat-card.primary {
  border-color: #00d4ff;
}

.stat-card.warning {
  border-color: #ff6b35;
}

.stat-card.info {
  border-color: #00ff88;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  font-family: 'Consolas', monospace;
}

.stat-card.primary .stat-value {
  color: #00d4ff;
}

.stat-card.warning .stat-value {
  color: #ff6b35;
}

.stat-card.info .stat-value {
  color: #00ff88;
}

.stat-unit {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  position: absolute;
  right: 16px;
  bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 12px 0;
  padding-left: 8px;
  border-left: 2px solid #00d4ff;
}

.chart-section {
  margin-bottom: 20px;
}

.trend-chart {
  width: 100%;
  height: 120px;
  display: block;
}

.legend-section {
  margin-bottom: 20px;
}

.energy-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  box-shadow: 0 0 6px currentColor;
}

.legend-label {
  color: rgba(255, 255, 255, 0.7);
  min-width: 60px;
}

.legend-count {
  color: rgba(255, 255, 255, 0.4);
  margin-left: auto;
}

.perf-section {
  display: flex;
  justify-content: space-around;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.perf-item {
  text-align: center;
}

.perf-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  display: block;
  margin-bottom: 4px;
}

.perf-value {
  font-size: 16px;
  font-weight: 600;
  color: #00d4ff;
  font-family: 'Consolas', monospace;
}

.perf-value.low {
  color: #ff6b35;
}

.heatmap-legend {
  position: absolute;
  right: 20px;
  bottom: 140px;
  background: rgba(26, 26, 46, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  pointer-events: auto;
}

.legend-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
  font-weight: 500;
}

.legend-bar {
  width: 160px;
}

.gradient-bar {
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(to right, #00ff88, #88ff00, #ffff00, #ff8800, #ff3300);
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}

.legend-labels span {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.legend-unit {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  margin-top: 6px;
}

.timeline-container {
  position: absolute;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  width: calc(100% - 400px);
  max-width: 800px;
  background: rgba(26, 26, 46, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 10px;
  padding: 12px 20px;
  pointer-events: auto;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.timeline-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.play-btn {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 212, 255, 0.1));
  border: 1px solid rgba(0, 212, 255, 0.3);
  color: #00d4ff;
  padding: 4px 14px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.play-btn:hover {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.3), rgba(0, 212, 255, 0.2));
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
}

.timeline-time {
  margin-left: auto;
  font-size: 14px;
  color: #00d4ff;
  font-family: 'Consolas', monospace;
  font-weight: 600;
}

.timeline-slider-container {
  position: relative;
}

.timeline-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.timeline-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #00d4ff;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.6);
  transition: transform 0.2s ease;
}

.timeline-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.timeline-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #00d4ff;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.6);
}

.timeline-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  padding: 0 8px;
}

.tick {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.building-popup {
  position: absolute;
  top: 50%;
  right: 40px;
  transform: translateY(-50%);
  width: 280px;
  background: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 12px;
  pointer-events: auto;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 212, 255, 0.05));
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
}

.popup-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.popup-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.popup-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.popup-body {
  padding: 16px;
}

.popup-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.popup-row:last-of-type {
  border-bottom: none;
}

.popup-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.popup-value {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  font-family: 'Consolas', monospace;
}

.popup-value.energy {
  color: #00d4ff;
}

.popup-value.carbon {
  color: #ff6b35;
}

.popup-value.level {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
}

.popup-value.level-A {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

.popup-value.level-B {
  background: rgba(136, 255, 0, 0.2);
  color: #88ff00;
}

.popup-value.level-C {
  background: rgba(255, 255, 0, 0.2);
  color: #ffff00;
}

.popup-value.level-D {
  background: rgba(255, 136, 0, 0.2);
  color: #ff8800;
}

.popup-value.level-E {
  background: rgba(255, 51, 0, 0.2);
  color: #ff3300;
}

.energy-bar-container {
  margin-top: 14px;
}

.energy-bar-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
}

.energy-bar-bg {
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.energy-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px currentColor;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.popup-enter-active,
.popup-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.popup-enter-from,
.popup-leave-to {
  transform: translateY(-50%) scale(0.8);
  opacity: 0;
}

@media (max-width: 1366px) {
  .left-panel {
    width: 280px;
    padding: 16px;
  }

  .timeline-container {
    width: calc(100% - 340px);
  }

  .building-popup {
    width: 240px;
    right: 20px;
  }
}
</style>
