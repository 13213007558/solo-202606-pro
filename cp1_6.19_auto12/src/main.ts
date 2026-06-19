import { murals } from './data';
import { FragmentAnimator, drawStaticMural } from './animator';
import { UIManager } from './ui';
import type { Mural } from './data';

class MuralGallery {
  private mainCanvas: HTMLCanvasElement;
  private mainCtx: CanvasRenderingContext2D;
  private animator: FragmentAnimator;
  private uiManager: UIManager;
  private currentMural: Mural;
  private currentHue: number = 20;
  private animationFrameId: number | null = null;

  constructor() {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Main canvas not found');

    this.mainCanvas = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    this.mainCtx = ctx;

    this.currentMural = murals[0];

    this.animator = new FragmentAnimator(canvas);

    this.setupCanvas();

    this.uiManager = new UIManager(murals, canvas, {
      onMuralSelect: (mural: Mural) => this.handleMuralSelect(mural),
      onHueChange: (hue: number) => this.handleHueChange(hue),
      onMainCanvasClick: () => this.handleMainCanvasClick()
    });

    this.draw();
    this.setupEventListeners();
  }

  private setupCanvas(): void {
    const container = this.mainCanvas.parentElement;
    if (!container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.mainCanvas.width = rect.width * dpr;
      this.mainCanvas.height = rect.height * dpr;
      this.mainCanvas.style.width = `${rect.width}px`;
      this.mainCanvas.style.height = `${rect.height}px`;
      this.mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.animator) {
        this.animator.resize();
      }
      if (this.uiManager) {
        this.draw();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const idx = this.uiManager.getCurrentIndex();
        if (idx > 0) {
          this.navigateTo(idx - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const idx = this.uiManager.getCurrentIndex();
        if (idx < murals.length - 1) {
          this.navigateTo(idx + 1);
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.handleMainCanvasClick();
      }
    });

    let lastTime = 0;
    const trackPerformance = (time: number) => {
      if (time - lastTime >= 1000) {
        lastTime = time;
      }
      this.animationFrameId = requestAnimationFrame(trackPerformance);
    };
    this.animationFrameId = requestAnimationFrame(trackPerformance);
  }

  private navigateTo(index: number): void {
    const thumbs = document.querySelectorAll('.thumbnail');
    const thumb = thumbs[index] as HTMLElement;
    if (thumb) {
      thumb.click();
    }
  }

  private handleMuralSelect(mural: Mural): void {
    this.currentMural = mural;
    this.draw();
  }

  private handleHueChange(hue: number): void {
    this.currentHue = hue;
    this.draw();
  }

  private handleMainCanvasClick(): void {
    if (this.animator.getIsAnimating()) return;

    this.animator.start(this.currentMural, this.currentHue, () => {
      this.draw();
    });
  }

  private draw(): void {
    if (this.animator.getIsAnimating()) return;

    const rect = this.mainCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.mainCtx.clearRect(0, 0, width, height);
    drawStaticMural(this.mainCtx, this.currentMural, width, height, this.currentHue);
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animator.cancel();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new MuralGallery();
    console.log('🎨 壁画时光机已启动 | Mural Time Machine initialized');
    console.log(`📜 共加载 ${murals.length} 幅壁画作品`);
    murals.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} (${m.nameEn}) - ${m.era}`);
    });
  } catch (error) {
    console.error('初始化失败:', error);
  }
});
