import type { Mural } from './data';
import { drawStaticMural } from './animator';

export interface UICallbacks {
  onMuralSelect: (mural: Mural, index: number) => void;
  onHueChange: (hue: number) => void;
  onMainCanvasClick: () => void;
}

export class UIManager {
  private murals: Mural[];
  private callbacks: UICallbacks;
  private currentIndex: number = 0;
  private hueShift: number = 20;
  private thumbnailCanvases: Map<string, HTMLCanvasElement> = new Map();
  private mainCanvas: HTMLCanvasElement;
  private hueSlider: HTMLInputElement;
  private thumbnailStrip: HTMLElement;
  private thumbnailContainer: HTMLElement;
  private detailPanel: HTMLElement;
  private muralTitle: HTMLElement;
  private muralEra: HTMLElement;
  private muralDesc: HTMLElement;
  private isTransitioning: boolean = false;

  constructor(
    murals: Mural[],
    mainCanvas: HTMLCanvasElement,
    callbacks: UICallbacks
  ) {
    this.murals = murals;
    this.mainCanvas = mainCanvas;
    this.callbacks = callbacks;

    const hueSlider = document.getElementById('hueSlider') as HTMLInputElement;
    const thumbnailStrip = document.getElementById('thumbnailStrip');
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    const detailPanel = document.getElementById('detailPanel');
    const muralTitle = document.getElementById('muralTitle');
    const muralEra = document.getElementById('muralEra');
    const muralDesc = document.getElementById('muralDesc');

    if (!hueSlider || !thumbnailStrip || !thumbnailContainer || !detailPanel || !muralTitle || !muralEra || !muralDesc) {
      throw new Error('Required UI elements not found');
    }

    this.hueSlider = hueSlider;
    this.thumbnailStrip = thumbnailStrip;
    this.thumbnailContainer = thumbnailContainer;
    this.detailPanel = detailPanel;
    this.muralTitle = muralTitle;
    this.muralEra = muralEra;
    this.muralDesc = muralDesc;

    this.init();
  }

  private init(): void {
    this.setupHueSlider();
    this.setupThumbnails();
    this.setupThumbnailScroll();
    this.setupMainCanvasClick();
    this.setupWindowResize();
    this.setupPaperTexture();
  }

  private setupHueSlider(): void {
    this.hueSlider.value = String(this.hueShift);
    this.hueSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.hueShift = parseInt(target.value, 10);
      this.updateBackgroundTexture();
      this.callbacks.onHueChange(this.hueShift);
      this.redrawThumbnails();
    });
  }

  private setupThumbnails(): void {
    this.thumbnailStrip.innerHTML = '';

    this.murals.forEach((mural, index) => {
      const thumb = document.createElement('div');
      thumb.className = 'thumbnail';
      thumb.dataset.index = String(index);

      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawStaticMural(ctx, mural, 240, 180, this.hueShift);
      }

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = mural.name;

      thumb.appendChild(canvas);
      thumb.appendChild(label);

      thumb.addEventListener('click', () => {
        if (!this.isTransitioning && index !== this.currentIndex) {
          this.selectMural(index);
        }
      });

      this.thumbnailStrip.appendChild(thumb);
      this.thumbnailCanvases.set(mural.id, canvas);
    });

    this.updateThumbnailActiveState();
    this.updateDetailPanel();
  }

  private setupThumbnailScroll(): void {
    this.thumbnailContainer.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        this.thumbnailContainer.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  private setupMainCanvasClick(): void {
    this.mainCanvas.addEventListener('click', () => {
      this.callbacks.onMainCanvasClick();
    });
  }

  private setupWindowResize(): void {
    window.addEventListener('resize', () => {
      this.redrawThumbnails();
    });
  }

  private setupPaperTexture(): void {
    const textureCanvas = document.querySelector('.paper-texture') as HTMLCanvasElement;
    if (!textureCanvas) return;

    const updateTexture = () => {
      textureCanvas.width = window.innerWidth;
      textureCanvas.height = window.innerHeight;
      const ctx = textureCanvas.getContext('2d');
      if (!ctx) return;

      const imgData = ctx.createImageData(textureCanvas.width, textureCanvas.height);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const noise = Math.random() * 30;
        imgData.data[i] = 245 + noise - 15;
        imgData.data[i + 1] = 230 + noise - 15;
        imgData.data[i + 2] = 200 + noise - 15;
        imgData.data[i + 3] = 80;
      }
      ctx.putImageData(imgData, 0, 0);
    };

    updateTexture();
    window.addEventListener('resize', updateTexture);
  }

  private updateBackgroundTexture(): void {
    const coolFactor = this.hueShift / 100;
    const root = document.documentElement;
    const r = Math.round(245 * (1 - coolFactor * 0.3) + 180 * coolFactor);
    const g = Math.round(230 * (1 - coolFactor * 0.2) + 200 * coolFactor);
    const b = Math.round(200 * (1 - coolFactor * 0.1) + 220 * coolFactor);
    root.style.setProperty('--paper-bg', `rgb(${r}, ${g}, ${b})`);
  }

  private selectMural(index: number): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.mainCanvas.classList.add('fading');

    setTimeout(() => {
      this.currentIndex = index;
      this.updateThumbnailActiveState();
      this.updateDetailPanel();
      this.scrollThumbnailIntoView();
      this.callbacks.onMuralSelect(this.murals[index], index);

      setTimeout(() => {
        this.mainCanvas.classList.remove('fading');
        this.isTransitioning = false;
      }, 100);
    }, 500);
  }

  private updateThumbnailActiveState(): void {
    const thumbs = this.thumbnailStrip.querySelectorAll('.thumbnail');
    thumbs.forEach((thumb, idx) => {
      if (idx === this.currentIndex) {
        thumb.classList.add('active');
      } else {
        thumb.classList.remove('active');
      }
    });
  }

  private updateDetailPanel(): void {
    const mural = this.murals[this.currentIndex];
    this.muralTitle.textContent = mural.name;
    this.muralEra.textContent = `${mural.era} | ${mural.eraEn}`;
    this.muralDesc.textContent = mural.description;

    this.detailPanel.classList.remove('active');
    void this.detailPanel.offsetWidth;
    this.detailPanel.classList.add('active');
  }

  private scrollThumbnailIntoView(): void {
    const thumbs = this.thumbnailStrip.querySelectorAll('.thumbnail');
    const activeThumb = thumbs[this.currentIndex] as HTMLElement;
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }

  private redrawThumbnails(): void {
    this.murals.forEach((mural) => {
      const canvas = this.thumbnailCanvases.get(mural.id);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawStaticMural(ctx, mural, 240, 180, this.hueShift);
        }
      }
    });
  }

  public getHueShift(): number {
    return this.hueShift;
  }

  public getCurrentMural(): Mural {
    return this.murals[this.currentIndex];
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public setHueShift(hue: number): void {
    this.hueShift = hue;
    this.hueSlider.value = String(hue);
    this.updateBackgroundTexture();
    this.redrawThumbnails();
  }
}
