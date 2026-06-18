import Phaser from 'phaser';
import { ASSET_KEYS } from '../utils/assetLoader';
import { stateManager, GameState } from '../utils/stateManager';

export class HUD {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private energyBarBg!: Phaser.GameObjects.Graphics;
  private energyBarFill!: Phaser.GameObjects.Graphics;
  private energyBarText!: Phaser.GameObjects.Text;
  private panelBg!: Phaser.GameObjects.Graphics;
  private waveText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    this.container = this.scene.add.container(20, 20);
    this.container.setDepth(100);
    this.container.setScrollFactor(0);

    this.createPanel();
    this.createScoreDisplay();
    this.createLifeDisplay();
    this.createEnergyBar();
    this.createWaveDisplay();

    stateManager.subscribe((state) => this.updateHUD(state));

    const initialState = stateManager.getState();
    this.updateHUD(initialState);
  }

  private createPanel(): void {
    this.panelBg = this.scene.add.graphics();
    this.panelBg.fillStyle(0x000000, 0.5);
    this.panelBg.lineStyle(2, 0x00ffff, 0.6);
    this.panelBg.fillRoundedRect(0, 0, 200, 120, 10);
    this.panelBg.strokeRoundedRect(0, 0, 200, 120, 10);
    this.container.add(this.panelBg);
  }

  private createScoreDisplay(): void {
    this.scoreText = this.scene.add.text(15, 12, 'SCORE: 0', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#00ffff',
      fontStyle: 'bold'
    });
    this.scoreText.setShadow(2, 2, '#000000', 2);
    this.container.add(this.scoreText);

    this.highScoreText = this.scene.add.text(15, 32, 'HI: 0', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffcc00',
      fontStyle: 'bold'
    });
    this.highScoreText.setShadow(2, 2, '#000000', 2);
    this.container.add(this.highScoreText);
  }

  private createLifeDisplay(): void {
    const label = this.scene.add.text(15, 52, 'LIVES:', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.container.add(label);

    const state = stateManager.getState();
    for (let i = 0; i < state.maxLives; i++) {
      const icon = this.scene.add.image(75 + i * 28, 62, ASSET_KEYS.LIFE_ICON);
      icon.setOrigin(0, 0.5);
      icon.setScale(0.9);
      this.lifeIcons.push(icon);
      this.container.add(icon);
    }
  }

  private createEnergyBar(): void {
    const label = this.scene.add.text(15, 78, 'POWER:', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.container.add(label);

    this.energyBarBg = this.scene.add.graphics();
    this.energyBarBg.fillStyle(0x333333, 0.8);
    this.energyBarBg.fillRoundedRect(75, 72, 110, 14, 4);
    this.container.add(this.energyBarBg);

    this.energyBarFill = this.scene.add.graphics();
    this.container.add(this.energyBarFill);

    this.energyBarText = this.scene.add.text(130, 79, '', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    });
    this.energyBarText.setOrigin(0.5, 0.5);
    this.container.add(this.energyBarText);
  }

  private createWaveDisplay(): void {
    this.waveText = this.scene.add.text(
      this.scene.scale.width / 2,
      30,
      'WAVE 0',
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffcc00',
        fontStyle: 'bold'
      }
    );
    this.waveText.setOrigin(0.5, 0);
    this.waveText.setDepth(100);
    this.waveText.setScrollFactor(0);
    this.waveText.setAlpha(0);
  }

  private updateHUD(state: GameState): void {
    this.scoreText.setText(`SCORE: ${state.score.toLocaleString()}`);
    this.highScoreText.setText(`HI: ${state.highScore.toLocaleString()}`);

    for (let i = 0; i < this.lifeIcons.length; i++) {
      const icon = this.lifeIcons[i];
      if (i < state.lives) {
        icon.setAlpha(1);
        icon.clearTint();
      } else {
        icon.setAlpha(0.3);
        icon.setTint(0x666666);
      }
    }

    this.updateEnergyBar(state);
    this.updateWaveDisplay(state);
  }

  private updateEnergyBar(state: GameState): void {
    this.energyBarFill.clear();

    if (state.powerUpLevel === 0) {
      this.energyBarText.setText('');
      return;
    }

    const maxTime = 15000;
    const ratio = Math.max(0, state.powerUpTimer / maxTime);
    const barWidth = Math.floor(110 * ratio);

    const levelLabel = state.powerUpLevel === 1 ? 'DOUBLE' : 'TRIPLE';

    let color: number;
    if (state.powerUpLevel === 1) {
      color = 0xff8800;
    } else {
      color = 0xff4400;
    }

    this.energyBarFill.fillStyle(color, 1);
    this.energyBarFill.fillRoundedRect(75, 72, barWidth, 14, 4);

    this.energyBarText.setText(levelLabel);
  }

  private updateWaveDisplay(state: GameState): void {
    if (state.waveNumber > 0 && this.waveText.alpha === 0) {
      this.showWaveText(state.waveNumber);
    }
  }

  public showWaveText(waveNumber: number): void {
    this.waveText.setText(`WAVE ${waveNumber}`);
    this.waveText.setAlpha(1);
    this.waveText.setScale(1.5);

    this.scene.tweens.add({
      targets: this.waveText,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: 1 },
      duration: 500,
      ease: 'Elastic.easeOut',
      yoyo: true,
      hold: 1500,
      onComplete: () => {
        this.waveText.setAlpha(0);
      }
    });
  }

  public update(time: number, delta: number): void {}

  public showGameOver(score: number, highScore: number, onRestart: () => void): void {
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    overlay.setDepth(200);
    overlay.setAlpha(0);

    this.scene.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 500
    });

    const menuX = this.scene.scale.width / 2;
    const menuY = this.scene.scale.height / 2;

    const title = this.scene.add.text(menuX, menuY - 100, 'GAME OVER', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ff4444',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setDepth(201);
    title.setAlpha(0);
    title.setScale(0.5);

    this.scene.tweens.add({
      targets: title,
      alpha: 1,
      scale: 1,
      duration: 600,
      ease: 'Elastic.easeOut',
      delay: 300
    });

    const scoreText = this.scene.add.text(menuX, menuY - 30, `SCORE: ${score.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#00ffff',
      fontStyle: 'bold'
    });
    scoreText.setOrigin(0.5);
    scoreText.setDepth(201);
    scoreText.setAlpha(0);

    const highScoreText = this.scene.add.text(menuX, menuY + 5, `HIGH SCORE: ${highScore.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffcc00',
      fontStyle: 'bold'
    });
    highScoreText.setOrigin(0.5);
    highScoreText.setDepth(201);
    highScoreText.setAlpha(0);

    this.scene.tweens.add({
      targets: [scoreText, highScoreText],
      alpha: 1,
      duration: 500,
      delay: 600
    });

    const restartBtn = this.createButton(
      menuX,
      menuY + 70,
      'RESTART',
      0x00cc66,
      () => {
        overlay.destroy();
        title.destroy();
        scoreText.destroy();
        highScoreText.destroy();
        restartBtn.destroy();
        onRestart();
      }
    );
    restartBtn.setAlpha(0);
    restartBtn.setScale(0.5);

    this.scene.tweens.add({
      targets: restartBtn,
      alpha: 1,
      scale: 1,
      duration: 500,
      ease: 'Elastic.easeOut',
      delay: 900
    });
  }

  public showStartMenu(onStart: () => void): void {
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    overlay.setDepth(200);

    const menuX = this.scene.scale.width / 2;
    const menuY = this.scene.scale.height / 2;

    const title = this.scene.add.text(menuX, menuY - 120, 'GALAXY SHOOTER', {
      fontFamily: 'Arial',
      fontSize: '52px',
      color: '#00ffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    title.setDepth(201);
    title.setAlpha(0);
    title.setScale(0.5);

    this.scene.tweens.add({
      targets: title,
      alpha: 1,
      scale: 1,
      duration: 800,
      ease: 'Elastic.easeOut'
    });

    const subtitle = this.scene.add.text(menuX, menuY - 70, '银河弹幕射击', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffcc00'
    });
    subtitle.setOrigin(0.5);
    subtitle.setDepth(201);
    subtitle.setAlpha(0);

    const controls = this.scene.add.text(menuX, menuY - 10,
      '操作说明\nWASD / 方向键 - 移动\n空格键 - 射击\n收集红色道具提升火力',
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        align: 'center'
      }
    );
    controls.setOrigin(0.5);
    controls.setDepth(201);
    controls.setAlpha(0);

    this.scene.tweens.add({
      targets: [subtitle, controls],
      alpha: 1,
      duration: 500,
      delay: 500
    });

    const startBtn = this.createButton(
      menuX,
      menuY + 80,
      'START GAME',
      0x00cc66,
      () => {
        overlay.destroy();
        title.destroy();
        subtitle.destroy();
        controls.destroy();
        startBtn.destroy();
        onStart();
      }
    );
    startBtn.setAlpha(0);
    startBtn.setScale(0.5);

    this.scene.tweens.add({
      targets: startBtn,
      alpha: 1,
      scale: 1,
      duration: 600,
      ease: 'Elastic.easeOut',
      delay: 800
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const btn = this.scene.add.container(x, y);
    btn.setDepth(202);
    btn.setSize(200, 50);

    const bg = this.scene.add.graphics();
    bg.fillStyle(color, 1);
    bg.lineStyle(3, 0xffffff, 0.8);
    bg.fillRoundedRect(-100, -25, 200, 50, 10);
    bg.strokeRoundedRect(-100, -25, 200, 50, 10);

    const label = this.scene.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    label.setOrigin(0.5);

    btn.add([bg, label]);

    btn.setSize(200, 50);
    (btn as any)._bg = bg;
    (btn as any)._color = color;

    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      this.scene.tweens.add({
        targets: btn,
        scale: 1.05,
        duration: 150
      });
      bg.tint = Phaser.Display.Color.IntegerToColor(color).darken(20).color;
    });

    btn.on('pointerout', () => {
      this.scene.tweens.add({
        targets: btn,
        scale: 1,
        duration: 150
      });
      bg.clearTint();
    });

    btn.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: btn,
        scale: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: onClick
      });
    });

    return btn;
  }

  public destroy(): void {
    this.container.destroy();
    this.waveText.destroy();
  }
}
