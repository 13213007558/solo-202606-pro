import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { HeatmapOverlay } from './HeatmapOverlay'
import { HEATMAP_CONFIG } from '@/dataModule/types'
import type { BuildingData, IDataSimulator } from '@/dataModule/types'

interface BuildingMesh {
  mesh: THREE.Mesh
  id: string
  originalColor: THREE.Color
  targetColor: THREE.Color
  lod: THREE.LOD
}

export class ThreeScene {
  private container: HTMLElement | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private controls: OrbitControls | null = null
  private heatmapOverlay: HeatmapOverlay | null = null
  private buildingMeshes: Map<string, BuildingMesh> = new Map()
  private animationFrameId: number | null = null
  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private mouse: THREE.Vector2 = new THREE.Vector2()
  private onBuildingClickCallback: ((building: BuildingData) => void) | null = null
  private simulator: IDataSimulator | null = null
  private currentBuildings: BuildingData[] = []

  private fps = 60
  private frameCount = 0
  private lastFpsUpdate = 0
  private fpsCallback: ((fps: number) => void) | null = null

  private shadowQuality = 'high' as 'high' | 'medium' | 'low' | 'off'
  private buildingCount = 100
  private lodDistance = 80

  private selectedOutline: THREE.Mesh | null = null

  constructor(simulator: IDataSimulator) {
    this.simulator = simulator
  }

  init(container: HTMLElement): void {
    this.container = container

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)
    this.scene.fog = new THREE.Fog(0x1a1a2e, 100, 300)

    const width = container.clientWidth
    const height = container.clientHeight

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    this.camera.position.set(60, 60, 60)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.screenSpacePanning = true
    this.controls.minDistance = 20
    this.controls.maxDistance = 200
    this.controls.maxPolarAngle = Math.PI / 2.1
    this.controls.target.set(0, 0, 0)

    this.setupLights()
    this.createGround()

    this.heatmapOverlay = new HeatmapOverlay(this.scene)

    const buildings = this.simulator?.getBuildings() || []
    this.buildingCount = buildings.length
    this.createBuildings(buildings)
    this.heatmapOverlay.createBuildingHeatPlanes(buildings)
    this.currentBuildings = buildings

