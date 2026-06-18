import { Planet, ResourceType } from './planet';
import { TradeRoute } from './tradeRoute';

interface StarBg {
  x: number;
  y: number;
  r: number;
  a: number;
  speed: number;
}

const RESOURCE_COLORS: Record<ResourceType, string> = {
  metal: '#6fa8ff',
  energy: '#ffd866',
  food: '#7ee787'
};

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private width = 0;
  private height = 0;
  private stars: StarBg[] = [];
  private time = 0;
  private warningFlash = 0;
  private onWarningActive = false;
  private selectedPlanetId: string | null = null;
  private hoverPlanetId: string | null = null;
  public onPlanetClick?: (planet: Planet) => void;
  public onRouteClick?: (route: TradeRoute) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    this.initStars();
    this.bindEvents();
  }

  resize(w?: number, h?: number): void {
    const targetW = w ?? this.canvas.clientWidth;
    const targetH = h ?? this.canvas.clientHeight;
    this.width = targetW;
    this.height = targetH;
    this.canvas.width = Math.floor(targetW * this.dpr);
    this.canvas.height = Math.floor(targetH * this.dpr);
    this.canvas.style.width = targetW + 'px';
    this.canvas.style.height = targetH + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  triggerWarningFlash(): void {
    this.onWarningActive = true;
    this.warningFlash = 1;
  }

  endWarning(): void {
    this.onWarningActive = false;
  }

  setSelectedPlanet(id: string | null): void {
    this.selectedPlanetId = id;
  }

  private initStars(): void {
    const count = 180;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.4 + 0.2,
        a: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.6 + 0.2
      });
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('resize', () => this.resize());
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let best: Planet | null = null;
    let bestDist = Infinity;
    for (const planet of this._planets) {
      const dx = planet.x - x;
      const dy = planet.y - y;
      const d = Math.hypot(dx, dy);
      if (d < 56 && d < bestDist) {
        bestDist = d;
        best = planet;
      }
    }
    if (best && this.onPlanetClick) this.onPlanetClick(best);
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let found: string | null = null;
    for (const planet of this._planets) {
      const dx = planet.x - x;
      const dy = planet.y - y;
      if (Math.hypot(dx, dy) < 56) {
        found = planet.id;
        break;
      }
    }
    this.hoverPlanetId = found;
    this.canvas.style.cursor = found ? 'pointer' : 'default';
  }

  private _planets: Planet[] = [];
  private _routes: TradeRoute[] = [];

  setData(planets: Planet[], routes: TradeRoute[]): void {
    this._planets = planets;
    this._routes = routes;
  }

  render(deltaMs: number): void {
    this.time += deltaMs;
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    ctx.clearRect(0, 0, W, H);
    this.drawStars(ctx, deltaMs);
    this.drawNebula(ctx);

    for (const route of this._routes) this.drawRoute(ctx, route);
    for (const route of this._routes) this.drawParticles(ctx, route);

    for (const planet of this._planets) this.drawPlanet(ctx, planet);

    this.drawWarningBorders(ctx);
  }

  private drawStars(ctx: CanvasRenderingContext2D, deltaMs: number): void {
    for (const s of this.stars) {
      const x = s.x * this.width;
      const y = s.y * this.height;
      const tw = (Math.sin((this.time * 0.001 * s.speed) + s.x * 20) + 1) * 0.5;
      const alpha = s.a * (0.4 + tw * 0.6);
      ctx.fillStyle = `rgba(220, 210, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    void deltaMs;
  }

  private drawNebula(ctx: CanvasRenderingContext2D): void {
    const grd = ctx.createRadialGradient(
      this.width * 0.25, this.height * 0.3, 20,
      this.width * 0.25, this.height * 0.3, Math.max(this.width, this.height) * 0.7
    );
    grd.addColorStop(0, 'rgba(120, 80, 220, 0.14)');
    grd.addColorStop(0.5, 'rgba(60, 40, 140, 0.06)');
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, this.width, this.height);

    const grd2 = ctx.createRadialGradient(
      this.width * 0.8, this.height * 0.75, 30,
      this.width * 0.8, this.height * 0.75, Math.max(this.width, this.height) * 0.6
    );
    grd2.addColorStop(0, 'rgba(60, 130, 220, 0.12)');
    grd2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grd2;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawRoute(ctx: CanvasRenderingContext2D, route: TradeRoute): void {
    const a = route.from;
    const b = route.to;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const mx = (a.x + b.x) / 2 - dy * 0.18;
    const my = (a.y + b.y) / 2 + dx * 0.18;

    const hasEvent = route.activeEvents.size > 0;
    const baseColor = hasEvent ? '#ff5f6d' : '#7f8fe8';
    const glowColor = hasEvent ? 'rgba(255, 95, 109, 0.35)' : 'rgba(127, 143, 232, 0.25)';

    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = glowColor;
    ctx.lineWidth = hasEvent ? 2.5 : 2;
    ctx.strokeStyle = baseColor;
    ctx.setLineDash([10, 6]);
    ctx.lineDashOffset = -this.time * 0.04;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(mx, my, b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private bezierPoint(a: number, b: number, c: number, t: number): number {
    return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
  }

  private drawParticles(ctx: CanvasRenderingContext2D, route: TradeRoute): void {
    const a = route.from;
    const b = route.to;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const mx = (a.x + b.x) / 2 - dy * 0.18;
    const my = (a.y + b.y) / 2 + dx * 0.18;

    const cargos = route.getCargoProgressList();
    for (const p of cargos) {
      let t = (p.progress / 100);
      if (p.direction !== 'forward') t = 1 - t;
      const x = this.bezierPoint(a.x, mx, b.x, t);
      const y = this.bezierPoint(a.y, my, b.y, t);
      const color = RESOURCE_COLORS[p.resourceType];

      const pulse = 1 + Math.sin(this.time * 0.012 + p.progress * 0.1) * 0.2;
      ctx.save();
      ctx.shadowBlur = 16;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 5 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPlanet(ctx: CanvasRenderingContext2D, planet: Planet): void {
    const selected = planet.id === this.selectedPlanetId;
    const hovered = planet.id === this.hoverPlanetId;
    const r = selected ? 42 : (hovered ? 40 : 36);
    const baseColor = planet.color;
    const hasEvent = planet.activeEvents.size > 0;

    if (selected || hovered) {
      ctx.save();
      ctx.shadowBlur = 28;
      ctx.shadowColor = baseColor;
      ctx.strokeStyle = hasEvent ? '#ff5f6d' : baseColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, r + 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    this.drawResourceRing(ctx, planet, r + 6);

    const grd = ctx.createRadialGradient(
      planet.x - r * 0.35, planet.y - r * 0.35, r * 0.1,
      planet.x, planet.y, r
    );
    grd.addColorStop(0, this.lighten(baseColor, 0.55));
    grd.addColorStop(0.55, baseColor);
    grd.addColorStop(1, this.darken(baseColor, 0.6));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(planet.x, planet.y, r * 1.18, r * 0.38, Math.PI / 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#e8e2ff';
    ctx.font = 'bold 13px "Segoe UI", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText(planet.name, planet.x, planet.y + r + 22);
    ctx.restore();

    if (hasEvent) {
      const blink = (Math.sin(this.time * 0.018) + 1) * 0.5;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 80, 90, ${0.5 + blink * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, r + 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawResourceRing(ctx: CanvasRenderingContext2D, planet: Planet, outerR: number): void {
    const types: ResourceType[] = ['metal', 'energy', 'food'];
    const start = -Math.PI / 2;
    const segSpan = (Math.PI * 2) / types.length;

    ctx.save();
    ctx.lineWidth = 6;
    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      const ratio = Math.max(0, Math.min(1, planet.getResourceRatio(t)));
      const baseStart = start + i * segSpan + 0.05;
      const baseEnd = start + (i + 1) * segSpan - 0.05;
      const actualEnd = baseStart + (baseEnd - baseStart) * ratio;
      const color = RESOURCE_COLORS[t];

      ctx.strokeStyle = 'rgba(120, 110, 180, 0.25)';
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, outerR, baseStart, baseEnd);
      ctx.stroke();

      if (ratio > 0.02) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, outerR, baseStart, actualEnd);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();
  }

  private drawWarningBorders(ctx: CanvasRenderingContext2D): void {
    if (this.warningFlash > 0 || this.onWarningActive) {
      const intensity = this.onWarningActive
        ? (0.35 + Math.sin(this.time * 0.02) * 0.25)
        : this.warningFlash;
      const grd = ctx.createLinearGradient(0, 0, 0, this.height);
      grd.addColorStop(0, `rgba(255, 70, 90, ${intensity})`);
      grd.addColorStop(0.08, 'rgba(255, 70, 90, 0)');
      grd.addColorStop(0.92, 'rgba(255, 70, 90, 0)');
      grd.addColorStop(1, `rgba(255, 70, 90, ${intensity})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, this.width, this.height);

      const grdV = ctx.createLinearGradient(0, 0, this.width, 0);
      grdV.addColorStop(0, `rgba(255, 70, 90, ${intensity * 0.8})`);
      grdV.addColorStop(0.05, 'rgba(255, 70, 90, 0)');
      grdV.addColorStop(0.95, 'rgba(255, 70, 90, 0)');
      grdV.addColorStop(1, `rgba(255, 70, 90, ${intensity * 0.8})`);
      ctx.fillStyle = grdV;
      ctx.fillRect(0, 0, this.width, this.height);

      if (!this.onWarningActive && this.warningFlash > 0) {
        this.warningFlash = Math.max(0, this.warningFlash - 0.015);
      }
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    const n = h.length === 3
      ? h.split('').map(c => c + c).join('')
      : h;
    return {
      r: parseInt(n.substring(0, 2), 16),
      g: parseInt(n.substring(2, 4), 16),
      b: parseInt(n.substring(4, 6), 16)
    };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private lighten(hex: string, amount: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
  }

  private darken(hex: string, amount: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
  }
}
