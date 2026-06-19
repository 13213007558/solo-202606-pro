<template>
  <div class="ui-panel" :class="{ collapsed: store.panelCollapsed }">
    <button class="toggle-btn" @click="store.togglePanel">
      {{ store.panelCollapsed ? '→' : '←' }}
    </button>

    <div class="panel-content" v-show="!store.panelCollapsed">
      <div class="panel-header">
        <h1>能耗监控中心</h1>
        <div class="status-indicator" :class="store.qualityLevel">
          <span class="dot"></span>
          {{ qualityLabel }}
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">总能耗</div>
          <div class="stat-value highlight">{{ formatNumber(store.totalEnergy) }}</div>
          <div class="stat-unit">kWh</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">碳排放</div>
          <div class="stat-value warning">{{ formatNumber(store.totalCarbon) }}</div>
          <div class="stat-unit">tCO₂</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">建筑数量</div>
          <div class="stat-value">{{ store.buildingCount }}</div>
          <div class="stat-unit">栋</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">平均等级</div>
          <div class="stat-value level" :class="'level-' + store.avgEnergyLevel">{{ store.avgEnergyLevel }}</div>
          <div class="stat-unit">等级</div>
        </div>
      </div>

      <div class="chart-section">
        <div class="section-header">
          <span class="section-title">能耗趋势 (30s)</span>
          <span class="fps-info">FPS: {{ store.fps }}</span>
        </div>
        <div class="chart-container">
          <canvas ref="chartCanvas" width="560" height="180"></canvas>
        </div>
      </div>

      <div class="legend-section">
        <div class="section-header">
          <span class="section-title">能耗等级图例</span>
        </div>
        <div class="legend-bar">
          <div class="legend-gradient"></div>
          <div class="legend-labels">
            <span>低</span>
            <span>A</span>
            <span>B</span>
            <span>C</span>
            <span>D</span>
            <span>E</span>
            <span>高</span>
          </div>
        </div>
        <div class="level-legend">
          <div v-for="level in levels" :key="level.key" class="level-item">
            <span class="level-color" :style="{ backgroundColor: level.color }"></span>
            <span class="level-text">{{ level.key }} - {{ level.label }}</span>
          </div>
        </div>
      </div>

      <div class="selected-building" v-if="store.selectedBuilding">
        <div class="selected-header">
          <span class="selected-icon">📍</span>
          <span class="selected-title">建筑详情</span>
        </div>
        <div class="detail-card">
          <div class="detail-row">
            <span class="detail-label">名称</span>
            <span class="detail-value">{{ store.selectedBuilding.name }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">当前能耗</span>
            <span class="detail-value highlight">{{ formatNumber(store.selectedBuilding.energyConsumption) }} kWh</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">碳排量</span>
            <span class="detail-value warning">{{ formatNumber(store.selectedBuilding.carbonEmission) }} tCO₂</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">能耗等级</span>
            <span class="detail-value level-badge" :class="'level-' + store.selectedBuilding.energyLevel">
              {{ store.selectedBuilding.energyLevel }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useEnergyStore } from '@store/energy'
import { HistoryDataPoint } from '@dataModule/types'
import { dataSimulator } from '@dataModule/dataSimulator'

const store = useEnergyStore()
const chartCanvas = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null

const levels = [
  { key: 'A', label: '优秀 (≤20%)', color: '#00ff88' },
  { key: 'B', label: '良好 (21-40%)', color: '#88ff44' },
  { key: 'C', label: '中等 (41-60%)', color: '#ffdd00' },
  { key: 'D', label: '较差 (61-80%)', color: '#ff8800' },
  { key: 'E', label: '严重 (>80%)', color: '#ff3333' }
]

const qualityLabel = computed(() => {
  switch (store.qualityLevel) {
    case 'high': return '高质量'
    case 'medium': return '中质量'
    case 'low': return '低质量'
    default: return '高质量'
  }
})

function formatNumber(num: number): string {
  return num.toFixed(1)
}

function drawChart(): void {
  const canvas = chartCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  ctx.clearRect(0, 0, width, height)

  const history = store.historyData
  if (history.length < 2) {
    ctx.fillStyle = '#4a5568'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('等待数据...', width / 2, height / 2)
    return
  }

  const energyValues = history.map(h => h.totalEnergy)
  const maxEnergy = Math.max(...energyValues) * 1.1
  const minEnergy = Math.min(...energyValues) * 0.9

  ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()
  }

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom)
  gradient.addColorStop(0, 'rgba(0, 212, 255, 0.4)')
  gradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.1)')
  gradient.addColorStop(1, 'rgba(0, 212, 255, 0)')

  ctx.beginPath()
  const step = chartWidth / (history.length - 1)
  history.forEach((point, i) => {
    const x = padding.left + step * i
    const y = padding.top + chartHeight - ((point.totalEnergy - minEnergy) / (maxEnergy - minEnergy)) * chartHeight
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      const prevX = padding.left + step * (i - 1)
      const prevY = padding.top + chartHeight - ((history[i - 1].totalEnergy - minEnergy) / (maxEnergy - minEnergy)) * chartHeight
      const cpx = (prevX + x) / 2
      ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y)
    }
  })
  ctx.lineTo(width - padding.right, height - padding.bottom)
  ctx.lineTo(padding.left, height - padding.bottom)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()

  ctx.beginPath()
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth = 3
  ctx.shadowColor = '#00d4ff'
  ctx.shadowBlur = 15
  history.forEach((point, i) => {
    const x = padding.left + step * i
    const y = padding.top + chartHeight - ((point.totalEnergy - minEnergy) / (maxEnergy - minEnergy)) * chartHeight
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      const prevX = padding.left + step * (i - 1)
      const prevY = padding.top + chartHeight - ((history[i - 1].totalEnergy - minEnergy) / (maxEnergy - minEnergy)) * chartHeight
      const cpx = (prevX + x) / 2
      ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y)
    }
  })
  ctx.stroke()
  ctx.shadowBlur = 0

  if (store.timelineIndex >= 0 && store.timelineIndex < history.length) {
    const x = padding.left + step * store.timelineIndex
    const point = history[store.timelineIndex]
    const y = padding.top + chartHeight - ((point.totalEnergy - minEnergy) / (maxEnergy - minEnergy)) * chartHeight

    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 107, 53, 0.3)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#ff6b35'
    ctx.fill()
  }

  ctx.fillStyle = '#718096'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i
    const val = maxEnergy - ((maxEnergy - minEnergy) / 4) * i
    ctx.fillText(val.toFixed(0), padding.left - 8, y + 4)
  }
}

