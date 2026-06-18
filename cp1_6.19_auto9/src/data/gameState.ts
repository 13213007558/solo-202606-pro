import {
  Planet, Tower, Enemy, Projectile, Explosion, PlayerState, TechNode,
  Vector3, TowerType, PlanetType, EnemyType, GamePhase,
  TOWER_STATS, ENEMY_STATS, INITIAL_TECH_TREE, GameStateSnapshot
} from './types'
import { generateWaves } from './enemySpawner'

type Listener = (snapshot: GameStateSnapshot) => void

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function dist3D(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function createInitialPlanets(): Planet[] {
  const configs: Array<{ id: string; name: string; type: PlanetType; pos: Vector3; size: number }> = [
    { id: 'p0', name: '起源星', type: 'endpoint', pos: { x: -35, y: 0, z: 0 }, size: 3.5 },
    { id: 'p1', name: '熔岩星', type: 'mineral', pos: { x: -20, y: 12, z: 5 }, size: 2.5 },
    { id: 'p2', name: '冰晶星', type: 'energy', pos: { x: -22, y: -10, z: -3 }, size: 2.2 },
    { id: 'p3', name: '要塞星', type: 'military', pos: { x: -5, y: 15, z: -8 }, size: 3.0 },
    { id: 'p4', name: '曙光星', type: 'neutral', pos: { x: 0, y: 0, z: 0 }, size: 2.8 },
    { id: 'p5', name: '雷霆星', type: 'energy', pos: { x: 8, y: -12, z: 6 }, size: 2.3 },
    { id: 'p6', name: '赤金星', type: 'mineral', pos: { x: 15, y: 10, z: -5 }, size: 2.6 },
    { id: 'p7', name: '风暴星', type: 'military', pos: { x: 18, y: -8, z: 10 }, size: 2.7 },
    { id: 'p8', name: '虚空星', type: 'neutral', pos: { x: 25, y: 5, z: -2 }, size: 2.4 },
    { id: 'p9', name: '终焉星', type: 'endpoint', pos: { x: 40, y: 0, z: 0 }, size: 3.8 },
  ]

  const connections: Record<string, string[]> = {
    p0: ['p1', 'p2'],
    p1: ['p0', 'p3', 'p4'],
    p2: ['p0', 'p4', 'p5'],
    p3: ['p1', 'p6'],
    p4: ['p1', 'p2', 'p6', 'p5'],
    p5: ['p2', 'p4', 'p7'],
    p6: ['p3', 'p4', 'p8'],
    p7: ['p5', 'p8', 'p9'],
    p8: ['p6', 'p7', 'p9'],
    p9: ['p8', 'p7'],
  }

  const colorMap: Record<PlanetType, { color: string; glow: string }> = {
    mineral: { color: '#ff8c42', glow: '#ffaa55' },
    energy: { color: '#4fc3f7', glow: '#66d9ff' },
    military: { color: '#ef5350', glow: '#ff6b6b' },
    neutral: { color: '#ab47bc', glow: '#ce93d8' },
    endpoint: { color: '#ffd700', glow: '#ffea00' },
  }

  return configs.map(cfg => {
    const colors = colorMap[cfg.type]
    const isEndpoint = cfg.type === 'endpoint'
    const baseHp = isEndpoint ? 500 : 150
    return {
      id: cfg.id,
      name: cfg.name,
      type: cfg.type,
      position: cfg.pos,
      size: cfg.size,
      color: colors.color,
      glowColor: colors.glow,
      maxHp: baseHp,
      currentHp: baseHp,
      goldPerSecond: cfg.type === 'mineral' ? 5 : cfg.type === 'endpoint' ? 2 : 1,
      energyPerSecond: cfg.type === 'energy' ? 4 : cfg.type === 'endpoint' ? 1 : 0.5,
      connections: connections[cfg.id] || [],
      towers: [],
      maxTowers: cfg.type === 'military' ? 5 : cfg.type === 'endpoint' ? 4 : 3,
      techBonusActive: false,
    }
  })
}

export class GameState {
  private planets: Planet[] = []
  private enemies: Enemy[] = []
  private projectiles: Projectile[] = []
  private explosions: Explosion[] = []
  private player: PlayerState
  private techTree: TechNode[] = []
  private listeners: Set<Listener> = new Set()
  private enemySpawnQueue: Array<{ spawnAt: number; enemy: Omit<Enemy, 'id' | 'position' | 'pathProgress' | 'alive' | 'reachedEnd'> & { startPos: Vector3 } }> = []
  private gameTime = 0
  private waves = generateWaves()
  private lastResourceTick = 0

  constructor() {
    this.planets = createInitialPlanets()
    this.techTree = INITIAL_TECH_TREE.map(t => ({ ...t }))
    this.player = {
      gold: 300,
      energy: 100,
      currentWave: 0,
      totalWaves: this.waves.length,
      phase: 'preparation',
      selectedPlanetId: null,
      speedMultiplier: 1,
      score: 0,
      unlockedTechIds: [],
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    const snap = this.getSnapshot()
    this.listeners.forEach(l => l(snap))
  }

  getSnapshot(): GameStateSnapshot {
    return {
      planets: JSON.parse(JSON.stringify(this.planets)),
      enemies: JSON.parse(JSON.stringify(this.enemies.filter(e => e.alive))),
      projectiles: JSON.parse(JSON.stringify(this.projectiles.filter(p => p.active))),
      explosions: JSON.parse(JSON.stringify(this.explosions.filter(e => e.active))),
      player: JSON.parse(JSON.stringify(this.player)),
      techTree: JSON.parse(JSON.stringify(this.techTree)),
    }
  }

  getPlanet(id: string): Planet | undefined {
    return this.planets.find(p => p.id === id)
  }

  selectPlanet(planetId: string | null): void {
    this.player.selectedPlanetId = planetId
    this.notify()
  }

  setSpeed(multiplier: number): void {
    this.player.speedMultiplier = multiplier
    this.notify()
  }

  getTechBonus(type: TechNode['effectType']): number {
    return this.techTree
      .filter(t => t.unlocked && t.effectType === type)
      .reduce((sum, t) => sum + t.effectValue, 0)
  }

  buildTower(planetId: string, type: TowerType): boolean {
    const planet = this.getPlanet(planetId)
    if (!planet) return false
    if (planet.towers.length >= planet.maxTowers) return false

    const stats = TOWER_STATS[type][0]
    if (this.player.gold < stats.cost || this.player.energy < stats.energyCost) return false

    this.player.gold -= stats.cost
    this.player.energy -= stats.energyCost

    const towerCount = planet.towers.length
    const angle = (towerCount / planet.maxTowers) * Math.PI * 2
    const towerRadius = planet.size + 1.5
    const tower: Tower = {
      id: generateId(),
      planetId,
      type,
      level: 1,
      position: {
        x: planet.position.x + Math.cos(angle) * towerRadius,
        y: planet.position.y + Math.sin(angle) * towerRadius * 0.5,
        z: planet.position.z + Math.sin(angle) * towerRadius,
      },
      rotation: angle,
      lastFireTime: 0,
      targetEnemyId: null,
    }

    planet.towers.push(tower)
    this.notify()
    return true
  }

  upgradeTower(planetId: string, towerId: string): boolean {
    const planet = this.getPlanet(planetId)
    if (!planet) return false
    const tower = planet.towers.find(t => t.id === towerId)
    if (!tower || tower.level >= 3) return false

    const nextStats = TOWER_STATS[tower.type][tower.level]
    if (this.player.gold < nextStats.cost || this.player.energy < nextStats.energyCost) return false

    this.player.gold -= nextStats.cost
    this.player.energy -= nextStats.energyCost
    tower.level++
    this.notify()
    return true
  }

  sellTower(planetId: string, towerId: string): boolean {
    const planet = this.getPlanet(planetId)
    if (!planet) return false
    const idx = planet.towers.findIndex(t => t.id === towerId)
    if (idx === -1) return false

    const tower = planet.towers[idx]
    let refund = 0
    for (let i = 0; i < tower.level; i++) {
      refund += TOWER_STATS[tower.type][i].cost * 0.6
    }
    this.player.gold += Math.floor(refund)
    planet.towers.splice(idx, 1)
    this.notify()
    return true
  }

  unlockTech(techId: string): boolean {
    const tech = this.techTree.find(t => t.id === techId)
    if (!tech || tech.unlocked) return false
    const prereqsMet = tech.prerequisites.every(pid => this.techTree.find(t => t.id === pid)?.unlocked)
    if (!prereqsMet) return false
    if (this.player.gold < tech.cost) return false

    this.player.gold -= tech.cost
    tech.unlocked = true
    this.player.unlockedTechIds.push(techId)

    if (tech.effectType === 'planet_hp') {
      this.planets.forEach(p => {
        const bonus = p.maxHp * tech.effectValue
        p.maxHp += bonus
        p.currentHp += bonus
        p.techBonusActive = true
      })
    } else if (tech.effectType === 'start_gold') {
      this.player.gold += tech.effectValue
    } else if (tech.effectType === 'start_energy') {
      this.player.energy += tech.effectValue
    } else {
      this.planets.forEach(p => { p.techBonusActive = true })
    }

    this.notify()
    return true
  }

  startWave(): void {
    if (this.player.phase !== 'preparation') return
    if (this.player.currentWave >= this.waves.length) return

    const wave = this.waves[this.player.currentWave]
    this.player.phase = 'combat'

    const paths = this.findAllPaths('p0', 'p9')
    if (paths.length === 0) return

    let spawnTime = this.gameTime
    wave.enemyConfigs.forEach(config => {
      const pathIdx = Math.floor(Math.random() * paths.length)
      const path = paths[pathIdx]
      const startPlanet = this.getPlanet(path[0])
      if (!startPlanet) return

      spawnTime = this.gameTime + config.delay
      for (let i = 0; i < config.count; i++) {
        const stats = ENEMY_STATS[config.type]
        this.enemySpawnQueue.push({
          spawnAt: spawnTime,
          enemy: {
            type: config.type,
            maxHp: stats.maxHp,
            currentHp: stats.maxHp,
            speed: stats.speed,
            damage: stats.damage,
            reward: stats.reward,
            pathIndex: 0,
            pathPlanetIds: path,
            startPos: { ...startPlanet.position },
          }
        })
        spawnTime += config.interval
      }
    })

    this.notify()
  }

  private findAllPaths(startId: string, endId: string): string[][] {
    const paths: string[][] = []
    const visited = new Set<string>()

    const dfs = (currentId: string, path: string[]) => {
      if (currentId === endId) {
        paths.push([...path])
        return
      }
      const planet = this.getPlanet(currentId)
      if (!planet) return
      for (const conn of planet.connections) {
        if (!visited.has(conn)) {
          visited.add(conn)
          path.push(conn)
          dfs(conn, path)
          path.pop()
          visited.delete(conn)
        }
      }
    }

    visited.add(startId)
    dfs(startId, [startId])
    return paths.length > 0 ? paths.slice(0, 3) : []
  }

  update(deltaTime: number): void {
    if (this.player.phase === 'victory' || this.player.phase === 'defeat') return

    const dt = deltaTime * this.player.speedMultiplier
    this.gameTime += dt

    this.updateResources(dt)
    this.spawnEnemies()
    this.updateEnemies(dt)
    this.updateTowers()
    this.updateProjectiles(dt)
    this.updateExplosions(dt)
    this.checkWaveComplete()
    this.checkDefeat()

    this.notify()
  }

  private updateResources(dt: number): void {
    this.lastResourceTick += dt
    if (this.lastResourceTick >= 1) {
      const tick = Math.floor(this.lastResourceTick)
      this.lastResourceTick -= tick
      this.planets.forEach(p => {
        if (p.currentHp > 0) {
          this.player.gold += p.goldPerSecond * tick
          this.player.energy += p.energyPerSecond * tick
        }
      })
    }
  }

  private spawnEnemies(): void {
    const ready = this.enemySpawnQueue.filter(e => e.spawnAt <= this.gameTime)
    ready.forEach(q => {
      const enemy: Enemy = {
        id: generateId(),
        type: q.enemy.type,
        maxHp: q.enemy.maxHp,
        currentHp: q.enemy.currentHp,
        speed: q.enemy.speed,
        damage: q.enemy.damage,
        reward: q.enemy.reward,
        position: { ...q.enemy.startPos },
        pathIndex: q.enemy.pathIndex,
        pathProgress: 0,
        pathPlanetIds: q.enemy.pathPlanetIds,
        alive: true,
        reachedEnd: false,
      }
      this.enemies.push(enemy)
    })
    this.enemySpawnQueue = this.enemySpawnQueue.filter(e => e.spawnAt > this.gameTime)
  }

  private updateEnemies(dt: number): void {
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return
      if (enemy.pathIndex >= enemy.pathPlanetIds.length - 1) {
        enemy.reachedEnd = true
        enemy.alive = false
        const endPlanet = this.getPlanet(enemy.pathPlanetIds[enemy.pathPlanetIds.length - 1])
        if (endPlanet) {
          endPlanet.currentHp = Math.max(0, endPlanet.currentHp - enemy.damage)
        }
        return
      }

      const fromPlanet = this.getPlanet(enemy.pathPlanetIds[enemy.pathIndex])
      const toPlanet = this.getPlanet(enemy.pathPlanetIds[enemy.pathIndex + 1])
      if (!fromPlanet || !toPlanet) return

      const segDist = dist3D(fromPlanet.position, toPlanet.position)
      const moveAmount = (enemy.speed * dt) / segDist
      enemy.pathProgress += moveAmount

      if (enemy.pathProgress >= 1) {
        enemy.pathIndex++
        enemy.pathProgress = 0
        if (enemy.pathIndex < enemy.pathPlanetIds.length - 1) {
          const next = this.getPlanet(enemy.pathPlanetIds[enemy.pathIndex])
          if (next) enemy.position = { ...next.position }
        }
      } else {
        enemy.position = {
          x: fromPlanet.position.x + (toPlanet.position.x - fromPlanet.position.x) * enemy.pathProgress,
          y: fromPlanet.position.y + (toPlanet.position.y - fromPlanet.position.y) * enemy.pathProgress,
          z: fromPlanet.position.z + (toPlanet.position.z - fromPlanet.position.z) * enemy.pathProgress,
        }
      }
    })
  }

  private updateTowers(): void {
    const dmgMult = 1 + this.getTechBonus('global_damage')
    const rateMult = 1 + this.getTechBonus('global_fireRate')
    const rangeMult = 1 + this.getTechBonus('global_range')

    this.planets.forEach(planet => {
      planet.towers.forEach(tower => {
        const stats = TOWER_STATS[tower.type][tower.level - 1]
        const effRange = stats.range * rangeMult
        const effRate = stats.fireRate * rateMult
        const fireInterval = 1 / effRate

        if (this.gameTime - tower.lastFireTime < fireInterval) return

        let target: Enemy | null = null
        let minDist = Infinity
        this.enemies.forEach(e => {
          if (!e.alive) return
          const d = dist3D(tower.position, e.position)
          if (d <= effRange && d < minDist) {
            minDist = d
            target = e
          }
        })

        const targetEnemy = target as Enemy | null
        if (targetEnemy) {
          tower.lastFireTime = this.gameTime
          tower.targetEnemyId = targetEnemy.id
          tower.rotation = Math.atan2(
            targetEnemy.position.z - tower.position.z,
            targetEnemy.position.x - tower.position.x
          )

          const projectile: Projectile = {
            id: generateId(),
            type: tower.type,
            from: { ...tower.position },
            to: { ...targetEnemy.position },
            progress: 0,
            speed: tower.type === 'laser' ? 40 : tower.type === 'missile' ? 15 : 25,
            damage: stats.damage * dmgMult,
            targetEnemyId: targetEnemy.id,
            active: true,
          }
          this.projectiles.push(projectile)
        }
      })
    })
  }

  private updateProjectiles(dt: number): void {
    this.projectiles.forEach(proj => {
      if (!proj.active) return
      const target = this.enemies.find(e => e.id === proj.targetEnemyId && e.alive)
      if (target) {
        proj.to = { ...target.position }
      }

      const totalDist = dist3D(proj.from, proj.to)
      const moveDist = proj.speed * dt
      proj.progress += moveDist / Math.max(totalDist, 0.1)

      if (proj.progress >= 1) {
        proj.active = false
        if (target && target.alive) {
          target.currentHp -= proj.damage
          if (target.currentHp <= 0) {
            target.alive = false
            this.player.gold += target.reward.gold
            this.player.energy += target.reward.energy
            this.player.score += Math.floor(target.maxHp)
            this.explosions.push({
              id: generateId(),
              position: { ...target.position },
              progress: 0,
              maxRadius: target.type === 'mothership' ? 3 : 1.5,
              color: proj.type === 'laser' ? '#ff6b35' : proj.type === 'missile' ? '#4fc3f7' : '#ab47bc',
              active: true,
            })
          }
        }
      }
    })
    this.projectiles = this.projectiles.filter(p => p.active)
  }

  private updateExplosions(dt: number): void {
    this.explosions.forEach(exp => {
      exp.progress += dt * 3
      if (exp.progress >= 1) exp.active = false
    })
    this.explosions = this.explosions.filter(e => e.active)
  }

  private checkWaveComplete(): void {
    if (this.player.phase !== 'combat') return
    if (this.enemySpawnQueue.length > 0) return
    if (this.enemies.some(e => e.alive)) return

    const wave = this.waves[this.player.currentWave]
    this.player.gold += wave.reward.gold
    this.player.energy += wave.reward.energy
    this.player.currentWave++

    if (this.player.currentWave >= this.waves.length) {
      this.player.phase = 'victory'
    } else {
      this.player.phase = 'preparation'
    }
  }

  private checkDefeat(): void {
    const endPlanet = this.planets.find(p => p.type === 'endpoint' && p.id === 'p9')
    if (endPlanet && endPlanet.currentHp <= 0) {
      this.player.phase = 'defeat'
    }
  }

  resetGame(): void {
    this.planets = createInitialPlanets()
    this.enemies = []
    this.projectiles = []
    this.explosions = []
    this.enemySpawnQueue = []
    this.techTree = INITIAL_TECH_TREE.map(t => ({ ...t }))
    this.gameTime = 0
    this.player = {
      gold: 300,
      energy: 100,
      currentWave: 0,
      totalWaves: this.waves.length,
      phase: 'preparation',
      selectedPlanetId: null,
      speedMultiplier: 1,
      score: 0,
      unlockedTechIds: [],
    }
    this.notify()
  }
}
