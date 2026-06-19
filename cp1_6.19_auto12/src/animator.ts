import type { Mural } from './data';

interface Fragment {
  shape: 'triangle' | 'hexagon';
  points: { x: number; y: number }[];
  centerX: number;
  centerY: number;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  color: string;
}

interface EasingFunctions {
  easeOutCubic: (t: number) => number;
  easeInCubic: (t: number) => number;
  easeInOutQuad: (t: number) => number;
  easeOutElastic: (t: number) => number;
}

const easing: EasingFunctions = {
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInCubic: (t: number) => t * t * t,
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
};

export class FragmentAnimator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fragments: Fragment[] = [];
  private animationId: number | null = null;
  private startTime: number = 0;
  private duration: number = 2500;
  private isAnimating: boolean = false;
  private currentMural: Mural | null = null;
  private hueShift: number = 0;
  private fragmentCount: number = 30;
  private sourceImageData: ImageData | null = null;
  private onComplete: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    this.ctx = ctx;
    this.updateFragmentCount();
  }

  private updateFragmentCount(): void {
    const width = window.innerWidth;
    this.fragmentCount = width > 1200 ? 60 : width > 768 ? 45 : 30;
  }

  public resize(): void {
    this.updateFragmentCount();
  }

  public start(
    mural: Mural,
    hueShift: number,
    onComplete?: () => void
  ): void {
    if (this.isAnimating) return;

    this.currentMural = mural;
    this.hueShift = hueShift;
    this.onComplete = onComplete || null;
    this.isAnimating = true;

    this.captureSourceImage();
    this.generateFragments();
    this.startTime = performance.now();
    this.animate();
  }

  private captureSourceImage(): void {
    const { width, height } = this.canvas;
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx || !this.currentMural) return;

    this.currentMural.draw(offCtx, width, height, this.hueShift);
    this.sourceImageData = offCtx.getImageData(0, 0, width, height);
  }

  private getPixelColor(x: number, y: number): string {
    if (!this.sourceImageData) return '#8b6914';
    
    const idx = (Math.floor(y) * this.sourceImageData.width + Math.floor(x)) * 4;
    const data = this.sourceImageData.data;
    
    if (idx < 0 || idx >= data.length) return '#8b6914';
    
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  private generateFragments(): void {
    const { width, height } = this.canvas;
    this.fragments = [];

    const cols = Math.ceil(Math.sqrt(this.fragmentCount * (width / height)));
    const rows = Math.ceil(this.fragmentCount / cols);
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    let count = 0;
    for (let row = 0; row < rows && count < this.fragmentCount; row++) {
      for (let col = 0; col < cols && count < this.fragmentCount; col++) {
        const shape: 'triangle' | 'hexagon' = Math.random() > 0.5 ? 'triangle' : 'hexagon';
        const baseX = col * cellWidth + cellWidth / 2;
        const baseY = row * cellHeight + cellHeight / 2;
        const size = Math.min(cellWidth, cellHeight) * (0.6 + Math.random() * 0.4);

        const points = this.generateShapePoints(shape, baseX, baseY, size);
        const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(width, height) * (0.3 + Math.random() * 0.5);
        const targetX = centerX + Math.cos(angle) * distance;
        const targetY = centerY + Math.sin(angle) * distance;

        const speed = 8 + Math.random() * 12;
        const dx = targetX - centerX;
        const dy = targetY - centerY;
        const len = Math.sqrt(dx * dx + dy * dy);

        this.fragments.push({
          shape,
          points: points.map(p => ({ x: p.x, y: p.y })),
          centerX,
          centerY,
          targetX,
          targetY,
          velocityX: (dx / len) * speed,
          velocityY: (dy / len) * speed,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          opacity: 1,
          color: this.getPixelColor(centerX, centerY)
        });

        count++;
      }
    }
  }

  private generateShapePoints(
    shape: 'triangle' | 'hexagon',
    cx: number,
    cy: number,
    size: number
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const sides = shape === 'triangle' ? 3 : 6;
    const rotation = Math.random() * Math.PI * 2;

    for (let i = 0; i < sides; i++) {
      const angle = rotation + (Math.PI * 2 / sides) * i - Math.PI / 2;
      const r = size * (0.8 + Math.random() * 0.4);
      points.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r
      });
    }

    return points;
  }

  private animate = (): void => {
    const now = performance.now();
    const elapsed = now - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);

    const expandEnd = 0.4;
    const pauseEnd = 0.5;
    const collapseEnd = 1;

    let expandProgress = 0;
    let collapseProgress = 0;

    if (progress <= expandEnd) {
      expandProgress = easing.easeOutCubic(progress / expandEnd);
    } else if (progress <= pauseEnd) {
      expandProgress = 1;
    } else {
      expandProgress = 1;
      collapseProgress = easing.easeOutElastic((progress - pauseEnd) / (collapseEnd - pauseEnd));
    }

    this.render(expandProgress, collapseProgress);

    if (progress < 1) {
      this.animationId = requestAnimationFrame(this.animate);
    } else {
      this.complete();
    }
  };

  private render(expandProgress: number, collapseProgress: number): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    const overallProgress = 1 - expandProgress + collapseProgress;

    for (const fragment of this.fragments) {
      const currentX = fragment.centerX + (fragment.targetX - fragment.centerX) * expandProgress * (1 - collapseProgress);
      const currentY = fragment.centerY + (fragment.targetY - fragment.centerY) * expandProgress * (1 - collapseProgress);
      const currentRotation = fragment.rotation + fragment.rotationSpeed * expandProgress * (1 - collapseProgress) * 10;

      this.ctx.save();
      this.ctx.translate(currentX, currentY);
      this.ctx.rotate(currentRotation);
      this.ctx.globalAlpha = fragment.opacity * overallProgress;

      this.ctx.beginPath();
      for (let i = 0; i < fragment.points.length; i++) {
        const p = fragment.points[i];
        const px = p.x - fragment.centerX;
        const py = p.y - fragment.centerY;
        if (i === 0) {
          this.ctx.moveTo(px, py);
        } else {
          this.ctx.lineTo(px, py);
        }
      }
      this.ctx.closePath();

      this.ctx.fillStyle = fragment.color;
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(44, 24, 16, 0.4)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  private complete(): void {
    this.isAnimating = false;
    this.animationId = null;
    this.fragments = [];
    this.sourceImageData = null;

    if (this.currentMural) {
      const { width, height } = this.canvas;
      this.currentMural.draw(this.ctx, width, height, this.hueShift);
    }

    if (this.onComplete) {
      this.onComplete();
    }
  }

  public cancel(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isAnimating = false;
    this.fragments = [];
    this.sourceImageData = null;
  }

  public getIsAnimating(): boolean {
    return this.isAnimating;
  }
}

export function drawStaticMural(
  ctx: CanvasRenderingContext2D,
  mural: Mural,
  width: number,
  height: number,
  hueShift: number
): void {
  mural.draw(ctx, width, height, hueShift);
}
