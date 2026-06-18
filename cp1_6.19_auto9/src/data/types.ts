export type PlanetType = 'mineral' | 'energy' | 'military' | 'neutral' | 'endpoint'

export type TowerType = 'laser' | 'missile' | 'electromagnetic'

export type EnemyType = 'scout' | 'fighter' | 'cruiser' | 'mothership'

export type GamePhase = 'preparation' | 'combat' | 'victory' | 'defeat'

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface TowerStats {
  damage: number
  range: number
  fireRate: number
  cost: number
  energyCost: number
}

export interface Tower {
  id: string
  planetId: string
  type: TowerType
  level: number
  position: Vector3
  rotation: number
  lastFireTime: number
  targetEnemyId: string | null
}

export interface Planet {
  id: string
  name: string
  type: PlanetType
  position: Vector3
  size: number
  color: string
  glowColor: string
  maxHp: number
  currentHp: number
  goldPerSecond: number
  energyPerSecond: number
  connections: string[]
  towers: Tower[]
  maxTowers: number
  techBonusActive: boolean
}

export interface Enemy {
  id: string
  type: EnemyType
  maxHp: number
  currentHp: number
  speed: number
  damage: number
  reward: { gold: number; energy: number }
  position: Vector3
  pathIndex: number
  pathProgress: number
  pathPlanetIds: string[]
  alive: boolean
  reachedEnd: boolean
}

export interface WaveEnemyConfig {
  type: EnemyType
  count: number
  interval: number
  delay: number
}

export interface Wave {
  id: number
  name: string
  enemyConfigs: WaveEnemyConfig[]
  reward: { gold: number; energy: number }
}

export interface TechNode {
  id: string
  name: string
  description: string
  icon: string
  cost: number
  prerequisites: string[]
  unlocked: boolean
  effectType: 'global_damage' | 'global_fireRate' | 'global_range' | 'start_gold' | 'start_energy' | 'planet_hp'
  effectValue: number
}

export interface PlayerState {
  gold: number
  energy: number
  currentWave: number
  totalWaves: number
  phase: GamePhase
  selectedPlanetId: string | null
  speedMultiplier: number
  score: number
  unlockedTechIds: string[]
}

export interface Projectile {
  id: string
  type: TowerType
  from: Vector3
  to: Vector3
  progress: number
  speed: number
  damage: number
  targetEnemyId: string
  active: boolean
}

export interface Explosion {
  id: string
  position: Vector3
  progress: number
  maxRadius: number
  color: string
  active: boolean
}

export interface GameStateSnapshot {
  planets: Planet[]
  enemies: Enemy[]
  projectiles: Projectile[]
  explosions: Explosion[]
  player: PlayerState
  techTree: TechNode[]
}

export const TOWER_STATS: Record<TowerType, TowerStats[]> = {
  laser: [
    { damage: 15, range: 12, fireRate: 3, cost: 50, energyCost: 10 },
    { damage: 28, range: 14, fireRate: 4, cost: 80, energyCost: 15 },
    { damage: 50, range: 16, fireRate: 5, cost: 150, energyCost: 25 },
  ],
  missile: [
    { damage: 40, range: 18, fireRate: 0.8, cost: 80, energyCost: 20 },
    { damage: 75, range: 20, fireRate: 1, cost: 130, energyCost: 30 },
    { damage: 130, range: 24, fireRate: 1.3, cost: 220, energyCost: 45 },
  ],
  electromagnetic: [
    { damage: 25, range: 10, fireRate: 1.5, cost: 100, energyCost: 35 },
    { damage: 45, range: 12, fireRate: 2, cost: 160, energyCost: 50 },
    { damage: 80, range: 15, fireRate: 2.5, cost: 280, energyCost: 80 },
  ],
}

export const ENEMY_STATS: Record<EnemyType, { maxHp: number; speed: number; damage: number; reward: { gold: number; energy: number } }> = {
  scout: { maxHp: 30, speed: 5, damage: 5, reward: { gold: 10, energy: 3 } },
  fighter: { maxHp: 80, speed: 3.5, damage: 15, reward: { gold: 20, energy: 5 } },
  cruiser: { maxHp: 200, speed: 2, damage: 30, reward: { gold: 50, energy: 12 } },
  mothership: { maxHp: 600, speed: 1, damage: 80, reward: { gold: 150, energy: 40 } },
}

export const INITIAL_TECH_TREE: TechNode[] = [
  { id: 't1', name: '火力强化 I', description: '所有防御塔伤害 +10%', icon: '⚔️', cost: 200, prerequisites: [], unlocked: false, effectType: 'global_damage', effectValue: 0.1 },
  { id: 't2', name: '快速射击', description: '所有防御塔射速 +15%', icon: '⚡', cost: 250, prerequisites: ['t1'], unlocked: false, effectType: 'global_fireRate', effectValue: 0.15 },
  { id: 't3', name: '精密瞄准', description: '所有防御塔射程 +10%', icon: '🎯', cost: 200, prerequisites: ['t1'], unlocked: false, effectType: 'global_range', effectValue: 0.1 },
  { id: 't4', name: '火力强化 II', description: '所有防御塔伤害 +20%', icon: '💥', cost: 500, prerequisites: ['t2'], unlocked: false, effectType: 'global_damage', effectValue: 0.2 },
  { id: 't5', name: '启动资金', description: '开局额外 200 金币', icon: '💰', cost: 150, prerequisites: [], unlocked: false, effectType: 'start_gold', effectValue: 200 },
  { id: 't6', name: '能量储备', description: '开局额外 100 能量', icon: '🔋', cost: 150, prerequisites: [], unlocked: false, effectType: 'start_energy', effectValue: 100 },
  { id: 't7', name: '星球护盾', description: '所有星球最大血量 +25%', icon: '🛡️', cost: 400, prerequisites: ['t3'], unlocked: false, effectType: 'planet_hp', effectValue: 0.25 },
]
