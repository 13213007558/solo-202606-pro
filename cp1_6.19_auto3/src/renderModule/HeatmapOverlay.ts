import * as THREE from 'three'
import { HEATMAP_CONFIG } from '@/dataModule/types'
import type { BuildingData } from '@/dataModule/types'

export class HeatmapOverlay {
  private scene: THREE.Scene
  private heatPlanes: Map<string, THREE.Mesh> = new Map()
  private groundHeatTexture: THREE.CanvasTexture | null = null
  private groundHeatPlane: THREE.Mesh | null = null
  private gridSize = 100

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.createGroundHeatmap()
  }

  private createGroundHeatmap(): void {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    this.groundHeatTexture = new THREE.CanvasTexture(canvas)
    this.groundHeatTexture.needsUpdate = true

    const geometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize)
    const material = new THREE.MeshBasicMaterial({
      map: this.groundHeatTexture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    })

    this.groundHeatPlane = new THREE.Mesh(geometry, material)
    this.groundHeatPlane.rotation.x = -Math.PI / 2
    this.groundHeatPlane.position.y = 0.01
    this.groundHeatPlane.renderOrder = 1
    this.scene.add(this.groundHeatPlane)
  }

  createBuildingHeatPlanes(buildings: BuildingData[]): void {
    this.clearBuildingHeatPlanes()

    buildings.forEach((building) => {
      const width = building.width * 1.2
      const depth = building.depth * 1.2

      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')!

      const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 32)
      const color = this.getHeatColor(building.energyConsumption)
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, 'rgba(0,0,0,0)')

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 64, 64)

      const texture = new THREE.CanvasTexture(canvas)
      texture.needsUpdate = true

      const geometry = new THREE.PlaneGeometry(width, depth)
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide
      })

      const plane = new THREE.Mesh(geometry, material)
      plane.position.set(
        building.position.x,
        building.height + 0.5,
        building.position.z
      )
      plane.rotation.x = -Math.PI / 2
      plane.renderOrder = 2

      this.scene.add(plane)
      this.heatPlanes.set(building.id, plane)
    })
  }

  updateBuildingHeat(buildings: BuildingData[]): void {
    buildings.forEach((building) => {
      const plane = this.heatPlanes.get(building.id)
      if (plane && plane.material instanceof THREE.MeshBasicMaterial && plane.material.map) {
        const texture = plane.material.map as THREE.CanvasTexture
        const canvas = texture.image as HTMLCanvasElement
        const ctx = canvas.getContext('2d')!

        ctx.clearRect(0, 0, 64, 64)
        const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 32)
        const color = this.getHeatColor(building.energyConsumption)
        gradient.addColorStop(0, color)
        gradient.addColorStop(1, 'rgba(0,0,0,0)')

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 64, 64)

        texture.needsUpdate = true
      }
    })

    this.updateGroundHeatmap(buildings)
  }

  private updateGroundHeatmap(buildings: BuildingData[]): void {
    if (!this.groundHeatTexture) return

    const canvas = this.groundHeatTexture.image as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, 256, 256)

    buildings.forEach((building) => {
      const x = ((building.position.x + this.gridSize / 2) / this.gridSize) * 256
      const y = ((building.position.z + this.gridSize / 2) / this.gridSize) * 256
      const radius = (building.energyConsumption / 100) * 40 + 10

      const gradient = ctx.createRadialGradient(x, y, 2, x, y, radius)
      const color = this.getHeatColorRGB(building.energyConsumption)
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`)
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

      ctx.fillStyle = gradient
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    })

    this.groundHeatTexture.needsUpdate = true
  }

  private getHeatColor(value: number): string {
    const { minValue, maxValue, colorStops } = HEATMAP_CONFIG
    const normalizedValue = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)))

    for (let i = 0; i < colorStops.length - 1; i++) {
      const stop1 = colorStops[i]
      const stop2 = colorStops[i + 1]
      const t1 = (stop1.value - minValue) / (maxValue - minValue)
      const t2 = (stop2.value - minValue) / (maxValue - minValue)

      if (normalizedValue >= t1 && normalizedValue <= t2) {
        const t = (normalizedValue - t1) / (t2 - t1)
        return this.interpolateColor(stop1.color, stop2.color, t)
      }
    }

    return colorStops[colorStops.length - 1].color
  }

  private getHeatColorRGB(value: number): { r: number; g: number; b: number } {
    const hex = this.getHeatColor(value)
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 255, b: 136 }
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1)
    const c2 = this.hexToRgb(color2)

    const r = Math.round(c1.r + (c2.r - c1.r) * t)
    const g = Math.round(c1.g + (c2.g - c1.g) * t)
    const b = Math.round(c1.b + (c2.b - c1.b) * t)

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 }
  }

  clearBuildingHeatPlanes(): void {
    this.heatPlanes.forEach((plane) => {
      this.scene.remove(plane)
      if (plane.geometry) plane.geometry.dispose()
      const material = plane.material as THREE.MeshBasicMaterial
      if (material) {
        if (material.map) material.map.dispose()
        material.dispose()
      }
    })
    this.heatPlanes.clear()
  }

  dispose(): void {
    this.clearBuildingHeatPlanes()
    if (this.groundHeatPlane) {
      this.scene.remove(this.groundHeatPlane)
      this.groundHeatPlane.geometry.dispose()
      const material = this.groundHeatPlane.material as THREE.MeshBasicMaterial
      if (material) {
        if (material.map) {
          material.map.dispose()
        }
        material.dispose()
      }
    }
  }
}
