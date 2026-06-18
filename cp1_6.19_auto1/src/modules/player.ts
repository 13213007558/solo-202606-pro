import Phaser from 'phaser';
import { ASSET_KEYS } from '../utils/assetLoader';
import { stateManager, PowerUpLevel } from '../utils/stateManager';

const PLAYER_SPEED = 350;
const BULLET_SPEED = 700;
const SHOOT_COOLDOWN = 150;
const INVINCIBLE_BLINK_RATE = 100;

export class Player {
  private scene: Phaser.Scene;
  private sprite!: Phaser.GameObjects.Sprite;
  private body!: Phaser.Physics.Arcade.Body;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private shootKey!: Phaser.Input.Keyboard.Key;
  private shootTimer: number = 0;
  private isShooting: boolean = false;
  private shootBlocked: boolean = false;
  private blinkTimer: number = 0;
  private thrusterPaused: boolean = false;
  private thrusterParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private onShootCallback: (x: number, y: number, level: PowerUpLevel) => void;

  constructor(
    scene: Phaser.Scene,
    onShootCallback: (x: number, y: number, level: PowerUpLevel) => void
  ) {
    this.scene = scene;
    this.onShootCallback = onShootCallback;
  }

  public create(x: number, y: number): void {
    this.sprite = this.scene.add.sprite(x, y, ASSET_KEYS.PLAYER);
    this.sprite.setDepth(10);

    this.scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setSize(20, 28);
    this.body.setOffset(0, -2);

    this.setupInput();
    this.setupThrusterParticles();

    stateManager.setInvincible(2000);
  }

  private setupInput(): void {
    const input = this.scene.input.keyboard;
    if (!input) return;

    this.cursors = input.createCursorKeys();
    this.wasdKeys = {
      up: input.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: input.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: input.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: input.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    this.shootKey = input.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private setupThrusterParticles(): void {
    this.thrusterParticles = this.scene.add.particles(0, 0, ASSET_KEYS.PARTICLE, {
      lifespan: 400,
      speed: { min: 50, max: 100 },
      angle: { min: 80, max: 100 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0x00ffff,
      quantity: 2,
      frequency: 30,
      follow: this.sprite,
      followOffset: { x: 0, y: 18 }
    });
    this.thrusterParticles.setDepth(9);
  }

  public update(time: number, delta: number): void {
    this.handleMovement(delta);
    this.handleShooting(delta);
    this.updateInvincibility(delta);
    this.updateThruster();
  }

  public setPaused(paused: boolean): void {
    if (paused) {
      this.thrusterParticles.pause();
      this.thrusterPaused = true;
      this.isShooting = false;
    } else {
      this.thrusterParticles.resume();
      this.thrusterPaused = false;
      this.shootBlocked = true;
      this.isShooting = false;
    }
  }

  private handleMovement(delta: number): void {
    const state = stateManager.getState();
    if (state.isGameOver || state.isPaused) {
      this.body.setVelocity(0, 0);
      return;
    }

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasdKeys.left.isDown) {
      vx -= PLAYER_SPEED;
    }
    if (this.cursors.right.isDown || this.wasdKeys.right.isDown) {
      vx += PLAYER_SPEED;
    }
    if (this.cursors.up.isDown || this.wasdKeys.up.isDown) {
      vy -= PLAYER_SPEED;
    }
    if (this.cursors.down.isDown || this.wasdKeys.down.isDown) {
      vy += PLAYER_SPEED;
    }

    if (vx !== 0 && vy !== 0) {
      const factor = 1 / Math.sqrt(2);
      vx *= factor;
      vy *= factor;
    }

    this.body.setVelocity(vx, vy);

    if (vx !== 0) {
      this.sprite.setAngle(vx > 0 ? 10 : -10);
    } else {
      this.sprite.setAngle(0);
    }
  }

  private handleShooting(delta: number): void {
    const state = stateManager.getState();
    if (state.isGameOver || state.isPaused) {
      this.isShooting = false;
      return;
    }

    const isDown = this.shootKey.isDown;

    if (this.shootBlocked) {
      if (!isDown) {
        this.shootBlocked = false;
      }
      this.isShooting = false;
    } else {
      this.isShooting = isDown;
    }

    if (this.shootTimer > 0) {
      this.shootTimer -= delta;
    }

    if (this.isShooting && this.shootTimer <= 0) {
      this.shoot();
      this.shootTimer = SHOOT_COOLDOWN;
    }
  }

  private shoot(): void {
    const state = stateManager.getState();
    const x = this.sprite.x;
    const y = this.sprite.y - 20;
    this.onShootCallback(x, y, state.powerUpLevel);
  }

  private updateInvincibility(delta: number): void {
    const state = stateManager.getState();

    if (state.isInvincible) {
      this.blinkTimer += delta;
      if (this.blinkTimer >= INVINCIBLE_BLINK_RATE) {
        this.blinkTimer = 0;
        this.sprite.setVisible(!this.sprite.visible);
      }
    } else {
      this.sprite.setVisible(true);
    }
  }

  private updateThruster(): void {
    const state = stateManager.getState();
    if (state.isGameOver) {
      if (!this.thrusterPaused) {
        this.thrusterParticles.pause();
        this.thrusterPaused = true;
      }
      return;
    }

    if (this.thrusterPaused) {
      this.thrusterParticles.resume();
      this.thrusterPaused = false;
    }

    const speed = Math.hypot(this.body.velocity.x, this.body.velocity.y);
    this.thrusterParticles.quantity = speed > 100 ? 3 : 2;
  }

  public getSprite(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  public hit(): boolean {
    return stateManager.loseLife();
  }

  public destroy(): void {
    this.thrusterParticles.destroy();
    this.sprite.destroy();
  }
}