    this.animate()
    this.setupEventListeners()
  }

  private setupLights(): void {
    if (!this.scene) return

    const ambientLight = new THREE.AmbientLight(0x404060, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2)
    directionalLight.position.set(50, 80, 30)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 500
    directionalLight.shadow.camera.left = -100
    directionalLight.shadow.camera.right = 100
    directionalLight.shadow.camera.top = 100
    directionalLight.shadow.camera.bottom = -100
    directionalLight.shadow.bias = -0.0001

    this.scene.add(directionalLight)

    const fillLight = new THREE.DirectionalLight(0x00d4ff, 0.2)
    fillLight.position.set(-30, 20, -30)
    this.scene.add(fillLight)

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d59, 0.4)
    this.scene.add(hemisphereLight)
  }

  private createGround(): void {
    if (!this.scene) return

    const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e1e3a,
      roughness: 0.9,
      metalness: 0.1
    })

    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    const gridHelper = new THREE.GridHelper(200, 50, 0x2a2a4a, 0x222244)
    this.scene.add(gridHelper)
  }

  private createBuildings(buildings: BuildingData[]): void {
    if (!this.scene) return

    buildings.forEach((building) => {
      const lod = new THREE.LOD()

      const highDetailGeo = new THREE.BoxGeometry(building.width, building.height, building.depth)
      const highDetailMat = new THREE.MeshStandardMaterial({
        color: this.getBuildingColor(building.energyConsumption),
        roughness: 0.7,
        metalness: 0.2
      })
      const highMesh = new THREE.Mesh(highDetailGeo, highDetailMat)
      highMesh.castShadow = true
      highMesh.receiveShadow = true
      highMesh.position.y = building.height / 2
      lod.addLevel(highMesh, 0)

      const lowDetailGeo = new THREE.BoxGeometry(building.width, building.height, building.depth, 1, 1, 1)
      const lowDetailMat = new THREE.MeshStandardMaterial({
        color: this.getBuildingColor(building.energyConsumption),
        roughness: 0.7,
        metalness: 0.2
      })
      const lowMesh = new THREE.Mesh(lowDetailGeo, lowDetailMat)
      lowMesh.castShadow = false
      lowMesh.receiveShadow = true
      lowMesh.position.y = building.height / 2
      lod.addLevel(lowMesh, this.lodDistance)

      lod.position.set(building.position.x, 0, building.position.z)
      lod.userData = { buildingId: building.id }

      this.scene!.add(lod)

      const color = new THREE.Color(this.getBuildingColor(building.energyConsumption))
      this.buildingMeshes.set(building.id, {
        mesh: highMesh,
        id: building.id,
        originalColor: color.clone(),
        targetColor: color.clone(),
        lod
      })
    })
  }

  private getBuildingColor(value: number): string {
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

  updateBuildings(buildings: BuildingData[]): void {
    this.currentBuildings = buildings

    buildings.forEach((building) => {
      const buildingMesh = this.buildingMeshes.get(building.id)
      if (buildingMesh) {
        const targetColor = new THREE.Color(this.getBuildingColor(building.energyConsumption))
        buildingMesh.targetColor = targetColor
      }
    })

    if (this.heatmapOverlay) {
      this.heatmapOverlay.updateBuildingHeat(buildings)
    }
  }

  private setupEventListeners(): void {
    if (!this.renderer || !this.container) return

    this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this))
    window.addEventListener('resize', this.onResize.bind(this))
  }

  private onMouseClick(event: MouseEvent): void {
    if (!this.container || !this.camera || !this.scene) return

    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    const meshes: THREE.Object3D[] = []
    this.buildingMeshes.forEach((bm) => {
      meshes.push(bm.lod)
    })

    const intersects = this.raycaster.intersectObjects(meshes, true)

    if (intersects.length > 0) {
      let object: THREE.Object3D | null = intersects[0].object
      while (object && !object.userData?.buildingId) {
        object = object.parent
      }

      if (object?.userData?.buildingId) {
        const buildingId = object.userData.buildingId
        const building = this.currentBuildings.find((b) => b.id === buildingId)

        if (building) {
          this.highlightBuilding(buildingId)
          if (this.onBuildingClickCallback) {
            this.onBuildingClickCallback(building)
          }
        }
      }
    } else {
      this.clearHighlight()
    }
  }

  private highlightBuilding(buildingId: string): void {
    this.clearHighlight()

    const buildingMesh = this.buildingMeshes.get(buildingId)
    if (!buildingMesh || !this.scene) return

    const building = this.currentBuildings.find((b) => b.id === buildingId)
    if (!building) return

    const outlineGeo = new THREE.BoxGeometry(
      building.width * 1.1,
      building.height * 1.05,
      building.depth * 1.1
    )
    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    })

    this.selectedOutline = new THREE.Mesh(outlineGeo, outlineMat)
    this.selectedOutline.position.set(
      building.position.x,
      building.height / 2,
      building.position.z
    )
    this.scene.add(this.selectedOutline)
  }

  private clearHighlight(): void {
    if (this.selectedOutline && this.scene) {
      this.scene.remove(this.selectedOutline)
      this.selectedOutline.geometry.dispose()
      if (this.selectedOutline.material instanceof THREE.Material) {
        this.selectedOutline.material.dispose()
      }
      this.selectedOutline = null
    }
  }

  private onResize(): void {
    if (!this.container || !this.camera || !this.renderer) return

    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this))

    const now = performance.now()
    this.frameCount++

    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastFpsUpdate = now
      if (this.fpsCallback) {
        this.fpsCallback(this.fps)
      }
      this.adjustQuality()
    }

    this.updateBuildingColors()

    if (this.controls) {
      this.controls.update()
    }

    if (this.selectedOutline) {
      this.selectedOutline.rotation.y += 0.002
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera)
    }
  }

  private updateBuildingColors(): void {
    this.buildingMeshes.forEach((bm) => {
      const material = bm.mesh.material as THREE.MeshStandardMaterial
      if (material.color) {
        material.color.lerp(bm.targetColor, 0.05)
      }

      bm.lod.levels.forEach((level) => {
        const mesh = level.object as THREE.Mesh
        const mat = mesh.material as THREE.MeshStandardMaterial
        if (mat.color) {
          mat.color.copy(material.color)
        }
      })
    })
  }

  private adjustQuality(): void {
    if (!this.renderer) return

    if (this.buildingCount > 150 && this.fps < 35) {
      if (this.shadowQuality !== 'low') {
        this.shadowQuality = 'low'
        this.applyShadowQuality()
      }
    } else if (this.buildingCount > 100 && this.fps < 45) {
      if (this.shadowQuality !== 'medium') {
        this.shadowQuality = 'medium'
        this.applyShadowQuality()
      }
    } else if (this.fps > 55) {
      if (this.shadowQuality !== 'high') {
        this.shadowQuality = 'high'
        this.applyShadowQuality()
      }
    }
  }

  private applyShadowQuality(): void {
    if (!this.scene) return

    this.buildingMeshes.forEach((bm) => {
      if (this.shadowQuality === 'off') {
        bm.mesh.castShadow = false
      } else {
        bm.mesh.castShadow = true
      }
    })

    if (this.shadowQuality === 'low') {
      this.lodDistance = 50
    } else if (this.shadowQuality === 'medium') {
      this.lodDistance = 70
    } else {
      this.lodDistance = 100
    }
  }

  onBuildingClick(callback: (building: BuildingData) => void): void {
    this.onBuildingClickCallback = callback
  }

  onFpsUpdate(callback: (fps: number) => void): void {
    this.fpsCallback = callback
  }

  setTimeIndex(_index: number): void {
    // 时间回溯由 dataSimulator 处理，这里只更新建筑
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }

    window.removeEventListener('resize', this.onResize.bind(this))

    this.buildingMeshes.forEach((bm) => {
      bm.lod.levels.forEach((level) => {
        if (level.object instanceof THREE.Mesh) {
          level.object.geometry.dispose()
          if (level.object.material instanceof THREE.Material) {
            level.object.material.dispose()
          }
        }
      })
    })

    this.buildingMeshes.clear()

    if (this.heatmapOverlay) {
      this.heatmapOverlay.dispose()
    }

    if (this.renderer) {
      this.renderer.dispose()
      this.renderer.domElement.remove()
    }

    if (this.controls) {
      this.controls.dispose()
    }

    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = null
    this.container = null
  }
}
