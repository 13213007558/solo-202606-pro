import Phaser from 'phaser';
import { ASSET_KEYS } from '../utils/assetLoader';
import { PowerUpLevel } from '../utils/stateManager';

const PLAYER_BULLET_SPEED = 700;
const ENEMY_BULLET_SPEED = 250;
const MAX_PLAYER_BULLETS = 100;
const MAX_ENEMY_BULLETS = 100;

export interface Bullet extends Phaser.Physics.Arcade.Sprite {
  isPlayer: boolean;
  damage: number;
}

export class BulletManager {
  private scene: Phaser.Scene;
  private playerBullets: Phaser.Physics.Arcade.Group;
  private enemyBullets: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.playerBullets = this.scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: MAX_PLAYER_BULLETS,
      allowGravity: false,
      immovable: false
    });

    this.enemyBullets = this.scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: MAX_ENEMY_BULLETS,
      allowGravity: false,
      immovable: false
    });
  }

  public create(): void {}

  public firePlayerBullet(x: number, y: number, powerLevel: PowerUpLevel): void {
    const bullets: Phaser.Physics.Arcade.Sprite[] = [];

    switch (powerLevel) {
      case 0:
        bullets.push(this.spawnPlayerBullet(x, y, 0, -PLAYER_BULLET_SPEED));
        break;
      case 1:
        bullets.push(this.spawnPlayerBullet(x - 10, y, 0, -PLAYER_BULLET_SPEED));
        bullets.push(this.spawnPlayerBullet(x + 10, y, 0, -PLAYER_BULLET_SPEED));
        break;
      case 2:
        bullets.push(this.spawnPlayerBullet(x, y - 5, 0, -PLAYER_BULLET_SPEED));
        const spreadAngle = Math.PI / 12;
        const speedX = PLAYER_BULLET_SPEED * Math.sin(spreadAngle);
        const speedY = -PLAYER_BULLET_SPEED * Math.cos(spreadAngle);
        bullets.push(this.spawnPlayerBullet(x - 15, y, -speedX, speedY));
        bullets.push(this.spawnPlayerBullet(x + 15, y, speedX, speedY));
        break;
    }

    bullets.forEach((b) => {
      if (b) {
        b.setActive(true);
        b.setVisible(true);
      }
    });
  }

  private spawnPlayerBullet(
    x: number,
    y: number,
    vx: number,
    vy: number
  ): Phaser.Physics.Arcade.Sprite {
    const bullet = this.playerBullets.get(x, y, ASSET_KEYS.BULLET_PLAYER) as
      | Phaser.Physics.Arcade.Sprite
      | undefined;

    if (!bullet) {
      const oldest = this.findOldestActive(this.playerBullets);
      if (oldest) {
        oldest.setPosition(x, y);
        oldest.setVelocity(vx, vy);
        return oldest;
      }
      return this.playerBullets.getFirstDead(true) as Phaser.Physics.Arcade.Sprite;
    }

    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setVelocity(vx, vy);
    bullet.setDepth(5);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(4, 12);
    }

    return bullet;
  }

  public fireEnemyBullet(x: number, y: number, vx: number, vy: number): void {
    const bullet = this.enemyBullets.get(x, y, ASSET_KEYS.BULLET_ENEMY) as
      | Phaser.Physics.Arcade.Sprite
      | undefined;

    if (!bullet) {
      const oldest = this.findOldestActive(this.enemyBullets);
      if (oldest) {
        oldest.setPosition(x, y);
        oldest.setVelocity(vx, vy);
        return;
      }
      return;
    }

    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setVelocity(vx, vy);
    bullet.setDepth(4);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(8, 8);
    }
  }

  public fireEnemySpread(
    x: number,
    y: number,
    count: number,
    spreadAngle: number,
    baseAngle: number = Math.PI / 2
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = baseAngle - spreadAngle / 2 + (spreadAngle * i) / (count - 1 || 1);
      const vx = ENEMY_BULLET_SPEED * Math.cos(angle);
      const vy = ENEMY_BULLET_SPEED * Math.sin(angle);
      this.fireEnemyBullet(x, y, vx, vy);
    }
  }

  private findOldestActive(group: Phaser.Physics.Arcade.Group): Phaser.Physics.Arcade.Sprite | null {
    const children = group.getChildren() as Phaser.Physics.Arcade.Sprite[];
    const active = children.filter((c) => c.active);
    if (active.length === 0) return null;
    return active[0] || null;
  }

  public update(time: number, delta: number): void {
    this.cleanupBullets();
  }

  private cleanupBullets(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const margin = 50;

    this.playerBullets.getChildren().forEach((child) => {
      const bullet = child as Phaser.Physics.Arcade.Sprite;
      if (bullet.active && (bullet.y < -margin || bullet.y > height + margin || bullet.x < -margin || bullet.x > width + margin)) {
        this.playerBullets.killAndHide(bullet);
      }
    });

    this.enemyBullets.getChildren().forEach((child) => {
      const bullet = child as Phaser.Physics.Arcade.Sprite;
      if (bullet.active && (bullet.y < -margin || bullet.y > height + margin || bullet.x < -margin || bullet.x > width + margin)) {
        this.enemyBullets.killAndHide(bullet);
      }
    });
  }

  public getPlayerBullets(): Phaser.Physics.Arcade.Group {
    return this.playerBullets;
  }

  public getEnemyBullets(): Phaser.Physics.Arcade.Group {
    return this.enemyBullets;
  }

  public killPlayerBullet(bullet: Phaser.Physics.Arcade.Sprite): void {
    this.playerBullets.killAndHide(bullet);
  }

  public killEnemyBullet(bullet: Phaser.Physics.Arcade.Sprite): void {
    this.enemyBullets.killAndHide(bullet);
  }

  public getTotalBulletCount(): number {
    return (
      this.playerBullets.countActive(true) + this.enemyBullets.countActive(true)
    );
  }

  public clearAll(): void {
    this.playerBullets.clear(true, true);
    this.enemyBullets.clear(true, true);
  }
}
