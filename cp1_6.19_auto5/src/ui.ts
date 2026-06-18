import { murals, MuralData } from './data';

export interface UIState {
  currentIndex: number;
  toneShift: number;
}

export class UIController {
  private mainCanvas: HTMLCanvasElement;
  private mainCtx: CanvasRenderingContext2D;
  private thumbnailContainer: HTMLElement;
  private detailPanel: HTMLElement;
  private detailTitle: HTMLElement;
  private detailEra: HTMLElement;
  private detailDesc: HTMLElement;
  private toneSlider: HTMLInputElement;
  private toneLabel: HTMLElement;
  private state: UIState = {
    currentIndex: 0,
    toneShift: 0,
  };
  private thumbnailCanvases: HTMLCanvasElement[] = [];
  private isTransitioning: boolean = false;
  private onMuralChange: ((index: number, tone: number) => void) | null = null;
  private onToneChange: ((tone: number) => void) | null = null;
  private onMainClick: (() => void) | null = null;

  constructor() {
    const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement | null;
    const thumbnailContainer = document.getElementById('thumbnailContainer') as HTMLElement | null;
    const detailPanel = document.getElementById('detailPanel') as HTMLElement | null;
    const detailTitle = document.getElementById('detailTitle') as HTMLElement | null;
    const detailEra = document.getElementById('detailEra') as HTMLElement | null;
    const detailDesc = document.getElementById('detailDesc') as HTMLElement | null;
    const toneSlider = document.getElementById('toneSlider') as HTMLInputElement | null;
    const toneLabel = document.getElementById('toneLabel') as HTMLElement | null;

    if (!mainCanvas || !thumbnailContainer || !detailPanel || !detailTitle || !detailEra || !detailDesc || !toneSlider || !toneLabel) {
      throw new Error('Required DOM elements not found');
    }

    this.mainCanvas = mainCanvas;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get main canvas context');
    this.mainCtx = ctx;

    this.thumbnailContainer = thumbnailContainer;
    this.detailPanel = detailPanel;
    this.detailTitle = detailTitle;
    this.detailEra = detailEra;
    this.detailDesc = detailDesc;
    this.toneSlider = toneSlider;
    this.toneLabel = toneLabel;
  }

  init(): void {
    this.setupThumbnails();
    this.setupEventListeners();
    this.updateDetailPanel(murals[0]);
  }

  setOnMuralChange(callback: (index: number, tone: number) => void): void {
    this.onMuralChange = callback;
  }

  setOnToneChange(callback: (tone: number) => void): void {
    this.onToneChange = callback;
  }

  setOnMainClick(callback: () => void): void {
    this.onMainClick = callback;
  }

  getState(): UIState {
    return { ...this.state };
  }

  getCurrentMural(): MuralData {
    return murals[this.state.currentIndex];
  }

  private setupThumbnails(): void {
    murals.forEach((mural, index) => {
      const thumb = document.createElement('div');
      thumb.className = 'thumbnail';
      if (index === 0) thumb.classList.add('active');
      thumb.dataset.index = String(index);

      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        mural.draw(ctx, 120, 90, this.state.toneShift);
      }
      this.thumbnailCanvases.push(canvas);

      const name = document.createElement('span');
      name.className = 'thumbnail-name';
      name.textContent = mural.name;

      thumb.appendChild(canvas);
      thumb.appendChild(name);
      this.thumbnailContainer.appendChild(thumb);

      thumb.addEventListener('click', () => {
        this.selectMural(index);
      });
    });
  }

  private setupEventListeners(): void {
    this.toneSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.state.toneShift = value / 100;
      this.updateToneLabel();
      this.updateAllThumbnails();
      if (this.onToneChange) {
        this.onToneChange(this.state.toneShift);
      }
    });

    this.thumbnailContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.thumbnailContainer.scrollLeft += e.deltaY;
    }, { passive: false });

    this.mainCanvas.addEventListener('click', () => {
      if (this.onMainClick) {
        this.onMainClick();
      }
    });

    window.addEventListener('resize', () => {
      this.resizeMainCanvas();
    });
  }

  private updateToneLabel(): void {
    const t = this.state.toneShift;
    if (t < 0.3) {
      this.toneLabel.textContent = '暖黄';
    } else if (t < 0.7) {
      this.toneLabel.textContent = '中性';
    } else {
      this.toneLabel.textContent = '冷蓝';
    }
  }

  private updateAllThumbnails(): void {
    this.thumbnailCanvases.forEach((canvas, index) => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 120, 90);
        murals[index].draw(ctx, 120, 90, this.state.toneShift);
      }
    });
  }

  private selectMural(index: number): void {
    if (index === this.state.currentIndex || this.isTransitioning) return;

    this.isTransitioning = true;
    const prevIndex = this.state.currentIndex;
    this.state.currentIndex = index;

    const thumbs = this.thumbnailContainer.querySelectorAll('.thumbnail');
    thumbs.forEach((thumb, i) => {
      if (i === index) {
        thumb.classList.add('active');
        (thumb as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      } else if (i === prevIndex) {
        thumb.classList.remove('active');
      }
    });

    this.mainCanvas.classList.add('fading');

    setTimeout(() => {
      this.updateDetailPanel(murals[index]);
      if (this.onMuralChange) {
        this.onMuralChange(index, this.state.toneShift);
      }
      this.mainCanvas.classList.remove('fading');
      setTimeout(() => {
        this.isTransitioning = false;
      }, 600);
    }, 600);
  }

  private updateDetailPanel(mural: MuralData): void {
    this.detailPanel.classList.remove('visible');

    setTimeout(() => {
      this.detailTitle.textContent = mural.name;
      this.detailEra.textContent = mural.era;
      this.detailDesc.textContent = mural.descriptionEn;
      this.detailPanel.classList.add('visible');
    }, 200);
  }

  resizeMainCanvas(): void {
    const wrapper = this.mainCanvas.parentElement;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.mainCanvas.width = rect.width * dpr;
    this.mainCanvas.height = rect.height * dpr;
    this.mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.mainCtx.scale(dpr, dpr);
  }

  drawMainMural(mural: MuralData, tone: number): void {
    const rect = this.mainCanvas.getBoundingClientRect();
    this.mainCtx.clearRect(0, 0, rect.width, rect.height);
    mural.draw(this.mainCtx, rect.width, rect.height, tone);
  }

  getMainCanvas(): HTMLCanvasElement {
    return this.mainCanvas;
  }

  nextMural(): void {
    const nextIndex = (this.state.currentIndex + 1) % murals.length;
    this.selectMural(nextIndex);
  }

  prevMural(): void {
    const prevIndex = (this.state.currentIndex - 1 + murals.length) % murals.length;
    this.selectMural(prevIndex);
  }
}
