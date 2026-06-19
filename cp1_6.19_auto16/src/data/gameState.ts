import {
  Planet,
  Tower,
  Enemy,
  Wave,
  PlayerState,
  TowerType,
  TowerConfig,
  TechNode,
  GamePhase,
  Vector3,
  EnemyType
} from './types';

const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  laser: {
    type: 'laser',
    name: '激光塔',
    description: '高射速低伤害，适合快速目标',
    baseDamage: 15,
    baseRange: 8,
    baseFireRate: 0.3,
    baseCost: 100,
    upgradeCost: [150, 300],
    color: '#ff6b35',
    projectileColor: '#ff4500'
  },
  missile: {
    type: 'missile',
    name: '导弹塔',
    description: '低射速高伤害，范围攻击',
    baseDamage: 50,
    baseRange: 12,
    baseFireRate: 1.5,
    baseCost: 200,
    upgradeCost: [300, 600],
    color: '#4ecdc4',
    projectileColor: '#00ffff'
  },
  emp: {
    type: 'emp',
    name: '电磁炮',
    description: '超远射程，减速敌人',
    baseDamage: 30,
    baseRange: 18,
    baseFireRate: 1.0,
    baseCost: 250,
    upgradeCost: [400, 800],
    color: '#a855f7',
    projectileColor: '#bf00ff'
  }
};

