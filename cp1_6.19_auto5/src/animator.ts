interface Fragment {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  sides: number;
  color: string;
  delay: number;
}

type EasingFunction = (t: number) => number;

const easeOutCubic: EasingFunction = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

interface AnimatorOptions {
  canvas: HTMLCanvasElement;
  fragmentCount?: number;
  duration?: number;
}

export class FragmentAnimator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fragments: Fragment[] = [];
  private animationId: number | null = null;
  private startTime: number = 0;
  private duration: number = 2500;
  private fragmentCount: number = 40;
  private isAnimating: boolean = false;
  private sourceImageData: ImageData | null = null;
  private width: number = 0;
  private height: number = 0;
  private onComplete: (() => void) | null = null;

  constructor(options: AnimatorOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.duration = options.duration || 2500;
    this.fragmentCount = options.fragmentCount || 40;
    this.updateSize();
  }

  updateSize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width * dpr;
    this.height = rect.height * dpr;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.scale(dpr, dpr);

    const screenWidth = window.innerWidth;
    if (screenWidth < 768) {
      this.fragmentCount = 30;
    } else if (screenWidth < 1200) {
      this.fragmentCount = 45;
    } else {
      this.fragmentCount = 60;
    }
  }

  captureSource(drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) => void, toneShift: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    drawFn(this.ctx, rect.width, rect.height, toneShift);
    this.sourceImageData = this.ctx.getImageData(0, 0, rect.width, rect.height);
  }

  start(drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number, tone: number) => void, toneShift: number, onComplete?: () => void): void {
    if (this.isAnimating) return;

    this.captureSource(drawFn, toneShift);
    this.onComplete = onComplete || null;
    this.isAnimating = true;
    this.fragments = this.createFragments();
    this.startTime = performance.now();
    this.animate();
  }

  private createFragments(): Fragment[] {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const fragments: Fragment[] = [];
    const cols = Math.ceil(Math.sqrt(this.fragmentCount * (w / h)));
    const rows = Math.ceil(this.fragmentCount / cols);
    const cellW = w / cols;
    const cellH = h / rows;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (fragments.length >= this.fragmentCount) break;

        const cx = (col + 0.5) * cellW + (Math.random() - 0.5) * cellW * 0.3;
        const cy = (row + 0.5) * cellH + (Math.random() - 0.5) * cellH * 0.3;

        const centerX = w / 2;
        const centerY = h / 2;
        const angle = Math.atan2(cy - centerY, cx - centerX);
        const dist = Math.sqrt(Math.pow(cx - centerX, 2) + Math.pow(cy - centerY, 2));
        const maxDist = Math.sqrt(Math.pow(w / 2, 2) + Math.pow(h / 2, 2));

        const spread = 150 + Math.random() * 100;
        const targetX = cx + Math.cos(angle) * spread * (dist / maxDist + 0.3);
        const targetY = cy + Math.sin(angle) * spread * (dist / maxDist + 0.3);

        const pixelX = Math.floor(cx);
        const pixelY = Math.floor(cy);
        const idx = (pixelY * w + pixelX) * 4;
        let color = `rgb(200, 180, 140)`;
        if (this.sourceImageData && pixelX >= 0 && pixelX < w && pixelY >= 0 && pixelY < h) {
          const r = this.sourceImageData.data[idx];
          const g = this.sourceImageData.data[idx + 1];
          const b = this.sourceImageData.data[idx + 2];
          color = `rgb(${r}, ${g}, ${b})`;
        }

        const sides = Math.random() > 0.5 ? 3 : 6;

        fragments.push({
          x: cx,
          y: cy,
          startX: cx,
          startY: cy,
          targetX: targetX,
          targetY: targetY,
          velocityX: 0,
          velocityY: 0,
          size: Math.max(cellW, cellH) * (0.4 + Math.random() * 0.3),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 8,
          sides: sides,
          color: color,
          delay: (dist / maxDist) * 0.3 + Math.random() * 0.1,
        });
      }
    }

    return fragments;
  }

  private animate = (): void => {
    const now = performance.now();
    const elapsed = now - this.startTime;
    const totalProgress = Math.min(elapsed / this.duration, 1);

    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    this.fragments.forEach((frag) => {
      const delayedProgress = Math.max(0, (totalProgress - frag.delay) / (1 - frag.delay));
      const clampedProgress = Math.min(delayedProgress, 1);

      let x: number, y: number, rotation: number, alpha: number;

      if (clampedProgress < 0.5) {
        const t = clampedProgress * 2;
        const eased = easeOutCubic(t);
        x = frag.startX + (frag.targetX - frag.startX) * eased;
        y = frag.startY + (frag.targetY - frag.startY) * eased;
        rotation = frag.rotation + frag.rotationSpeed * eased;
        alpha = 1 - eased * 0.2;
      } else {
        const t = (clampedProgress - 0.5) * 2;
        const eased = easeInOutCubic(t);
        x = frag.targetX + (frag.startX - frag.targetX) * eased;
        y = frag.targetY + (frag.startY - frag.targetY) * eased;
        rotation = frag.rotation + frag.rotationSpeed * (1 - eased * 0.5);
        alpha = 0.8 + eased * 0.2;
      }

      this.drawFragment(x, y, frag.size, frag.sides, rotation, frag.color, alpha);
    });

    if (totalProgress < 1) {
      this.animationId = requestAnimationFrame(this.animate);
    } else {
      this.isAnimating = false;
      this.animationId = null;
      if (this.onComplete) {
        this.onComplete();
      }
    }
  };

  private drawFragment(
    x: number,
    y: number,
    size: number,
    sides: number,
    rotation: number,
    color: string,
    alpha: number
  ): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.globalAlpha = alpha;

    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.globalAlpha = alpha * 0.5;
    this.ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isAnimating = false;
  }

  getIsAnimating(): boolean {
    return this.isAnimating;
  }

  destroy(): void {
    this.stop();
    this.fragments = [];
    this.sourceImageData = null;
  }
}
