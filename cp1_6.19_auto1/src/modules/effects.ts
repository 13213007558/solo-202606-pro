import Phaser from 'phaser';
import { ASSET_KEYS } from '../utils/assetLoader';

const STAR_COUNT = 150;
const STAR_LAYERS = 3;

export class EffectsManager {
  private scene: Phaser.Scene;
  private starLayers: { stars: Phaser.GameObjects.Graphics; speed: number }[] = [];
  private nebulaTween!: Phaser.Tweens.Tween;
  private nebulaColor: number = 0x0a0a2e;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    this.createNebulaBackground();
    this.createStarfield();
  }

  private createNebulaBackground(): void {
    const bg = this.scene.add.graphics();
    bg.setDepth(-10);
    this.updateNebulaColor(bg, this.nebulaColor);

    const colorValues = [
      0x0a0a2e,
      0x1a0a3e,
      0x0d1a4a,
      0x1e1050,
      0x0a1a3a
    ];

    let colorIndex = 0;
    this.scene.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => {
        colorIndex = (colorIndex + 1) % colorValues.length;
        const fromColor = this.nebulaColor;
        const toColor = colorValues[colorIndex];

        this.scene.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 3000,
          onUpdate: (tween) => {
            const value = tween.getValue();
            const r = Math.floor(Phaser.Math.Linear(
              (fromColor >> 16) & 0xff,
              (toColor >> 16) & 0xff,
              value
            ));
            const g = Math.floor(Phaser.Math.Linear(
              (fromColor >> 8) & 0xff,
              (toColor >> 8) & 0xff,
              value
            ));
            const b = Math.floor(Phaser.Math.Linear(
              fromColor & 0xff,
              toColor & 0xff,
              value
            ));
            this.nebulaColor = (r << 16) | (g << 8) | b;
            this.updateNebulaColor(bg, this.nebulaColor);
          }
        });
      }
    });
  }

  private updateNebulaColor(g: Phaser.GameObjects.Graphics, color: number): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    g.clear();

    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);

    const r = ((color >> 16) & 0xff) / 255;
    const gVal = ((color >> 8) & 0xff) / 255;
    const b = (color & 0xff) / 255;

    const gradientColors = [
      { x: w * 0.2, y: h * 0.3, r: r * 1.2, g: gVal * 0.8, b: b * 1.5, alpha: 0.3, radius: h * 0.4 },
      { x: w * 0.8, y: h * 0.7, r: r * 0.8, g: gVal * 1.2, b: b * 1.3, alpha: 0.25, radius: h * 0.35 },
      { x: w * 0.5, y: h * 0.5, r: r * 1.5, g: gVal * 0.7, b: b * 1.1, alpha: 0.15, radius: h * 0.5 }
    ];

    gradientColors.forEach((gc) => {
      const steps = 20;
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const alpha = gc.alpha * (1 - t);
        const radius = gc.radius * t;
        const fillColor = Phaser.Display.Color.GetColor(
          Math.floor(gc.r * 255),
          Math.floor(gc.g * 255),
          Math.floor(gc.b * 255)
        );
        g.fillStyle(fillColor, alpha);
        g.fillCircle(gc.x, gc.y, radius);
      }
    });
  }

  private createStarfield(): void {
    for (let i = 0; i < STAR_LAYERS; i++) {
      const stars = this.scene.add.graphics();
      stars.setDepth(-9 + i);

      const speed = 20 + i * 30;
      const starData: { x: number; y: number; size: number; alpha: number }[] = [];

      const count = Math.floor(STAR_COUNT / STAR_LAYERS) * (i + 1);
      for (let j = 0; j < count; j++) {
        starData.push({
          x: Math.random() * this.scene.scale.width,
          y: Math.random() * this.scene.scale.height,
          size: 1 + Math.random() * (i + 1),
          alpha: 0.3 + Math.random() * 0.7
        });
      }

      (stars as any).starData = starData;

      this.starLayers.push({ stars, speed });
    }
  }

  public update(time: number, delta: number): void {
    const state = (this.scene as any).gameState;

    this.starLayers.forEach((layer) => {
      const stars = layer.stars as any;
      const starData = stars.starData as { x: number; y: number; size: number; alpha: number }[];
      const speed = layer.speed;

      stars.clear();

      starData.forEach((star) => {
        star.y += speed * (delta / 1000);
        if (star.y > this.scene.scale.height + 10) {
          star.y = -10;
          star.x = Math.random() * this.scene.scale.width;
        }

        stars.fillStyle(0xffffff, star.alpha);
        stars.fillRect(star.x, star.y, star.size, star.size);
      });
    });
  }

  public createExplosion(x: number, y: number, size: number = 1): void {
    const particles = this.scene.add.particles(x, y, ASSET_KEYS.PARTICLE, {
      lifespan: { min: 300, max: 600 },
      speed: { min: 50, max: 200 * size },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5 * size, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffff00, 0xff8800, 0xff0000],
      quantity: 15 * Math.ceil(size),
      blendMode: 'ADD'
    });

    particles.setDepth(20);

    this.scene.time.delayedCall(700, () => {
      particles.destroy();
    });

    const flash = this.scene.add.circle(x, y, 30 * size, 0xffffff, 0.8);
    flash.setDepth(21);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 0.5,
      duration: 150,
      onComplete: () => flash.destroy()
    });

    const fragments = 8;
    for (let i = 0; i < fragments; i++) {
      const angle = (Math.PI * 2 * i) / fragments + Math.random() * 0.5;
      const fragSpeed = 80 + Math.random() * 60 * size;
      const fragSize = 2 + Math.random() * 3 * size;

      const frag = this.scene.add.rectangle(x, y, fragSize, fragSize, 0xffaa00, 1);
      frag.setDepth(19);

      this.scene.tweens.add({
        targets: frag,
        x: x + Math.cos(angle) * 80 * size,
        y: y + Math.sin(angle) * 80 * size,
        angle: Math.random() * 360,
        alpha: 0,
        scale: 0.5,
        duration: 500 + Math.random() * 200,
        onComplete: () => frag.destroy()
      });
    }
  }

  public createGlow(x: number, y: number, color: number, radius: number = 30, alpha: number = 0.3): Phaser.GameObjects.Graphics {
    const glow = this.scene.add.graphics();

    const steps = 10;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const r = radius * t;
      const a = alpha * (1 - t);
      glow.fillStyle(color, a);
      glow.fillCircle(0, 0, r);
    }

    glow.setPosition(x, y);
    return glow;
  }

  public createPlayerDeathExplosion(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.createExplosion(
          x + Phaser.Math.Between(-20, 20),
          y + Phaser.Math.Between(-20, 20),
          1.5
        );
      }, i * 150);
    }

    const flash = this.scene.add.circle(x, y, 80, 0x00ffff, 0.5);
    flash.setDepth(25);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 500,
      onComplete: () => flash.destroy()
    });
  }

  public createPowerupGlow(powerup: Phaser.GameObjects.Sprite): void {
    const glow = this.scene.add.circle(0, 0, 20, 0xff6600, 0.3);
    glow.setDepth(1);

    this.scene.tweens.add({
      targets: glow,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 0.2, to: 0.5 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    powerup.on('destroy', () => glow.destroy());
  }

  public destroy(): void {
    this.starLayers.forEach((layer) => layer.stars.destroy());
    this.starLayers = [];
  }
}
