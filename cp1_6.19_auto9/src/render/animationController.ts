import * as THREE from 'three'
import { Projectile, Explosion, TowerType } from '../data/types'

export class ObjectPool<T extends THREE.Object3D> {
  private pool: T[] = []
  private factory: () => T

  constructor(factory: () => T, initialSize = 20) {
    this.factory = factory
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory())
    }
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.factory()
  }

  release(obj: T): void {
    obj.visible = false
    this.pool.push(obj)
  }

  releaseAll(objs: T[]): void {
    objs.forEach(o => this.release(o))
  }
}

export function getTowerColor(type: TowerType, level: number): string {
  const baseColors: Record<TowerType, string[]> = {
    laser: ['#ff4444', '#ff6633', '#ffaa00'],
    missile: ['#4488ff', '#33aaff', '#00ddff'],
    electromagnetic: ['#aa44ff', '#cc66ff', '#ee99ff'],
  }
  return baseColors[type][Math.min(level - 1, 2)]
}

export function getTowerEmissive(type: TowerType, level: number): string {
  const emissive: Record<TowerType, string[]> = {
    laser: ['#ff2200', '#ff4400', '#ff8800'],
    missile: ['#2244aa', '#1166cc', '#0088ee'],
    electromagnetic: ['#6611aa', '#8833cc', '#aa55ee'],
  }
  return emissive[type][Math.min(level - 1, 2)]
}

export function createLaserBeam(from: THREE.Vector3, to: THREE.Vector3, color: string): THREE.Line {
  const points = [from.clone(), to.clone()]
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, linewidth: 2 })
  const line = new THREE.Line(geometry, material)
  ;(line.userData as { createdAt: number }).createdAt = performance.now()
  return line
}

export function createExplosionMesh(color: string): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1, 16, 16)
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.visible = false
  return mesh
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpVec3(a: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  out.x = lerp(a.x, b.x, t)
  out.y = lerp(a.y, b.y, t)
  out.z = lerp(a.z, b.z, t)
  return out
}

export class AnimationManager {
  private scene: THREE.Scene
  private projectilePool: ObjectPool<THREE.Mesh>
  private explosionPool: ObjectPool<THREE.Mesh>
  private activeProjectiles: Map<string, THREE.Mesh> = new Map()
  private activeExplosions: Map<string, THREE.Mesh> = new Map()
  private laserLines: THREE.Line[] = []

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.projectilePool = new ObjectPool(() => {
      const geo = new THREE.SphereGeometry(0.15, 8, 8)
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.visible = false
      return mesh
    }, 50)

    this.explosionPool = new ObjectPool(() => createExplosionMesh('#ffffff'), 20)
  }

  updateProjectiles(projectiles: Projectile[]): void {
    const activeIds = new Set<string>()

    projectiles.forEach(p => {
      activeIds.add(p.id)
      let mesh = this.activeProjectiles.get(p.id)
      if (!mesh) {
        mesh = this.projectilePool.acquire()
        mesh.visible = true
        const color = p.type === 'laser' ? 0xff6633 : p.type === 'missile' ? 0x44aaff : 0xaa66ff
        ;(mesh.material as THREE.MeshBasicMaterial).color.setHex(color)
        this.scene.add(mesh)
        this.activeProjectiles.set(p.id, mesh)
      }

      const from = new THREE.Vector3(p.from.x, p.from.y, p.from.z)
      const to = new THREE.Vector3(p.to.x, p.to.y, p.to.z)
      const pos = from.lerp(to, p.progress)
      mesh.position.copy(pos)
      mesh.scale.setScalar(p.type === 'missile' ? 2 : p.type === 'electromagnetic' ? 1.5 : 1)
    })

    this.activeProjectiles.forEach((mesh, id) => {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh)
        this.projectilePool.release(mesh)
        this.activeProjectiles.delete(id)
      }
    })
  }

  updateExplosions(explosions: Explosion[]): void {
    const activeIds = new Set<string>()

    explosions.forEach(e => {
      activeIds.add(e.id)
      let mesh = this.activeExplosions.get(e.id)
      if (!mesh) {
        mesh = this.explosionPool.acquire()
        mesh.visible = true
        ;(mesh.material as THREE.MeshBasicMaterial).color.set(e.color)
        mesh.position.set(e.position.x, e.position.y, e.position.z)
        this.scene.add(mesh)
        this.activeExplosions.set(e.id, mesh)
      }

      const scale = e.maxRadius * (0.3 + e.progress * 1.5)
      mesh.scale.setScalar(scale)
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - e.progress)
    })

    this.activeExplosions.forEach((mesh, id) => {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh)
        this.explosionPool.release(mesh)
        this.activeExplosions.delete(id)
      }
    })
  }

  updateLasers(projectiles: Projectile[]): void {
    this.laserLines.forEach(line => {
      this.scene.remove(line)
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    })
    this.laserLines = []

    projectiles.forEach(p => {
      if (p.type === 'laser' && p.progress < 0.5) {
        const from = new THREE.Vector3(p.from.x, p.from.y, p.from.z)
        const to = new THREE.Vector3(p.to.x, p.to.y, p.to.z)
        const line = createLaserBeam(from, to, '#ff5522')
        this.scene.add(line)
        this.laserLines.push(line)
      }
    })
  }

  dispose(): void {
    this.activeProjectiles.forEach(m => {
      this.scene.remove(m)
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    })
    this.activeExplosions.forEach(m => {
      this.scene.remove(m)
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    })
    this.laserLines.forEach(line => {
      this.scene.remove(line)
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    })
  }
}
