import { GameState } from './gameState';
import { Wave, WaveEnemyConfig, EnemyType } from './types';

interface SpawnTask {
  type: EnemyType;
  spawnTime: number;
  spawned: boolean;
}

export class EnemySpawner {
  private gameState: GameState;
  private waveStartTime: number = 0;
  private spawnTasks: SpawnTask[] = [];
  private currentWaveId: number = -1;
  private isActive: boolean = false;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  startWave(wave: Wave): void {
    this.currentWaveId = wave.id;
    this.waveStartTime = performance.now() / 1000;
    this.isActive = true;
    this.spawnTasks = [];
    this.generateSpawnTasks(wave);
  }

  private generateSpawnTasks(wave: Wave): void {
    const tasks: SpawnTask[] = [];

    wave.enemies.forEach((enemyConfig: WaveEnemyConfig) => {
      for (let i = 0; i < enemyConfig.count; i++) {
        tasks.push({
          type: enemyConfig.type,
          spawnTime: enemyConfig.delay + i * enemyConfig.interval,
          spawned: false
        });
      }
    });

    tasks.sort((a, b) => a.spawnTime - b.spawnTime);
    this.spawnTasks = tasks;
  }

  update(): void {
    if (!this.isActive) return;

    const currentTime = performance.now() / 1000;
    const elapsed = currentTime - this.waveStartTime;

    let spawnedAny = false;

    this.spawnTasks.forEach(task => {
      if (!task.spawned && elapsed >= task.spawnTime) {
        this.spawnEnemy(task.type);
        task.spawned = true;
        spawnedAny = true;
      }
    });

    if (spawnedAny) {
      this.gameState.incrementWaveSpawned(this.currentWaveId);
    }

    const allSpawned = this.spawnTasks.every(task => task.spawned);
    if (allSpawned) {
      this.isActive = false;
    }
  }

  private spawnEnemy(type: EnemyType): void {
    const startPlanetId = this.gameState.getStartPlanetId();
    if (startPlanetId) {
      this.gameState.spawnEnemy(type, startPlanetId);
    }
  }

  reset(): void {
    this.spawnTasks = [];
    this.currentWaveId = -1;
    this.isActive = false;
    this.waveStartTime = 0;
  }

  getProgress(): number {
    if (this.spawnTasks.length === 0) return 0;
    const spawned = this.spawnTasks.filter(t => t.spawned).length;
    return spawned / this.spawnTasks.length;
  }

  getTotalEnemies(): number {
    return this.spawnTasks.length;
  }

  getSpawnedCount(): number {
    return this.spawnTasks.filter(t => t.spawned).length;
  }
}
