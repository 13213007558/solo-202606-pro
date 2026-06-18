import Phaser from 'phaser';
import { ASSET_KEYS } from '../utils/assetLoader';
import { stateManager } from '../utils/stateManager';

export enum EnemyType {
  BASIC = 'basic',
  TRACKER = 'tracker',
  ELITE = 'elite'
}

export interface EnemyConfig {
  type: EnemyType;
  health: number;
  speed: number;
  score: number;
  assetKey: string;
  width: number;
  height: number;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  [EnemyType.BASIC]: {
    type: EnemyType.BASIC,
    health: 1,
    speed: 100,
    score: 100,
    assetKey: ASSET_KEYS.ENEMY_BASIC,
    width: 34,
    height: 32
  },
  [EnemyType.TRACKER]: {
    type: EnemyType.TRACKER,
    health: 2,
    speed: 80,
    score: 200,
    assetKey: ASSET_KEYS.ENEMY_TRACKER,
    width: 36,
    height: 38
  },
  [EnemyType.ELITE]: {
    type: EnemyType.ELITE,
    health: 5,
    speed: 50,
    score: 500,
    assetKey: ASSET_KEYS.ENEMY_ELITE,
    width: 60,
    height: 50
  }
};

const POWERUP_DROP_CHANCE = 0.2;
const MAX_ENEMIES = 30;
const BASE_WAVE_INTERVAL = 10000;
const MIN_WAVE_INTERVAL = 3000;
const WAVE_INTERVAL_DECREASE = 500;
const ELITE_SHOOT_INTERVAL = 2000;

export class Enemy {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public type: EnemyType;
  public health: number;
  public maxHealth: number;
  public score: number;
  public speed: number;
  public isDead: boolean = false;
  public hitFlashTimer: number = 0;
  private shootTimer: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;

  constructor(
    sprite: Phaser.Physics.Arcade.Sprite,
    config: EnemyConfig
  ) {
    this.sprite = sprite;
    this.type = config.type;
    this.health = config.health;
    this.maxHealth = config.health;
    this.score = config.score;
    this.speed = config.speed;
  }

  public takeDamage(damage: number = 1): boolean {
    this.health -= damage;
    this.hitFlashTimer = 100;

    if (this.health <= 0) {
      this.isDead = true;
      return true;
    }
    return false;
  }

  public setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  public update(delta: number, playerX: number, playerY: number): void {
    if (this.isDead) return;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      if (this.hitFlashTimer <= 0) {
        this.sprite.clearTint();
      } else {
        this.sprite.setTint(0xffffff);
      }
    }

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    switch (this.type) {
      case EnemyType.BASIC:
        body.setVelocity(0, this.speed);
        break;

      case EnemyType.TRACKER:
        const dx = playerX - this.sprite.x;
        const dy = playerY - this.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const vx = (dx / dist) * this.speed * 0.5;
          const vy = Math.max(this.speed * 0.7, (dy / dist) * this.speed);
          body.setVelocity(vx, vy);
        }
        break;

      case EnemyType.ELITE:
        if (this.sprite.y < 150) {
          body.setVelocity(0, this.speed);
        } else {
          const swayOffset = Math.sin(Date.now() / 1000) * 50;
          body.setVelocity(swayOffset - body.velocity.x, 20);
        }

        this.shootTimer -= delta;
        if (this.shootTimer <= 0 && this.sprite.y > 100) {
          this.shootTimer = ELITE_SHOOT_INTERVAL;
          this.sprite.emit('eliteShoot', this.sprite.x, this.sprite.y + 20);
        }
        break;
    }
  }

  public shouldDropPowerUp(): boolean {
    return Math.random() < POWERUP_DROP_CHANCE;
  }
}

export class EnemyManager {
  private scene: Phaser.Scene;
  private enemies: Enemy[] = [];
  private waveTimer: number = 0;
  private waveInterval: number = BASE_WAVE_INTERVAL;
  private waveNumber: number = 0;
  private onEnemyShootCallback: (x: number, y: number, type: EnemyType) => void;
  private onEnemyKilledCallback: (enemy: Enemy) => void;

  constructor(
    scene: Phaser.Scene,
    onEnemyShootCallback: (x: number, y: number, type: EnemyType) => void,
    onEnemyKilledCallback: (enemy: Enemy) => void
  ) {
    this.scene = scene;
    this.onEnemyShootCallback = onEnemyShootCallback;
    this.onEnemyKilledCallback = onEnemyKilledCallback;
  }

