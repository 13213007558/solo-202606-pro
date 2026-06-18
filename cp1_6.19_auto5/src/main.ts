import { UIController } from './ui';
import { FragmentAnimator } from './animator';
import { murals } from './data';

class MuralGallery {
  private uiController: UIController;
  private animator: FragmentAnimator | null = null;
  private animationCanvas: HTMLCanvasElement | null = null;

  constructor() {
    this.uiController = new UIController();
  }

  init(): void {
    this.setupAnimator();
    this.uiController.init();
    this.uiController.resizeMainCanvas();

    const state = this.uiController.getState();
    const currentMural = this.uiController.getCurrentMural();
    this.uiController.drawMainMural(currentMural, state.toneShift);

    this.uiController.setOnMuralChange((index, tone) => {
      const mural = murals[index];
      this.uiController.drawMainMural(mural, tone);
      if (this.animator) {
        this.animator.updateSize();
      }
    });

    this.uiController.setOnToneChange((tone) => {
      const currentMural = this.uiController.getCurrentMural();
      if (this.animator && this.animator.getIsAnimating()) {
        return;
      }
      this.uiController.drawMainMural(currentMural, tone);
    });

    this.uiController.setOnMainClick(() => {
      this.triggerFragmentAnimation();
    });

    window.addEventListener('resize', () => {
      this.uiController.resizeMainCanvas();
      if (this.animator) {
        this.animator.updateSize();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.uiController.prevMural();
      } else if (e.key === 'ArrowRight') {
        this.uiController.nextMural();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.triggerFragmentAnimation();
      }
    });
  }

  private setupAnimator(): void {
    const mainCanvas = this.uiController.getMainCanvas();
    const wrapper = mainCanvas.parentElement;
    if (!wrapper) return;

    const animCanvas = document.createElement('canvas');
    animCanvas.style.position = 'absolute';
    animCanvas.style.top = '0';
    animCanvas.style.left = '0';
    animCanvas.style.width = '100%';
    animCanvas.style.height = '100%';
    animCanvas.style.pointerEvents = 'none';
    animCanvas.style.opacity = '0';
    animCanvas.style.transition = 'opacity 0.2s ease';
    animCanvas.style.zIndex = '5';

    wrapper.appendChild(animCanvas);
    this.animationCanvas = animCanvas;

    this.animator = new FragmentAnimator({
      canvas: animCanvas,
      duration: 2500,
    });
  }

  private triggerFragmentAnimation(): void {
    if (!this.animator || !this.animationCanvas) return;
    if (this.animator.getIsAnimating()) return;

    const currentMural = this.uiController.getCurrentMural();
    const state = this.uiController.getState();

    this.animationCanvas.style.opacity = '1';

    this.animator.start(
      (ctx, w, h, tone) => currentMural.draw(ctx, w, h, tone),
      state.toneShift,
      () => {
        if (this.animationCanvas) {
          this.animationCanvas.style.opacity = '0';
        }
      }
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const gallery = new MuralGallery();
  gallery.init();
});
