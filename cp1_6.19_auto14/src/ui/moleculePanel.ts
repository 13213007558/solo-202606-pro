import { getMoleculeList, MoleculeData, loadMolecule } from '../engine/moleculeLoader';
import { SceneManager } from '../engine/sceneManager';
import { InteractionHandler } from '../engine/interactionHandler';
import { MeasureTool } from '../engine/measureTool';

export class MoleculePanel {
  private container: HTMLElement;
  private menuToggle: HTMLElement;
  private sidebar: HTMLElement;
  private sceneManager: SceneManager;
  private interactionHandler: InteractionHandler;
  private measureTool: MeasureTool;
  private currentMoleculeId: string | null;
  private moleculeItems: Map<string, HTMLElement>;
  private isSidebarOpen: boolean;

  constructor(
    containerId: string,
    sceneManager: SceneManager,
    interactionHandler: InteractionHandler,
    measureTool: MeasureTool
  ) {
    this.container = document.getElementById(containerId)!;
    this.menuToggle = document.getElementById('menu-toggle')!;
    this.sidebar = document.getElementById('sidebar')!;
    this.sceneManager = sceneManager;
    this.interactionHandler = interactionHandler;
    this.measureTool = measureTool;
    this.currentMoleculeId = null;
    this.moleculeItems = new Map();
    this.isSidebarOpen = false;

    this.renderList();
    this.bindMenuToggle();

    const molecules = getMoleculeList();
    if (molecules.length > 0) {
      this.selectMolecule(molecules[0].id, false);
    }
  }

  private renderList(): void {
    this.container.innerHTML = '';
    const molecules = getMoleculeList();

    molecules.forEach(mol => {
      const item = document.createElement('div');
      item.className = 'molecule-item';
      item.dataset.id = mol.id;

      const nameEl = document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = mol.name;
      item.appendChild(nameEl);

      const formulaEl = document.createElement('div');
      formulaEl.className = 'formula';
      formulaEl.textContent = mol.formula;
      item.appendChild(formulaEl);

      item.addEventListener('click', () => {
        this.selectMolecule(mol.id, true);
        this.closeSidebarOnMobile();
      });

      this.moleculeItems.set(mol.id, item);
      this.container.appendChild(item);
    });
  }

  private bindMenuToggle(): void {
    this.menuToggle.addEventListener('click', () => {
      this.isSidebarOpen = !this.isSidebarOpen;
      if (this.isSidebarOpen) {
        this.sidebar.classList.add('open');
        this.menuToggle.classList.add('active');
      } else {
        this.sidebar.classList.remove('open');
        this.menuToggle.classList.remove('active');
      }
    });

    const viewport = document.getElementById('viewport');
    viewport?.addEventListener('click', () => {
      this.closeSidebarOnMobile();
    });
  }

  private closeSidebarOnMobile(): void {
    if (window.innerWidth <= 768 && this.isSidebarOpen) {
      this.isSidebarOpen = false;
      this.sidebar.classList.remove('open');
      this.menuToggle.classList.remove('active');
    }
  }

  public selectMolecule(id: string, animate: boolean = true): MoleculeData | null {
    const molecules = getMoleculeList();
    const found = molecules.find(m => m.id === id);
    if (!found) return null;

    this.moleculeItems.forEach((el, molId) => {
      if (molId === id) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    if (this.currentMoleculeId === id) {
      return null;
    }

    this.currentMoleculeId = id;

    if (animate) {
      this.interactionHandler.loadMoleculeById(id);
    } else {
      const data = loadMolecule(id);
      if (data) {
        this.sceneManager.renderMolecule(data);
        this.measureTool.clearMeasurements();
      }
      return data;
    }

    return loadMolecule(id);
  }

  public getCurrentMoleculeId(): string | null {
    return this.currentMoleculeId;
  }
}