function animate(): void {
  drawChart()
  animationId = requestAnimationFrame(animate)
}

onMounted(() => {
  animate()
})

onUnmounted(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.ui-panel {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 320px;
  background: rgba(26, 26, 46, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-right: 1px solid rgba(0, 212, 255, 0.2);
  z-index: 100;
  overflow-y: auto;
  overflow-x: hidden;
  transition: transform 0.3s ease;
}

.ui-panel.collapsed {
  transform: translateX(calc(-100% + 40px));
}

.toggle-btn {
  position: absolute;
  top: 50%;
  right: -20px;
  transform: translateY(-50%);
  width: 40px;
  height: 60px;
  background: rgba(0, 212, 255, 0.15);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-left: none;
  color: #00d4ff;
  cursor: pointer;
  font-size: 18px;
  border-radius: 0 8px 8px 0;
  transition: all 0.3s ease;
  backdrop-filter: blur(12px);
}

.toggle-btn:hover {
  background: rgba(0, 212, 255, 0.3);
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.4);
}

.panel-content {
  padding: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.panel-header h1 {
  font-size: 20px;
  color: #00d4ff;
  margin: 0;
  font-weight: 600;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.status-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00ff88;
  box-shadow: 0 0 8px #00ff88;
}

.status-indicator.medium .dot {
  background: #ffdd00;
  box-shadow: 0 0 8px #ffdd00;
}

.status-indicator.low .dot {
  background: #ff6b35;
  box-shadow: 0 0 8px #ff6b35;
}

.status-indicator.high {
  color: #00ff88;
}

.status-indicator.medium {
  color: #ffdd00;
}

.status-indicator.low {
  color: #ff6b35;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(0, 212, 255, 0.15);
  border-radius: 10px;
  padding: 12px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: rgba(0, 212, 255, 0.4);
  background: rgba(0, 212, 255, 0.05);
}

.stat-label {
  font-size: 11px;
  color: #718096;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #e2e8f0;
  line-height: 1.2;
}

.stat-value.highlight {
  color: #00d4ff;
  text-shadow: 0 0 8px rgba(0, 212, 255, 0.4);
}

.stat-value.warning {
  color: #ff6b35;
  text-shadow: 0 0 8px rgba(255, 107, 53, 0.4);
}

.stat-value.level {
  font-size: 28px;
}

.stat-value.level.level-A { color: #00ff88; text-shadow: 0 0 8px rgba(0, 255, 136, 0.5); }
.stat-value.level.level-B { color: #88ff44; text-shadow: 0 0 8px rgba(136, 255, 68, 0.5); }
.stat-value.level.level-C { color: #ffdd00; text-shadow: 0 0 8px rgba(255, 221, 0, 0.5); }
.stat-value.level.level-D { color: #ff8800; text-shadow: 0 0 8px rgba(255, 136, 0, 0.5); }
.stat-value.level.level-E { color: #ff3333; text-shadow: 0 0 8px rgba(255, 51, 51, 0.5); }

.stat-unit {
  font-size: 11px;
  color: #4a5568;
  margin-top: 2px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-title {
  font-size: 13px;
  color: #a0aec0;
  font-weight: 600;
}

.fps-info {
  font-size: 12px;
  color: #00d4ff;
  font-family: monospace;
}

.chart-section {
  margin-bottom: 24px;
}

.chart-container {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 212, 255, 0.15);
  border-radius: 10px;
  padding: 8px;
  overflow: hidden;
}

.chart-container canvas {
  width: 100%;
  height: auto;
  display: block;
}

.legend-section {
  margin-bottom: 24px;
}

.legend-bar {
  margin-bottom: 12px;
}

.legend-gradient {
  height: 16px;
  border-radius: 8px;
  background: linear-gradient(to right,
    #00ff88 0%,
    #88ff44 25%,
    #ffdd00 50%,
    #ff8800 75%,
    #ff3333 100%
  );
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #718096;
  margin-top: 6px;
}

.level-legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.level-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-color {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  box-shadow: 0 0 6px currentColor;
}

.level-text {
  font-size: 12px;
  color: #cbd5e0;
}

.selected-building {
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.selected-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.selected-icon {
  font-size: 16px;
}

.selected-title {
  font-size: 13px;
  color: #00d4ff;
  font-weight: 600;
}

.detail-card {
  background: rgba(0, 212, 255, 0.05);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 10px;
  padding: 14px;
  backdrop-filter: blur(8px);
  animation: popIn 0.3s ease;
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 12px;
  color: #a0aec0;
}

.detail-value {
  font-size: 13px;
  color: #e2e8f0;
  font-weight: 600;
}

.detail-value.highlight {
  color: #00d4ff;
}

.detail-value.warning {
  color: #ff6b35;
}

.level-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
}

.level-badge.level-A { background: rgba(0, 255, 136, 0.2); color: #00ff88; }
.level-badge.level-B { background: rgba(136, 255, 68, 0.2); color: #88ff44; }
.level-badge.level-C { background: rgba(255, 221, 0, 0.2); color: #ffdd00; }
.level-badge.level-D { background: rgba(255, 136, 0, 0.2); color: #ff8800; }
.level-badge.level-E { background: rgba(255, 51, 51, 0.2); color: #ff3333; }

@media (max-width: 1366px) {
  .ui-panel {
    width: 280px;
  }
  .panel-content {
    padding: 16px;
  }
  .stat-value {
    font-size: 18px;
  }
}
</style>
