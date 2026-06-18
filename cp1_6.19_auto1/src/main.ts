import Phaser from 'phaser';
import { AssetLoader } from './utils/assetLoader';
import { stateManager } from './utils/stateManager';
import { Player } from './modules/player';
import { EnemyManager, Enemy, EnemyType } from './modules/enemy';
import { BulletManager } from './modules/bullet';
import { HUD } from './modules/hud';
import { EffectsManager } from './modules/effects';
import { ASSET_KEYS } from './utils/assetLoader';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const POWERUP_SPEED = 80;

class GameScene extends Phaser.Scene {
  private assetLoader!: AssetLoader;
  private player!: Player;
  private enemyManager!: EnemyManager;
  private bulletManager!: BulletManager;
  private hud!: HUD;
  private effectsManager!: EffectsManager;
  private powerups: Phaser.Physics.Arcade.Sprite[] = [];
  private gameStarted: boolean = false;
  private lastWaveShown: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  public preload(): void {}

  public create(): void {
    this.assetLoader = new AssetLoader(this);
    this.assetLoader.loadAll();

    this.effectsManager = new EffectsManager(this);
    this.effectsManager.create();

    this.bulletManager = new BulletManager(this);
    this.bulletManager.create();

    this.enemyManager = new EnemyManager(
      this,
      (x, y, type) => this.handleEnemyShoot(x, y, type),
      (enemy) => this.handleEnemyKilled(enemy)
    );
    this.enemyManager.create();

    this.player = new Player(this, (x, y, level) => {
      this.bulletManager.firePlayerBullet(x, y, level);
    });
    this.player.create(GAME_WIDTH / 2, GAME_HEIGHT - 80);

    this.hud = new HUD(this);
    this.hud.create();

    this.hud.showStartMenu(() => this.startGame());

    this.setupCollisionCallbacks();
  }

  private setupCollisionCallbacks(): void {
    stateManager.subscribe((state) => {
      if (state.isGameOver && this.gameStarted) {
        this.triggerGameOver();
      }
      if (state.waveNumber !== this.lastWaveShown && state.waveNumber > 0) {
        this.lastWaveShown = state.waveNumber;
        this.hud.showWaveText(state.waveNumber);
      }
    });
  }

  private startGame(): void {
    this.gameStarted = true;
    stateManager.reset();
    this.resetGameObjects();
  }

  private resetGameObjects(): void {
    this.enemyManager.clearAll();
    this.bulletManager.clearAll();
    this.clearPowerups();

    const playerSprite = this.player.getSprite();
    playerSprite.setPosition(GAME_WIDTH / 2, GAME_HEIGHT - 80);
    playerSprite.setVisible(true);
    playerSprite.setActive(true);

    stateManager.setInvincible(2000);
    this.lastWaveShown = 0;
  }

  private triggerGameOver(): void {
    const pos = this.player.getPosition();
    this.effectsManager.createPlayerDeathExplosion(pos.x, pos.y);

    this.time.delayedCall(1500, () => {
      const state = stateManager.getState();
      this.hud.showGameOver(state.score, state.highScore, () => {
        this.restartGame();
      });
    });
  }

  private restartGame(): void {
    stateManager.reset();
    this.resetGameObjects();
    this.gameStarted = true;
  }

  public update(time: number, delta: number): void {
    const state = stateManager.getState();

    if (!this.gameStarted || state.isPaused) return;

    this.effectsManager.update(time, delta);

    if (!state.isGameOver) {
      this.player.update(time, delta);

      const playerPos = this.player.getPosition();
      this.enemyManager.update(time, delta, playerPos.x, playerPos.y);

      this.bulletManager.update(time, delta);

      this.updatePowerups(delta);

      this.checkCollisions();

      stateManager.updatePowerUpTimer(delta);
      stateManager.updateInvincibleTimer(delta);
    }

    this.hud.update(time, delta);
  }

  private handleEnemyShoot(x: number, y: number, type: EnemyType): void {
    const state = stateManager.getState();
    if (state.isGameOver) return;

    if (type === EnemyType.ELITE) {
      this.bulletManager.fireEnemySpread(x, y, 5, Math.PI / 3, Math.PI / 2);
    }
  }

  private handleEnemyKilled(enemy: Enemy): void {
    this.effectsManager.createExplosion(
      enemy.sprite.x,
      enemy.sprite.y,
      enemy.type === EnemyType.ELITE ? 1.5 : 1
    );

    stateManager.addScore(enemy.score);

    if (enemy.shouldDropPowerUp()) {
      this.spawnPowerup(enemy.sprite.x, enemy.sprite.y);
    }
  }

  private spawnPowerup(x: number, y: number): void {
    const powerup = this.physics.add.sprite(x, y, ASSET_KEYS.POWERUP_FIRE);
    powerup.setDepth(2);
    powerup.setVelocity(0, POWERUP_SPEED);

    const body = powerup.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 26);

    this.tweens.add({
      targets: powerup,
      angle: 360,
      duration: 2000,
      repeat: -1,
      ease: 'Linear'
    });

    this.effectsManager.createPowerupGlow(powerup);

    this.powerups.push(powerup);
  }

  private updatePowerups(delta: number): void {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const powerup = this.powerups[i];
      if (powerup.y > GAME_HEIGHT + 50) {
        powerup.destroy();
        this.powerups.splice(i, 1);
      }
    }
  }

  private clearPowerups(): void {
    this.powerups.forEach((p) => p.destroy());
    this.powerups = [];
  }

  private checkCollisions(): void {
    const state = stateManager.getState();
    if (state.isGameOver) return;

    const playerSprite = this.player.getSprite();

    if (!state.isInvincible) {
      if (this.enemyManager.checkPlayerCollision(playerSprite)) {
        this.player.hit();
        return;
      }

      const enemyBullets = this.bulletManager.getEnemyBullets();
      const bullets = enemyBullets.getChildren() as Phaser.Physics.Arcade.Sprite[];
      for (const bullet of bullets) {
        if (!bullet.active) continue;
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          bullet.getBounds(),
          playerSprite.getBounds()
        )) {
          this.bulletManager.killEnemyBullet(bullet);
          this.player.hit();
          return;
        }
      }
    }

    const playerBullets = this.bulletManager.getPlayerBullets();
    this.enemyManager.checkBulletCollision(playerBullets, true);

    if (!state.isInvincible) {
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const powerup = this.powerups[i];
        if (Phaser.Geom.Intersects.RectangleToRectangle(
          powerup.getBounds(),
          playerSprite.getBounds()
        )) {
          this.collectPowerup(powerup);
          this.powerups.splice(i, 1);
        }
      }
    }
  }

  private collectPowerup(powerup: Phaser.Physics.Arcade.Sprite): void {
    stateManager.collectPowerUp();
    this.effectsManager.createExplosion(powerup.x, powerup.y, 0.5);
    powerup.destroy();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0a0a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  scene: [GameScene]
};

new Phaser.Game(config);