const ENEMY_STATS: Record<EnemyType, { health: number; speed: number; damage: number; gold: number; color: string }> = {
  scout: { health: 50, speed: 3, damage: 5, gold: 10, color: '#22c55e' },
  fighter: { health: 100, speed: 2, damage: 10, gold: 20, color: '#eab308' },
  cruiser: { health: 300, speed: 1, damage: 25, gold: 50, color: '#ef4444' },
  boss: { health: 1000, speed: 0.5, damage: 100, gold: 200, color: '#8b5cf6' }
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export class GameState {
  private planets: Map<string, Planet> = new Map();
  private enemies: Map<string, Enemy> = new Map();
  private waves: Wave[] = [];
  private playerState: PlayerState;
  private techTree: TechNode[] = [];
  private listeners: Set<() => void> = new Set();
  private lastTime: number = 0;
  private resourceAccumulator: number = 0;

  constructor() {
    this.playerState = {
      gold: 500,
      energy: 200,
      currentWave: 0,
      phase: 'prepare',
      gameSpeed: 1,
      score: 0,
      unlockedTechs: []
    };
    this.initializePlanets();
    this.initializeTechTree();
    this.initializeWaves();
  }

  private initializePlanets(): void {
    const planetConfigs = [
      { id: 'p0', name: '起点星', type: 'energy' as const, x: -20, y: 0, z: 0, radius: 1.5, slots: 2, isStart: true, isEnd: false },
      { id: 'p1', name: '矿脉星', type: 'mineral' as const, x: -10, y: 8, z: 2, radius: 1.8, slots: 3, isStart: false, isEnd: false },
      { id: 'p2', name: '前哨星', type: 'military' as const, x: -8, y: -6, z: -3, radius: 1.6, slots: 3, isStart: false, isEnd: false },
      { id: 'p3', name: '能源星', type: 'energy' as const, x: 0, y: 12, z: 5, radius: 2.0, slots: 4, isStart: false, isEnd: false },
      { id: 'p4', name: '要塞星', type: 'military' as const, x: 5, y: 0, z: -2, radius: 2.2, slots: 5, isStart: false, isEnd: false },
      { id: 'p5', name: '晶矿星', type: 'mineral' as const, x: 2, y: -10, z: 4, radius: 1.7, slots: 3, isStart: false, isEnd: false },
      { id: 'p6', name: '中继星', type: 'energy' as const, x: 12, y: 6, z: -4, radius: 1.4, slots: 2, isStart: false, isEnd: false },
      { id: 'p7', name: '堡垒星', type: 'military' as const, x: 15, y: -5, z: 3, radius: 2.0, slots: 4, isStart: false, isEnd: false },
      { id: 'p8', name: '能源核心', type: 'energy' as const, x: 22, y: 3, z: -1, radius: 1.9, slots: 3, isStart: false, isEnd: false },
      { id: 'p9', name: '终点星', type: 'military' as const, x: 28, y: 0, z: 0, radius: 2.5, slots: 6, isStart: false, isEnd: true },
      { id: 'p10', name: '矿带星', type: 'mineral' as const, x: -5, y: 4, z: 8, radius: 1.3, slots: 2, isStart: false, isEnd: false },
      { id: 'p11', name: '哨戒星', type: 'military' as const, x: 8, y: -3, z: -8, radius: 1.5, slots: 3, isStart: false, isEnd: false },
    ];

    const connections: [string, string][] = [
      ['p0', 'p1'], ['p0', 'p2'], ['p0', 'p10'],
      ['p1', 'p3'], ['p1', 'p4'],
      ['p2', 'p4'], ['p2', 'p5'], ['p2', 'p11'],
      ['p3', 'p6'],
      ['p4', 'p6'], ['p4', 'p7'], ['p4', 'p5'],
      ['p5', 'p7'],
      ['p6', 'p8'],
      ['p7', 'p8'], ['p7', 'p9'],
      ['p8', 'p9'],
      ['p10', 'p1'], ['p10', 'p3'],
      ['p11', 'p5'], ['p11', 'p7']
    ];

    const typeColors: Record<string, { color: string; glow: string; gold: number; energy: number; health: number }> = {
      mineral: { color: '#ff8c00', glow: '#ff6600', gold: 15, energy: 2, health: 200 },
      energy: { color: '#00bfff', glow: '#0080ff', gold: 5, energy: 10, health: 150 },
      military: { color: '#ff4444', glow: '#cc0000', gold: 8, energy: 5, health: 300 }
    };

    planetConfigs.forEach(config => {
      const typeInfo = typeColors[config.type];
      const planet: Planet = {
        id: config.id,
        name: config.name,
        type: config.type,
        position: { x: config.x, y: config.y, z: config.z },
        radius: config.radius,
        color: typeInfo.color,
        glowColor: typeInfo.glow,
        maxHealth: typeInfo.health,
        health: typeInfo.health,
        goldPerSecond: typeInfo.gold,
        energyPerSecond: typeInfo.energy,
        towerSlots: config.slots,
        towers: [],
        connections: [],
        isStart: config.isStart,
        isEnd: config.isEnd
      };
      this.planets.set(config.id, planet);
    });

    connections.forEach(([a, b]) => {
      const planetA = this.planets.get(a);
      const planetB = this.planets.get(b);
      if (planetA && planetB) {
        if (!planetA.connections.includes(b)) planetA.connections.push(b);
        if (!planetB.connections.includes(a)) planetB.connections.push(a);
      }
    });
  }

  private initializeTechTree(): void {
    this.techTree = [
      { id: 't1', name: '快速充能', description: '所有塔射速 +10%', cost: 200, unlocked: false, requires: [], effect: { type: 'fireRate', value: 0.1 }, icon: '⚡', position: { x: 50, y: 100 } },
      { id: 't2', name: '强化弹药', description: '所有塔伤害 +15%', cost: 300, unlocked: false, requires: ['t1'], effect: { type: 'damage', value: 0.15 }, icon: '💥', position: { x: 150, y: 60 } },
      { id: 't3', name: '扩展雷达', description: '所有塔射程 +20%', cost: 250, unlocked: false, requires: ['t1'], effect: { type: 'range', value: 0.2 }, icon: '📡', position: { x: 150, y: 140 } },
      { id: 't4', name: '高能弹头', description: '所有塔伤害 +25%', cost: 500, unlocked: false, requires: ['t2'], effect: { type: 'damage', value: 0.25 }, icon: '☄️', position: { x: 250, y: 40 } },
      { id: 't5', name: '精准打击', description: '所有塔射速 +15%', cost: 450, unlocked: false, requires: ['t2', 't3'], effect: { type: 'fireRate', value: 0.15 }, icon: '🎯', position: { x: 250, y: 100 } },
      { id: 't6', name: '远距探测', description: '所有塔射程 +30%', cost: 400, unlocked: false, requires: ['t3'], effect: { type: 'range', value: 0.3 }, icon: '🔭', position: { x: 250, y: 160 } },
      { id: 't7', name: '初始资金', description: '开局额外 +200 金币', cost: 300, unlocked: false, requires: [], effect: { type: 'startGold', value: 200 }, icon: '💰', position: { x: 50, y: 200 } },
      { id: 't8', name: '初始能量', description: '开局额外 +100 能量', cost: 250, unlocked: false, requires: [], effect: { type: 'startEnergy', value: 100 }, icon: '🔋', position: { x: 50, y: 260 } },
      { id: 't9', name: '黄金时代', description: '金币产出 +20%', cost: 400, unlocked: false, requires: ['t7'], effect: { type: 'goldGain', value: 0.2 }, icon: '🏆', position: { x: 150, y: 220 } },
      { id: 't10', name: '能量涌动', description: '能量产出 +20%', cost: 350, unlocked: false, requires: ['t8'], effect: { type: 'energyGain', value: 0.2 }, icon: '⚛️', position: { x: 150, y: 280 } },
    ];
  }

  private initializeWaves(): void {
    this.waves = [
      { id: 1, name: '侦察波', enemies: [{ type: 'scout', count: 8, interval: 1.0, delay: 0 }], totalEnemies: 8, spawnedCount: 0, killedCount: 0, isActive: false, isCompleted: false },
      { id: 2, name: '前锋波', enemies: [{ type: 'scout', count: 10, interval: 0.8, delay: 0 }, { type: 'fighter', count: 3, interval: 2.0, delay: 5 }], totalEnemies: 13, spawnedCount: 0, killedCount: 0, isActive: false, isCompleted: false },
      { id: 3, name: '战斗机群', enemies: [{ type: 'fighter', count: 10, interval: 1.2, delay: 0 }], totalEnemies: 10, spawnedCount: 0, killedCount: 0, isActive: false, isCompleted: false },
      { id: 4, name: '混合编队', enemies: [{ type: 'scout', count: 15, interval: 0.5, delay: 0 }, { type: 'fighter', count: 8, interval: 1.5, delay: 3 }, { type: 'cruiser', count: 2, interval: 5.0, delay: 8 }], totalEnemies: 25, spawnedCount: 0, killedCount: 0, isActive: false, isCompleted: false },
      { id: 5, name: '巡洋舰队', enemies: [{ type: 'cruiser', count: 5, interval: 3.0, delay: 0 }, { type: 'fighter', count: 10, interval: 1.0, delay: 2 }], totalEnemies: 15, spawnedCount: 0, killedCount: 0, isActive: false, isCompleted: false },
      { id: 6, name: '蜂群战术', enemies: [{ type: 'scout', count: 30, interval: 0.3, delay: 0 }], totalEnemies: 30, spawnedCount: 0, killedCount: 0, isActive: false, isCompleted: false },
      { id: 7, name: '重型突击', enemies: [{ type: 'cruiser', count: 8, interval: 2.5, delay: 0 }, { type: 'fighter', count: 15, interval: 0.8, delay: 5 }], totalEnemies: 23, spawnedCount: 0, killedCount: 0, isActive: false, isCompleted: false },
      { id: 8, name: 'BOSS来袭', enemies: [{ type: 'fighter', count: 20, interval: 0.6, delay: 0 }, { type: 'cruiser', count: 5, interval: 3.0, delay: 5 }, { type: 'boss', count: 1, interval: 0, delay: 15 }], totalEnemies: 26, spawnedCount: 0, killedCount: 0, isActive: false, isCompleted: false },
      { id: 9, name: '最终决战', enemies: [{ type: 'scout', count: 30, interval: 0.4, delay: 0 }, { type: 'fighter', count: 20, interval: 0.8, delay: 5 }, { type: 'cruiser', count: 10, interval: 2.0, delay: 10 }, { type: 'boss', count: 2, interval: 10.0, delay: 20 }], totalEnemies: 62, spawnedCount: 0, killedCount: 0, isActive: false, isCompleted: false },
    ];
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  getPlanets(): Planet[] {
    return Array.from(this.planets.values());
  }

  getPlanet(id: string): Planet | undefined {
    return this.planets.get(id);
  }

  getEnemies(): Enemy[] {
    return Array.from(this.enemies.values()).filter(e => e.isAlive);
  }

  getWaves(): Wave[] {
    return this.waves;
  }

  getCurrentWave(): Wave | undefined {
    return this.waves[this.playerState.currentWave];
  }

  getPlayerState(): PlayerState {
    return { ...this.playerState };
  }

  getTechTree(): TechNode[] {
    return this.techTree.map(t => ({ ...t }));
  }

  getTowerConfig(type: TowerType): TowerConfig {
    return TOWER_CONFIGS[type];
  }

  getEnemyStats(type: EnemyType) {
    return ENEMY_STATS[type];
  }

  getTechMultiplier(effectType: string): number {
    let multiplier = 1;
    this.techTree.forEach(tech => {
      if (tech.unlocked && tech.effect.type === effectType) {
        if (effectType === 'damage' || effectType === 'fireRate' || effectType === 'range' || effectType === 'goldGain' || effectType === 'energyGain') {
          multiplier += tech.effect.value;
        }
      }
    });
    return multiplier;
  }

  canBuildTower(planetId: string, type: TowerType): boolean {
    const planet = this.planets.get(planetId);
    if (!planet) return false;
    if (planet.towers.length >= planet.towerSlots) return false;
    const config = TOWER_CONFIGS[type];
    return this.playerState.gold >= config.baseCost && this.playerState.energy >= 20;
  }

  buildTower(planetId: string, type: TowerType): boolean {
    if (!this.canBuildTower(planetId, type)) return false;

    const planet = this.planets.get(planetId)!;
    const config = TOWER_CONFIGS[type];

    const angle = (planet.towers.length / planet.towerSlots) * Math.PI * 2;
    const orbitRadius = planet.radius + 1.2;

    const tower: Tower = {
      id: generateId(),
      type,
      level: 1,
      planetId,
      position: {
        x: planet.position.x + Math.cos(angle) * orbitRadius,
        y: planet.position.y + Math.sin(angle) * orbitRadius * 0.5,
        z: planet.position.z + Math.sin(angle) * orbitRadius
      },
      damage: config.baseDamage * this.getTechMultiplier('damage'),
      range: config.baseRange * this.getTechMultiplier('range'),
      fireRate: config.baseFireRate / this.getTechMultiplier('fireRate'),
      lastFireTime: 0,
      angle
    };

    planet.towers.push(tower);
    this.playerState.gold -= config.baseCost;
    this.playerState.energy -= 20;
    this.notify();
    return true;
  }

  canUpgradeTower(towerId: string): boolean {
    for (const planet of this.planets.values()) {
      const tower = planet.towers.find(t => t.id === towerId);
      if (tower) {
        if (tower.level >= 3) return false;
        const config = TOWER_CONFIGS[tower.type];
        const cost = config.upgradeCost[tower.level - 1];
        return this.playerState.gold >= cost && this.playerState.energy >= 30;
      }
    }
    return false;
  }

  upgradeTower(towerId: string): boolean {
    for (const planet of this.planets.values()) {
      const tower = planet.towers.find(t => t.id === towerId);
      if (tower && tower.level < 3) {
        const config = TOWER_CONFIGS[tower.type];
        const cost = config.upgradeCost[tower.level - 1];
        if (this.playerState.gold >= cost && this.playerState.energy >= 30) {
          tower.level++;
          tower.damage = config.baseDamage * (1 + (tower.level - 1) * 0.5) * this.getTechMultiplier('damage');
          tower.range = config.baseRange * (1 + (tower.level - 1) * 0.2) * this.getTechMultiplier('range');
          tower.fireRate = config.baseFireRate / (1 + (tower.level - 1) * 0.3) / this.getTechMultiplier('fireRate');
          this.playerState.gold -= cost;
          this.playerState.energy -= 30;
          this.notify();
          return true;
        }
      }
    }
    return false;
  }

  findTower(towerId: string): Tower | undefined {
    for (const planet of this.planets.values()) {
      const tower = planet.towers.find(t => t.id === towerId);
      if (tower) return tower;
    }
    return undefined;
  }

  unlockTech(techId: string): boolean {
    const tech = this.techTree.find(t => t.id === techId);
    if (!tech || tech.unlocked) return false;

    const requirementsMet = tech.requires.every(reqId => {
      const reqTech = this.techTree.find(t => t.id === reqId);
      return reqTech && reqTech.unlocked;
    });

    if (!requirementsMet) return false;
    if (this.playerState.gold < tech.cost) return false;

    tech.unlocked = true;
    this.playerState.gold -= tech.cost;
    this.playerState.unlockedTechs.push(techId);

    if (tech.effect.type === 'damage' || tech.effect.type === 'range' || tech.effect.type === 'fireRate') {
      this.recalculateTowerStats();
    }

    this.notify();
    return true;
  }

  private recalculateTowerStats(): void {
    for (const planet of this.planets.values()) {
      for (const tower of planet.towers) {
        const config = TOWER_CONFIGS[tower.type];
        tower.damage = config.baseDamage * (1 + (tower.level - 1) * 0.5) * this.getTechMultiplier('damage');
        tower.range = config.baseRange * (1 + (tower.level - 1) * 0.2) * this.getTechMultiplier('range');
        tower.fireRate = config.baseFireRate / (1 + (tower.level - 1) * 0.3) / this.getTechMultiplier('fireRate');
      }
    }
  }

  startWave(): boolean {
    if (this.playerState.phase !== 'prepare') return false;
    if (this.playerState.currentWave >= this.waves.length) return false;

    const wave = this.waves[this.playerState.currentWave];
    wave.isActive = true;
    this.playerState.phase = 'battle';
    this.lastTime = performance.now();
    this.notify();
    return true;
  }

  spawnEnemy(type: EnemyType, startPlanetId: string): void {
    const startPlanet = this.planets.get(startPlanetId);
    if (!startPlanet) return;

    const stats = ENEMY_STATS[type];
    const path = this.findPath(startPlanetId, this.getEndPlanetId());

    if (path.length < 2) return;

    const enemy: Enemy = {
      id: generateId(),
      type,
      health: stats.health,
      maxHealth: stats.health,
      speed: stats.speed,
      damage: stats.damage,
      goldReward: stats.gold,
      position: { ...path[0] },
      pathIndex: 0,
      pathProgress: 0,
      currentPath: path,
      targetPlanetId: startPlanetId,
      isAlive: true
    };

    this.enemies.set(enemy.id, enemy);
  }

  private getEndPlanetId(): string {
    for (const planet of this.planets.values()) {
      if (planet.isEnd) return planet.id;
    }
    return '';
  }

  getStartPlanetId(): string {
    for (const planet of this.planets.values()) {
      if (planet.isStart) return planet.id;
    }
    return '';
  }

  findPath(startId: string, endId: string): Vector3[] {
    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      if (id === endId) {
        return path.map(pid => {
          const p = this.planets.get(pid)!;
          return { ...p.position };
        });
      }
      if (visited.has(id)) continue;
      visited.add(id);

      const planet = this.planets.get(id);
      if (planet) {
        for (const neighbor of planet.connections) {
          if (!visited.has(neighbor)) {
            queue.push({ id: neighbor, path: [...path, neighbor] });
          }
        }
      }
    }

    return [];
  }

  update(deltaTime: number): void {
    if (this.playerState.phase !== 'battle') return;

    const dt = deltaTime * this.playerState.gameSpeed;
    const currentTime = performance.now() / 1000;

    this.resourceAccumulator += dt;
    if (this.resourceAccumulator >= 1) {
      const ticks = Math.floor(this.resourceAccumulator);
      this.resourceAccumulator -= ticks;

      const goldMultiplier = this.getTechMultiplier('goldGain');
      const energyMultiplier = this.getTechMultiplier('energyGain');

      for (const planet of this.planets.values()) {
        if (planet.health > 0) {
          this.playerState.gold += planet.goldPerSecond * ticks * goldMultiplier;
          this.playerState.energy += planet.energyPerSecond * ticks * energyMultiplier;
        }
      }
    }

    for (const enemy of this.enemies.values()) {
      if (!enemy.isAlive) continue;
      this.updateEnemy(enemy, dt);
    }

    for (const planet of this.planets.values()) {
      for (const tower of planet.towers) {
        this.updateTower(tower, currentTime);
      }
    }

    this.cleanupDeadEnemies();
    this.checkWaveCompletion();
    this.checkGameOver();

    this.notify();
  }

  private updateEnemy(enemy: Enemy, dt: number): void {
    if (enemy.pathIndex >= enemy.currentPath.length - 1) {
      const endPlanet = this.planets.get(this.getEndPlanetId());
      if (endPlanet) {
        endPlanet.health -= enemy.damage;
        if (endPlanet.health < 0) endPlanet.health = 0;
      }
      enemy.isAlive = false;
      return;
    }

    const currentPos = enemy.currentPath[enemy.pathIndex];
    const nextPos = enemy.currentPath[enemy.pathIndex + 1];

    const dx = nextPos.x - currentPos.x;
    const dy = nextPos.y - currentPos.y;
    const dz = nextPos.z - currentPos.z;
    const segmentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const moveAmount = (enemy.speed * dt) / segmentLength;
    enemy.pathProgress += moveAmount;

    if (enemy.pathProgress >= 1) {
      enemy.pathProgress = 0;
      enemy.pathIndex++;
    }

    if (enemy.pathIndex < enemy.currentPath.length - 1) {
      const curr = enemy.currentPath[enemy.pathIndex];
      const next = enemy.currentPath[enemy.pathIndex + 1];
      enemy.position = {
        x: curr.x + (next.x - curr.x) * enemy.pathProgress,
        y: curr.y + (next.y - curr.y) * enemy.pathProgress,
        z: curr.z + (next.z - curr.z) * enemy.pathProgress
      };
    }
  }

  private updateTower(tower: Tower, currentTime: number): void {
    if (currentTime - tower.lastFireTime < tower.fireRate) return;

    let nearestEnemy: Enemy | null = null;
    let nearestDist = Infinity;

    for (const enemy of this.enemies.values()) {
      if (!enemy.isAlive) continue;
      const dist = distance(tower.position, enemy.position);
      if (dist <= tower.range && dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      tower.lastFireTime = currentTime;
      this.fireTower(tower, nearestEnemy);
    }
  }

  private fireTower(tower: Tower, enemy: Enemy): void {
    enemy.health -= tower.damage;
    if (enemy.health <= 0) {
      enemy.isAlive = false;
      this.playerState.gold += enemy.goldReward;
      this.playerState.score += enemy.goldReward * 10;

      const wave = this.getCurrentWave();
      if (wave) {
        wave.killedCount++;
      }
    }
  }

  private cleanupDeadEnemies(): void {
    for (const [id, enemy] of this.enemies) {
      if (!enemy.isAlive) {
        this.enemies.delete(id);
      }
    }
  }

  private checkWaveCompletion(): void {
    const wave = this.getCurrentWave();
    if (!wave || !wave.isActive) return;

    const allSpawned = wave.spawnedCount >= wave.totalEnemies;
    const allKilled = wave.killedCount >= wave.totalEnemies;
    const noEnemies = this.enemies.size === 0;

    if (allSpawned && allKilled && noEnemies) {
      wave.isCompleted = true;
      wave.isActive = false;
      this.playerState.currentWave++;

      if (this.playerState.currentWave >= this.waves.length) {
        this.playerState.phase = 'victory';
      } else {
        this.playerState.phase = 'prepare';
      }
    }
  }

  private checkGameOver(): void {
    const endPlanet = this.planets.get(this.getEndPlanetId());
    if (endPlanet && endPlanet.health <= 0) {
      this.playerState.phase = 'defeat';
    }
  }

  setGameSpeed(speed: number): void {
    this.playerState.gameSpeed = speed;
    this.notify();
  }

  incrementWaveSpawned(waveId: number): void {
    const wave = this.waves.find(w => w.id === waveId);
    if (wave) {
      wave.spawnedCount++;
    }
  }

  resetGame(): void {
    this.planets.clear();
    this.enemies.clear();
    this.waves = [];

    const savedTechs = [...this.playerState.unlockedTechs];
    const startGoldBonus = this.techTree.find(t => t.id === 't7' && t.unlocked)?.effect.value || 0;
    const startEnergyBonus = this.techTree.find(t => t.id === 't8' && t.unlocked)?.effect.value || 0;

    this.playerState = {
      gold: 500 + startGoldBonus,
      energy: 200 + startEnergyBonus,
      currentWave: 0,
      phase: 'prepare',
      gameSpeed: 1,
      score: 0,
      unlockedTechs: savedTechs
    };

    this.initializePlanets();
    this.initializeWaves();
    this.techTree.forEach(tech => {
      tech.unlocked = savedTechs.includes(tech.id);
    });

    this.notify();
  }
}
