export type PlanetType = 'mineral' | 'energy' | 'military';

export type TowerType = 'laser' | 'missile' | 'emp';

export type EnemyType = 'scout' | 'fighter' | 'cruiser' | 'boss';

export type GamePhase = 'prepare' | 'battle' | 'victory' | 'defeat';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Planet {
  id: string;
  name: string;
  type: PlanetType;
  position: Vector3;
  radius: number;
  color: string;
  glowColor: string;
  maxHealth: number;
  health: number;
  goldPerSecond: number;
  energyPerSecond: number;
  towerSlots: number;
  towers: Tower[];
  connections: string[];
  isStart: boolean;
  isEnd: boolean;
}

export interface Tower {
  id: string;
  type: TowerType;
  level: number;
  planetId: string;
  position: Vector3;
  damage: number;
  range: number;
  fireRate: number;
  lastFireTime: number;
  angle: number;
}

export interface TowerConfig {
  type: TowerType;
  name: string;
  description: string;
  baseDamage: number;
  baseRange: number;
  baseFireRate: number;
  baseCost: number;
  upgradeCost: number[];
  color: string;
  projectileColor: string;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  goldReward: number;
  position: Vector3;
  pathIndex: number;
  pathProgress: number;
  currentPath: Vector3[];
  targetPlanetId: string;
  isAlive: boolean;
}

export interface WaveEnemyConfig {
  type: EnemyType;
  count: number;
  interval: number;
  delay: number;
}

export interface Wave {
  id: number;
  name: string;
  enemies: WaveEnemyConfig[];
  totalEnemies: number;
  spawnedCount: number;
  killedCount: number;
  isActive: boolean;
  isCompleted: boolean;
}

export interface TechNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlocked: boolean;
  requires: string[];
  effect: TechEffect;
  icon: string;
  position: { x: number; y: number };
}

export interface TechEffect {
  type: 'damage' | 'fireRate' | 'range' | 'startGold' | 'startEnergy' | 'goldGain' | 'energyGain';
  value: number;
}

export interface PlayerState {
  gold: number;
  energy: number;
  currentWave: number;
  phase: GamePhase;
  gameSpeed: number;
  score: number;
  unlockedTechs: string[];
}

export interface Projectile {
  id: string;
  type: TowerType;
  position: Vector3;
  targetId: string;
  damage: number;
  speed: number;
  isActive: boolean;
  trail: Vector3[];
}

export interface Explosion {
  id: string;
  position: Vector3;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}
