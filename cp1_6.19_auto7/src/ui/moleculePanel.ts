import { SceneManager } from '../engine/sceneManager';
import { getMoleculeList, loadMolecule, MoleculeData } from '../engine/moleculeLoader';
import { MeasureTool } from '../engine/measureTool';
import { EditTool } from '../engine/editTool';

export class MoleculePanel {
  private sceneManager: SceneManager;
  private measureTool: MeasureTool;
  private editTool: EditTool;
  private listElement: HTMLUListElement;
  private sidebarElement: HTMLElement;
  private menuToggle: HTMLElement | null;

  private currentMoleculeId: string | null = null;
  private currentMoleculeData: MoleculeData | null = null;
  private isTransitioning = false;

  constructor(
    sceneManager: SceneManager,
    measureTool: MeasureTool,
    editTool: EditTool
  ) {
    this.sceneManager = sceneManager;
    this.measureTool = measureTool;
    this.editTool = editTool;

    const listEl = document.getElementById('molecule-list');
    const sidebarEl = document.getElementById('sidebar');
    if (!listEl || !sidebarEl) {
      throw new Error('Required DOM elements not found');
    }
    this.listElement = listEl as HTMLUListElement;
    this.sidebarElement = sidebarEl;
    this.menuToggle = document.getElementById('menu-toggle');

    this.renderList();
    this.setupMenuToggle();
  }

  private renderList(): void {
    const molecules = getMoleculeList();
    this.listElement.innerHTML = '';

    molecules.forEach((mol, index) => {
      const li = document.createElement('li');
      li.className = 'molecule-item';
      li.dataset.moleculeId = mol.id;

      li.innerHTML = `
        <div class="molecule-icon">${mol.name.charAt(0)}</div>
        <div class="molecule-info">
          <span class="molecule-name">${mol.name}</span>
          <span class="molecule-formula">${mol.formula}</span>
        </div>
      `;

      li.addEventListener('click', () => {
        this.selectMolecule(mol.id);
        if (window.innerWidth <= 768) {
          this.sidebarElement.classList.remove('expanded');
        }
      });

      this.listElement.appendChild(li);

      if (index === 0) {
        setTimeout(() => this.selectMolecule(mol.id), 100);
      }
    });
  }

  private setupMenuToggle(): void {
    if (!this.menuToggle) return;

    this.menuToggle.addEventListener('click', () => {
      this.sidebarElement.classList.toggle('expanded');
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.sidebarElement.classList.remove('expanded');
      }
    });
  }

  private updateActiveState(selectedId: string): void {
    const items = this.listElement.querySelectorAll('.molecule-item');
    items.forEach(item => {
      const id = item.getAttribute('data-molecule-id');
      if (id === selectedId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  public async selectMolecule(moleculeId: string): Promise<void> {
    if (this.isTransitioning || moleculeId === this.currentMoleculeId) return;

    const moleculeData = loadMolecule(moleculeId);
    if (!moleculeData) return;

    this.isTransitioning = true;
    this.updateActiveState(moleculeId);

    const transitionDuration = 500;
    const startTime = performance.now();

    if (this.currentMoleculeId) {
      await this.animateOpacity(1, 0, transitionDuration / 2);
      this.measureTool.clearMeasurements();
      this.sceneManager.clearLabels();
    }

    this.currentMoleculeId = moleculeId;
    this.currentMoleculeData = moleculeData;
    this.sceneManager.loadMolecule(moleculeData);
    this.measureTool.setBondsData(moleculeData.bonds);
    this.editTool.setMoleculeData(moleculeData);

    this.sceneManager.setMoleculeOpacity(0);
    await this.animateOpacity(0, 1, transitionDuration / 2);

    this.isTransitioning = false;
  }

  private animateOpacity(from: number, to: number, duration: number): Promise<void> {
    return new Promise(resolve => {
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const opacity = from + (to - from) * eased;

        this.sceneManager.setMoleculeOpacity(opacity);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  public getCurrentMoleculeData(): MoleculeData | null {
    return this.currentMoleculeData;
  }
}
