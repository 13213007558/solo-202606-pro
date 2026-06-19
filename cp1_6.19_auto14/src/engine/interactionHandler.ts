import * as THREE from 'three';
import { SceneManager, AtomMesh } from './sceneManager';
import { MeasureTool } from './measureTool';
import { EditTool } from './editTool';
import { MoleculeData, loadMolecule } from './moleculeLoader';

export enum InteractionMode {
  VIEW,
  SELECT,
  EDIT
}

export class InteractionHandler {
  private sceneManager: SceneManager;
  private measureTool: MeasureTool;
  private editTool: EditTool;
  private canvas: HTMLCanvasElement;
  private mode: InteractionMode;

  private isMouseDown: boolean;
  private mouseDownPos: { x: number; y: number };
  private mouseDownTime: number;
  private lastMousePos: { x: number; y: number };
  private hasDragged: boolean;
  private atomClickedOnDown: AtomMesh | null;
  private preventNextClick: boolean;

  constructor(sceneManager: SceneManager, measureTool: MeasureTool, editTool: EditTool) {
    this.sceneManager = sceneManager;
    this.measureTool = measureTool;
    this.editTool = editTool;
    this.canvas = sceneManager.getCanvas();
    this.mode = InteractionMode.VIEW;

    this.isMouseDown = false;
    this.mouseDownPos = { x: 0, y: 0 };
    this.mouseDownTime = 0;
    this.lastMousePos = { x: 0, y: 0 };
    this.hasDragged = false;
    this.atomClickedOnDown = null;
    this.preventNextClick = false;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('pointercancel', this.onPointerUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  private onPointerDown(e: PointerEvent): void {
    this.canvas.setPointerCapture(e.pointerId);
    this.isMouseDown = true;
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
    this.lastMousePos = { x: e.clientX, y: e.clientY };
    this.mouseDownTime = performance.now();
    this.hasDragged = false;
    this.preventNextClick = false;

    const atom = this.pickAtom(e.clientX, e.clientY);
    this.atomClickedOnDown = atom;

    if (atom) {
      const atomId = (atom as AtomMesh).userData.atomId;
      if (e.button === 0) {
        this.editTool.startDrag(atomId, e.clientX, e.clientY);
      }
    } else {
      this.sceneManager.removeSelectedRing();
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const dx = e.clientX - this.lastMousePos.x;
    const dy = e.clientY - this.lastMousePos.y;
    const distFromStart = Math.hypot(e.clientX - this.mouseDownPos.x, e.clientY - this.mouseDownPos.y);

    if (distFromStart > 4) {
      this.hasDragged = true;
    }

    if (this.isMouseDown) {
      if (this.editTool.isDragging()) {
        this.editTool.doDrag(e.clientX, e.clientY);
      } else {
        this.sceneManager.rotate(dx, dy);
      }
    }

    this.lastMousePos = { x: e.clientX, y: e.clientY };
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.isMouseDown) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
    this.isMouseDown = false;

    const wasEditing = this.editTool.isDragging();
    const editMoved = wasEditing && this.hasDragged;

    if (wasEditing) {
      this.editTool.endDrag();
    }

    if (!this.hasDragged && this.atomClickedOnDown && !this.preventNextClick) {
      const atomId = this.atomClickedOnDown.userData.atomId;
      this.measureTool.selectAtom(atomId);

      const selected = this.measureTool.getSelectedAtoms();
      if (selected.includes(atomId)) {
        this.sceneManager.showSelectedRing(atomId);
      }
    }

    if (this.hasDragged && !wasEditing) {
      const dx = e.clientX - this.mouseDownPos.x;
      const dy = e.clientY - this.mouseDownPos.y;
      const dt = Math.max((performance.now() - this.mouseDownTime) / 1000, 0.01);
      this.sceneManager.setRotationVelocity(-dy * 0.002 / dt, dx * 0.002 / dt);
    }

    if (editMoved) {
      this.sceneManager.showSelectedRing(this.atomClickedOnDown?.userData.atomId || '');
    }

    this.atomClickedOnDown = null;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.sceneManager.zoom(e.deltaY);
  }

  private pickAtom(screenX: number, screenY: number): AtomMesh | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.sceneManager.getCamera());

    const hits = this.sceneManager.raycastAtoms(raycaster);
    if (hits.length > 0) {
      return hits[0].object as AtomMesh;
    }
    return null;
  }

  public getMode(): InteractionMode {
    return this.mode;
  }

  public setMode(mode: InteractionMode): void {
    this.mode = mode;
  }

  public loadMoleculeById(id: string): MoleculeData | null {
    const data = loadMolecule(id);
    if (data) {
      this.sceneManager.switchMoleculeSmooth(data);
      this.measureTool.clearMeasurements();
      this.sceneManager.removeSelectedRing();
    }
    return data;
  }

  public dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    window.removeEventListener('pointermove', this.onPointerMove.bind(this));
    window.removeEventListener('pointerup', this.onPointerUp.bind(this));
    window.removeEventListener('pointercancel', this.onPointerUp.bind(this));
    this.canvas.removeEventListener('wheel', this.onWheel.bind(this));
  }
}
