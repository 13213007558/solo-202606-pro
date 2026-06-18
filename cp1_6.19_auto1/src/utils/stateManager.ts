export type PowerUpLevel = 0 | 1 | 2;

export interface GameState {
  score: number;
  highScore: number;
  lives: number;
  maxLives: number;
  level: number;
  powerUpLevel: PowerUpLevel;
  powerUpTimer: number;
  isInvincible: boolean;
  invincibleTimer: number;
  isGameOver: boolean;
  isPaused: boolean;
  waveNumber: number;
  waveTimer: number;
}

const HIGH_SCORE_KEY = 'galaxy_shooter_high_score';

class StateManager {
  private state: GameState;
  private listeners: Set<(state: GameState) => void>;

  constructor() {
    this.state = this.createInitialState();
    this.listeners = new Set();
  }

  private createInitialState(): GameState {
    const highScore = this.loadHighScore();
    return {
      score: 0,
      highScore,
      lives: 3,
      maxLives: 3,
      level: 1,
      powerUpLevel: 0,
      powerUpTimer: 0,
      isInvincible: false,
      invincibleTimer: 0,
      isGameOver: false,
      isPaused: false,
      waveNumber: 0,
      waveTimer: 0
    };
  }

  private loadHighScore(): number {
    try {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, this.state.highScore.toString());
    } catch {
    }
  }

  public getState(): Readonly<GameState> {
    return this.state;
  }

  public subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  public addScore(points: number): void {
    this.state.score += points;
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      this.saveHighScore();
    }
    this.notify();
  }

  public loseLife(): boolean {
    if (this.state.isInvincible || this.state.isGameOver) {
      return false;
    }
    this.state.lives -= 1;
    this.state.isInvincible = true;
    this.state.invincibleTimer = 2000;

    if (this.state.lives <= 0) {
      this.state.lives = 0;
      this.state.isGameOver = true;
    }
    this.notify();
    return true;
  }

  public resetLives(): void {
    this.state.lives = this.state.maxLives;
    this.notify();
  }

  public collectPowerUp(): void {
    if (this.state.powerUpLevel < 2) {
      this.state.powerUpLevel = (this.state.powerUpLevel + 1) as PowerUpLevel;
    }
    this.state.powerUpTimer = 15000;
    this.notify();
  }

  public updatePowerUpTimer(delta: number): void {
    if (this.state.powerUpTimer > 0) {
      this.state.powerUpTimer -= delta;
      if (this.state.powerUpTimer <= 0) {
        this.state.powerUpTimer = 0;
        this.state.powerUpLevel = 0;
      }
      this.notify();
    }
  }

  public updateInvincibleTimer(delta: number): void {
    if (this.state.isInvincible) {
      this.state.invincibleTimer -= delta;
      if (this.state.invincibleTimer <= 0) {
        this.state.isInvincible = false;
        this.state.invincibleTimer = 0;
      }
      this.notify();
    }
  }

  public setInvincible(duration: number): void {
    this.state.isInvincible = true;
    this.state.invincibleTimer = duration;
    this.notify();
  }

  public incrementWave(): void {
    this.state.waveNumber += 1;
    this.notify();
  }

  public setGameOver(value: boolean): void {
    this.state.isGameOver = value;
    this.notify();
  }

  public setPaused(value: boolean): void {
    this.state.isPaused = value;
    this.notify();
  }

  public reset(): void {
    this.state = this.createInitialState();
    this.notify();
  }
}

export const stateManager = new StateManager();