  public create(): void {
    this.waveTimer = 2000;
    this.waveInterval = BASE_WAVE_INTERVAL;
    this.waveNumber = 0;
  }

  public update(time: number, delta: number, playerX: number, playerY: number): void {
    const state = stateManager.getState();
    if (state.isGameOver || state.isPaused) return;

    this.waveTimer -= delta;
    if (this.waveTimer <= 0) {
      this.spawnWave();
      this.waveTimer = this.waveInterval;
      this.waveInterval = Math.max(MIN_WAVE_INTERVAL, this.waveInterval - WAVE_INTERVAL_DECREASE);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta, playerX, playerY);

      if (enemy.sprite.y > this.scene.scale.height + 50) {
        this.removeEnemy(enemy);
      }
    }
  }

  private spawnWave(): void {
    this.waveNumber++;
    stateManager.incrementWave();

    const baseCount = 3 + Math.floor(this.waveNumber * 0.5);
    const count = Math.min(baseCount, MAX_ENEMIES - this.enemies.length);

    if (count <= 0) return;

    for (let i = 0; i < count; i++) {
      const type = this.getRandomEnemyType();
      const x = Phaser.Math.Between(50, this.scene.scale.width - 50);
      const y = -50 - i * 40;

      setTimeout(() => {
        this.spawnEnemy(type, x, y);
      }, i * 200);
    }
  }

  private getRandomEnemyType(): EnemyType {
    const roll = Math.random();
    const waveNum = this.waveNumber;

    const eliteChance = Math.min(0.05 + waveNum * 0.02, 0.25);
    const trackerChance = Math.min(0.2 + waveNum * 0.03, 0.4);

    if (roll < eliteChance) {
      return EnemyType.ELITE;
    } else if (roll < eliteChance + trackerChance) {
      return EnemyType.TRACKER;
    }
    return EnemyType.BASIC;
  }

  public spawnEnemy(type: EnemyType, x: number, y: number): Enemy | null {
    if (this.enemies.length >= MAX_ENEMIES) {
      return null;
    }

    const config = ENEMY_CONFIGS[type];
    const sprite = this.scene.physics.add.sprite(x, y, config.assetKey);
    sprite.setDepth(3);

    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(config.width * 0.6, config.height * 0.6);
    body.setCollideWorldBounds(false);

    const enemy = new Enemy(sprite, config);

    sprite.on('eliteShoot', (sx: number, sy: number) => {
      this.onEnemyShootCallback(sx, sy, type);
    });

    this.enemies.push(enemy);
    return enemy;
  }

  public checkBulletCollision(
    bulletGroup: Phaser.Physics.Arcade.Group,
    isPlayerBullet: boolean
  ): number {
    let score = 0;

    const bullets = bulletGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];

    for (const bullet of bullets) {
      if (!bullet.active) continue;

      for (const enemy of this.enemies) {
        if (enemy.isDead) continue;

        if (Phaser.Geom.Intersects.RectangleToRectangle(
          bullet.getBounds(),
          enemy.sprite.getBounds()
        )) {
          if (isPlayerBullet) {
            bulletGroup.killAndHide(bullet);
            const killed = enemy.takeDamage(1);
            if (killed) {
              score += enemy.score;
              this.onEnemyKilledCallback(enemy);
              this.removeEnemy(enemy);
            }
          }
          break;
        }
      }
    }

    return score;
  }

  public checkPlayerCollision(playerSprite: Phaser.GameObjects.Sprite): boolean {
    const playerBounds = playerSprite.getBounds();

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      if (Phaser.Geom.Intersects.RectangleToRectangle(
        playerBounds,
        enemy.sprite.getBounds()
      )) {
        return true;
      }
    }
    return false;
  }

  private removeEnemy(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
    }
    enemy.sprite.destroy();
  }

  public getEnemies(): Enemy[] {
    return this.enemies;
  }

  public getEnemyCount(): number {
    return this.enemies.length;
  }

  public getWaveNumber(): number {
    return this.waveNumber;
  }

  public clearAll(): void {
    this.enemies.forEach((enemy) => enemy.sprite.destroy());
    this.enemies = [];
    this.waveNumber = 0;
    this.waveInterval = BASE_WAVE_INTERVAL;
    this.waveTimer = 2000;
  }
}
