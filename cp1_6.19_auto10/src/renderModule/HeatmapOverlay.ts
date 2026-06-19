import * as THREE from 'three'
import { HeatmapPoint, getEnergyRGB } from '@dataModule/types'

export class HeatmapOverlay {
  private scene: THREE.Scene
  private groundPlane: THREE.Mesh | null = null
  private buildingOverlays: Map<string, THREE.Mesh> = new Map()
  private minValue: number
  private maxValue: number
  private groundSize: number

  constructor(scene: THREE.Scene, minValue: number, maxValue: number, groundSize: number = 200) {
    this.scene = scene
    this.minValue = minValue
    this.maxValue = maxValue
    this.groundSize = groundSize
    this.createGroundHeatmap()
  }

  private createGroundHeatmap(): void {
    const geometry = new THREE.PlaneGeometry(this.groundSize, this.groundSize, 64, 64)
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide
    })

    this.groundPlane = new THREE.Mesh(geometry, material)
    this.groundPlane.rotation.x = -Math.PI / 2
    this.groundPlane.position.y = 0.01
    this.groundPlane.renderOrder = 1

    this.createCanvasTexture()
    this.scene.add(this.groundPlane)
  }

  private createCanvasTexture(): void {
    if (!this.groundPlane) return

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)')
    gradient.addColorStop(0.5, 'rgba(0, 150, 100, 0.15)')
    gradient.addColorStop(1, 'rgba(0, 50, 50, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const material = this.groundPlane.material as THREE.MeshBasicMaterial
    material.map = texture
    material.needsUpdate = true
  }

  createBuildingOverlay(
    buildingId: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number
  ): void {
    const geometry = new THREE.PlaneGeometry(width * 1.5, depth * 1.5)
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    })

    const overlay = new THREE.Mesh(geometry, material)
    overlay.rotation.x = -Math.PI / 2
    overlay.position.set(x, height + 0.05, z)
    overlay.renderOrder = 2

    this.scene.add(overlay)
    this.buildingOverlays.set(buildingId, overlay)
  }

  updateBuildingHeat(buildingId: string, energyValue: number): void {
    const overlay = this.buildingOverlays.get(buildingId)
    if (!overlay) return

    const rgb = getEnergyRGB(energyValue, this.minValue, this.maxValue)
    const material = overlay.material as THREE.MeshBasicMaterial

    const targetColor = new THREE.Color(rgb.r, rgb.g, rgb.b)
    const currentColor = material.color
    currentColor.lerp(targetColor, 0.15)

    const targetOpacity = 0.4 + (energyValue - this.minValue) / (this.maxValue - this.minValue) * 0.4
    material.opacity += (targetOpacity - material.opacity) * 0.15

    material.needsUpdate = true
  }

  updateGroundHeatmap(points: HeatmapPoint[]): void {
    if (!this.groundPlane) return

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = 'rgba(10, 20, 40, 0)'
    ctx.fillRect(0, 0, 512, 512)

    const halfSize = this.groundSize / 2

    points.forEach(point => {
      const px = ((point.x + halfSize) / this.groundSize) * 512
      const py = ((point.z + halfSize) / this.groundSize) * 512
      const radius = (point.radius / this.groundSize) * 512

      const rgb = getEnergyRGB(point.value, this.minValue, this.maxValue)
      const r = Math.floor(rgb.r * 255)
      const g = Math.floor(rgb.g * 255)
      const b = Math.floor(rgb.b * 255)

      const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius)
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`)
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.2)`)
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(px, py, radius, 0, Math.PI * 2)
      ctx.fill()
    })

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const material = this.groundPlane.material as THREE.MeshBasicMaterial
    if (material.map) {
      (material.map as THREE.Texture).dispose()
    }
    material.map = texture
    material.needsUpdate = true
  }

  setValueRange(min: number, max: number): void {
    this.minValue = min
    this.maxValue = max
  }

  dispose(): void {
    if (this.groundPlane) {
      this.scene.remove(this.groundPlane)
      const geom = this.groundPlane.geometry as THREE.BufferGeometry
      geom.dispose()
      const mat = this.groundPlane.material as THREE.Material
      if ((mat as any).map) {
        ((mat as any).map as THREE.Texture).dispose()
      }
      mat.dispose()
    }

    this.buildingOverlays.forEach(overlay => {
      this.scene.remove(overlay)
      const geom = overlay.geometry as THREE.BufferGeometry
      geom.dispose()
      const mat = overlay.material as THREE.Material
      mat.dispose()
    })
    this.buildingOverlays.clear()
  }
}
