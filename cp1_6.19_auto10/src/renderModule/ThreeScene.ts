import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BuildingData, EnergySnapshot, HeatmapPoint, getEnergyRGB } from '@dataModule/types'
import { HeatmapOverlay } from './HeatmapOverlay'

interface BuildingMesh {
  mesh: THREE.Mesh
  edges: THREE.LineSegments
  id: string
  targetColor: THREE.Color
}

type BuildingClickCallback = (building: BuildingData | null) => void

export class ThreeScene {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private buildingMeshes: Map<string, BuildingMesh> = new Map()
  private buildingData: Map<string, BuildingData> = new Map()
  private heatmapOverlay: HeatmapOverlay | null = null
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private selectedBuilding: string | null = null
  private animationFrameId: number | null = null
  private clickCallback: BuildingClickCallback | null = null
  private fpsCallback: ((fps: number) => void) | null = null
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private fpsUpdateTime: number = 0
  private minEnergy: number
  private maxEnergy: number
  private groundSize: number
  private qualityLevel: 'high' | 'medium' | 'low' = 'high'
  private directionalLight: THREE.DirectionalLight | null = null
  private ambientLight: THREE.AmbientLight | null = null
  private gridHelper: THREE.GridHelper | null = null

  constructor(
    container: HTMLElement,
    minEnergy: number,
    maxEnergy: number,
    groundSize: number = 200
  ) {
    this.container = container
    this.minEnergy = minEnergy
    this.maxEnergy = maxEnergy
    this.groundSize = groundSize
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)
    this.scene.fog = new THREE.Fog(0x1a1a2e, groundSize * 0.8, groundSize * 1.5)

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0

    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 20
    this.controls.maxDistance = groundSize
    this.controls.maxPolarAngle = Math.PI / 2.2

    this.setupLights()
    this.setupGround()
    this.setupHeatmapOverlay()
    this.setupEventListeners()

