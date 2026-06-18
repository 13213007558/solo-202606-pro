import Phaser from 'phaser';

export const ASSET_KEYS = {
  PLAYER: 'player',
  PLAYER_THRUST: 'playerThrust',
  ENEMY_BASIC: 'enemyBasic',
  ENEMY_TRACKER: 'enemyTracker',
  ENEMY_ELITE: 'enemyElite',
  BULLET_PLAYER: 'bulletPlayer',
  BULLET_ENEMY: 'bulletEnemy',
  POWERUP_FIRE: 'powerupFire',
  EXPLOSION: 'explosion',
  PARTICLE: 'particle',
  STARFIELD: 'starfield',
  HUD_PANEL: 'hudPanel',
  LIFE_ICON: 'lifeIcon',
  ENERGY_BAR: 'energyBar'
} as const;

export class AssetLoader {
  private scene: Phaser.Scene;
  private loaded: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public isLoaded(): boolean {
    return this.loaded;
  }

  public loadAll(): void {
    this.generateTextures();
    this.loaded = true;
  }

  private generateTextures(): void {
    const g = this.scene.add.graphics();

    this.generatePlayerTexture(g);
    this.generateEnemyBasicTexture(g);
    this.generateEnemyTrackerTexture(g);
    this.generateEnemyEliteTexture(g);
    this.generateBulletPlayerTexture(g);
    this.generateBulletEnemyTexture(g);
    this.generatePowerupFireTexture(g);
    this.generateExplosionTexture(g);
    this.generateParticleTexture(g);
    this.generateLifeIconTexture(g);

    g.destroy();
  }

  private generatePlayerTexture(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    g.lineStyle(2, 0x00ffff, 1);
    g.fillStyle(0x0066cc, 1);

    g.beginPath();
    g.moveTo(0, -20);
    g.lineTo(15, 15);
    g.lineTo(5, 10);
    g.lineTo(0, 18);
    g.lineTo(-5, 10);
    g.lineTo(-15, 15);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(0x00ffff, 0.8);
    g.beginPath();
    g.moveTo(0, -10);
    g.lineTo(6, 5);
    g.lineTo(-6, 5);
    g.closePath();
    g.fillPath();

    g.generateTexture(ASSET_KEYS.PLAYER, 40, 40);
  }

  private generateEnemyBasicTexture(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    g.lineStyle(2, 0xff3333, 1);
    g.fillStyle(0x990000, 1);

    g.beginPath();
    g.moveTo(0, 15);
    g.lineTo(15, -10);
    g.lineTo(8, -15);
    g.lineTo(-8, -15);
    g.lineTo(-15, -10);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(0xffff00, 1);
    g.fillCircle(0, -5, 4);

    g.generateTexture(ASSET_KEYS.ENEMY_BASIC, 34, 32);
  }

  private generateEnemyTrackerTexture(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    g.lineStyle(2, 0xff00ff, 1);
    g.fillStyle(0x660066, 1);

    g.beginPath();
    g.moveTo(0, 18);
    g.lineTo(12, 5);
    g.lineTo(15, -10);
    g.lineTo(0, -18);
    g.lineTo(-15, -10);
    g.lineTo(-12, 5);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(0xff00ff, 0.9);
    g.fillCircle(0, -5, 5);

    g.generateTexture(ASSET_KEYS.ENEMY_TRACKER, 36, 38);
  }

  private generateEnemyEliteTexture(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    g.lineStyle(3, 0xffaa00, 1);
    g.fillStyle(0xcc5500, 1);

    g.beginPath();
    g.moveTo(0, 25);
    g.lineTo(20, 10);
    g.lineTo(25, -10);
    g.lineTo(10, -20);
    g.lineTo(-10, -20);
    g.lineTo(-25, -10);
    g.lineTo(-20, 10);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(0xffcc00, 1);
    g.fillCircle(0, -5, 7);
    g.fillStyle(0xff0000, 1);
    g.fillCircle(0, -5, 3);

    g.fillStyle(0xffaa00, 0.8);
    g.fillTriangle(-22, -5, -30, 0, -22, 5);
    g.fillTriangle(22, -5, 30, 0, 22, 5);

    g.generateTexture(ASSET_KEYS.ENEMY_ELITE, 60, 50);
  }

  private generateBulletPlayerTexture(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    g.fillStyle(0x00ffff, 1);
    g.fillRect(-2, -8, 4, 16);
    g.fillStyle(0xffffff, 1);
    g.fillRect(-1, -6, 2, 12);

    g.generateTexture(ASSET_KEYS.BULLET_PLAYER, 6, 18);
  }

  private generateBulletEnemyTexture(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    g.fillStyle(0xff4444, 1);
    g.fillCircle(0, 0, 5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(0, 0, 2);

    g.generateTexture(ASSET_KEYS.BULLET_ENEMY, 12, 12);
  }

  private generatePowerupFireTexture(g: Phaser.GameObjects.Graphics): void {
    g.clear();

    g.fillStyle(0xff6600, 1);
    g.beginPath();
    g.moveTo(0, 15);
    g.lineTo(10, 0);
    g.lineTo(6, -10);
    g.lineTo(0, -15);
    g.lineTo(-6, -10);
    g.lineTo(-10, 0);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffff00, 1);
    g.beginPath();
    g.moveTo(0, 10);
    g.lineTo(6, 0);
    g.lineTo(0, -8);
    g.lineTo(-6, 0);
    g.closePath();
    g.fillPath();

    g.generateTexture(ASSET_KEYS.POWERUP_FIRE, 22, 32);
  }

  private generateExplosionTexture(g: Phaser.GameObjects.Graphics): void {
    g.clear();

    const frames: Phaser.Types.Textures.GenerateTextureFrameConfig[] = [];
    const numFrames = 8;

    for (let i = 0; i < numFrames; i++) {
      const progress = i / (numFrames - 1);
      const radius = 10 + progress * 30;
      const alpha = 1 - progress * 0.7;

      g.clear();
      g.fillStyle(0xffff00, alpha);
      g.fillCircle(0, 0, radius * 0.5);
      g.fillStyle(0xff8800, alpha * 0.8);
      g.fillCircle(0, 0, radius * 0.8);
      g.fillStyle(0xff0000, alpha * 0.5);
      g.fillCircle(0, 0, radius);

      frames.push({
        key: `explosion_frame_${i}`,
        x: -radius - 2,
        y: -radius - 2,
        width: (radius + 2) * 2,
        height: (radius + 2) * 2
      });
    }

    g.generateTexture(ASSET_KEYS.EXPLOSION, 90, 90);
  }

  private generateParticleTexture(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(0, 0, 3);
    g.generateTexture(ASSET_KEYS.PARTICLE, 8, 8);
  }

  private generateLifeIconTexture(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    g.lineStyle(1, 0x00ffff, 1);
    g.fillStyle(0x0066cc, 1);

    g.beginPath();
    g.moveTo(0, -12);
    g.lineTo(9, 9);
    g.lineTo(3, 6);
    g.lineTo(0, 11);
    g.lineTo(-3, 6);
    g.lineTo(-9, 9);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.generateTexture(ASSET_KEYS.LIFE_ICON, 22, 26);
  }
}