    this.setCameraInitialPosition()
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404080, 0.4)
    this.scene.add(this.ambientLight)

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    this.directionalLight.position.set(80, 120, 60)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 2048
    this.directionalLight.shadow.mapSize.height = 2048
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 500
    this.directionalLight.shadow.camera.left = -this.groundSize / 2
    this.directionalLight.shadow.camera.right = this.groundSize / 2
    this.directionalLight.shadow.camera.top = this.groundSize / 2
    this.directionalLight.shadow.camera.bottom = -this.groundSize / 2
    this.scene.add(this.directionalLight)

    const hemiLight = new THREE.HemisphereLight(0x00d4ff, 0x1a1a2e, 0.3)
    this.scene.add(hemiLight)
  }

  private setupGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(this.groundSize, this.groundSize)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f0f20,
      roughness: 0.9,
      metalness: 0.1
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    this.gridHelper = new THREE.GridHelper(this.groundSize, 50, 0x00d4ff, 0x0a3a4a)
    this.gridHelper.position.y = 0.001
    ;(this.gridHelper.material as THREE.Material).opacity = 0.3
    ;(this.gridHelper.material as THREE.Material).transparent = true
    this.scene.add(this.gridHelper)
  }

  private setupHeatmapOverlay(): void {
    this.heatmapOverlay = new HeatmapOverlay(this.scene, this.minEnergy, this.maxEnergy, this.groundSize)
  }

  private setCameraInitialPosition(): void {
    const distance = this.groundSize * 0.7
    this.camera.position.set(distance * 0.7, distance * 0.7, distance * 0.7)
    this.camera.lookAt(0, 0, 0)
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize)
    this.renderer.domElement.addEventListener('click', this.handleClick)
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove)
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private handleClick = (event: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)

    const meshes = Array.from(this.buildingMeshes.values()).map(bm => bm.mesh)
    const intersects = this.raycaster.intersectObjects(meshes)

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh
      const buildingId = mesh.userData.buildingId as string
      this.selectBuilding(buildingId)
    } else {
      this.selectBuilding(null)
    }
  }

  private handlePointerMove = (event: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  private selectBuilding(buildingId: string | null): void {
    if (this.selectedBuilding === buildingId) {
      this.selectedBuilding = null
      this.clickCallback?.(null)
      this.updateBuildingSelectionVisual(null)
      return
    }

    this.selectedBuilding = buildingId
    this.updateBuildingSelectionVisual(buildingId)

    if (buildingId) {
      const data = this.buildingData.get(buildingId)
      this.clickCallback?.(data ?? null)
    } else {
      this.clickCallback?.(null)
    }
  }

  private updateBuildingSelectionVisual(selectedId: string | null): void {
    this.buildingMeshes.forEach((bm, id) => {
      const isSelected = id === selectedId
      bm.edges.visible = isSelected

      const edgeMat = bm.edges.material as THREE.LineBasicMaterial
      edgeMat.color.set(isSelected ? 0x00d4ff : 0xffffff)
      edgeMat.opacity = isSelected ? 1.0 : 0.3

      bm.mesh.scale.setScalar(isSelected ? 1.02 : 1.0)
    })
  }

  createBuildings(buildings: BuildingData[]): void {
    buildings.forEach(b => {
      this.buildingData.set(b.id, b)
      this.createBuildingMesh(b)
    })

    const groundPoints: HeatmapPoint[] = buildings.map(b => ({
      x: b.position.x,
      z: b.position.z,
      value: b.energyConsumption,
      radius: Math.max(b.width, b.depth) * 2
    }))
    this.heatmapOverlay?.updateGroundHeatmap(groundPoints)
  }

  private createBuildingMesh(building: BuildingData): void {
    const useLowDetail = this.buildingMeshes.size > 150

    const geometry = useLowDetail
      ? new THREE.BoxGeometry(building.width, building.height, building.depth)
      : this.createDetailedBoxGeometry(building.width, building.height, building.depth)

    const rgb = getEnergyRGB(building.energyConsumption, this.minEnergy, this.maxEnergy)
    const color = new THREE.Color(rgb.r, rgb.g, rgb.b)

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.6,
      transparent: true,
      opacity: 0.9
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(building.position.x, building.height / 2, building.position.z)
    mesh.castShadow = this.qualityLevel !== 'low'
    mesh.receiveShadow = this.qualityLevel !== 'low'
    mesh.userData.buildingId = building.id

    const edgeGeometry = new THREE.EdgesGeometry(geometry)
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3
    })
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial)
    edges.visible = false
    mesh.add(edges)

    this.scene.add(mesh)
    this.buildingMeshes.set(building.id, {
      mesh,
      edges,
      id: building.id,
      targetColor: color.clone()
    })

    this.heatmapOverlay?.createBuildingOverlay(
      building.id,
      building.position.x,
      building.position.z,
      building.width,
      building.depth,
      building.height
    )
  }

  private createDetailedBoxGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(width, height, depth, 1, Math.max(1, Math.floor(height / 5)), 1)

    const positions = geometry.attributes.position
    const colors: number[] = []

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i)
      const t = (y + height / 2) / height
      colors.push(0.8 + t * 0.2, 0.8 + t * 0.2, 1.0)
    }

    return geometry
  }

  updateData(snapshot: EnergySnapshot): void {
    snapshot.buildings.forEach(b => {
      this.buildingData.set(b.id, b)
      this.updateBuildingVisual(b)
    })

    const groundPoints: HeatmapPoint[] = snapshot.buildings.map(b => ({
      x: b.position.x,
      z: b.position.z,
      value: b.energyConsumption,
      radius: Math.max(b.width, b.depth) * 2
    }))
    this.heatmapOverlay?.updateGroundHeatmap(groundPoints)
  }

  private updateBuildingVisual(building: BuildingData): void {
    const bm = this.buildingMeshes.get(building.id)
    if (!bm) return

    const rgb = getEnergyRGB(building.energyConsumption, this.minEnergy, this.maxEnergy)
    bm.targetColor.set(rgb.r, rgb.g, rgb.b)
    this.heatmapOverlay?.updateBuildingHeat(building.id, building.energyConsumption)
  }

  private animateColorTransitions(): void {
    this.buildingMeshes.forEach(bm => {
      const material = bm.mesh.material as THREE.MeshStandardMaterial
      material.color.lerp(bm.targetColor, 0.1)
    })
  }

  setQualityLevel(level: 'high' | 'medium' | 'low'): void {
    if (this.qualityLevel === level) return
    this.qualityLevel = level

    const shadowEnabled = level !== 'low'
    this.renderer.shadowMap.enabled = shadowEnabled
    if (this.directionalLight) {
      this.directionalLight.castShadow = shadowEnabled
    }

    this.buildingMeshes.forEach((bm, id) => {
      const data = this.buildingData.get(id)
      if (!data) return

      const isFar = this.camera.position.distanceTo(bm.mesh.position) > this.groundSize * 0.5
      const shouldReduce = level === 'low' || (level === 'medium' && isFar)

      bm.mesh.castShadow = !shouldReduce && shadowEnabled
      bm.mesh.receiveShadow = !shouldReduce && shadowEnabled
    })

    if (this.gridHelper) {
      ;(this.gridHelper.material as THREE.Material).opacity = level === 'low' ? 0.1 : 0.3
    }
  }

  onBuildingClick(callback: BuildingClickCallback): void {
    this.clickCallback = callback
  }

  onFpsUpdate(callback: (fps: number) => void): void {
    this.fpsCallback = callback
  }

  private updateFPS(currentTime: number): void {
    this.frameCount++
    if (currentTime - this.fpsUpdateTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.fpsUpdateTime))
      this.fpsCallback?.(fps)
      this.frameCount = 0
      this.fpsUpdateTime = currentTime
    }
  }

  start(): void {
    this.fpsUpdateTime = performance.now()
    const animate = (): void => {
      this.animationFrameId = requestAnimationFrame(animate)
      const currentTime = performance.now()
      this.updateFPS(currentTime)
      this.animateColorTransitions()
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.handleResize)
    this.renderer.domElement.removeEventListener('click', this.handleClick)
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove)

    this.buildingMeshes.forEach(bm => {
      this.scene.remove(bm.mesh)
      const geom = bm.mesh.geometry as THREE.BufferGeometry
      geom.dispose()
      const mat = bm.mesh.material as THREE.Material
      mat.dispose()
      bm.edges.geometry.dispose()
      ;(bm.edges.material as THREE.Material).dispose()
    })
    this.buildingMeshes.clear()

    this.heatmapOverlay?.dispose()
    this.controls.dispose()
    this.renderer.dispose()

    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
