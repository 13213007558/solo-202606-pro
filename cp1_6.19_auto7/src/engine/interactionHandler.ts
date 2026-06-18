import * as THREE from 'three';
import { SceneManager, AtomMesh } from './sceneManager';
import { MeasureTool } from './measureTool';
import { EditTool } from './editTool';

export class InteractionHandler {
  private sceneManager: SceneManager;
  private measureTool: MeasureTool;
  private editTool: EditTool;
  private container: HTMLElement;
  private raycaster: THREE.Raycaster;

  private isRotating = false;
  private isDraggingAtom = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private mouseDownX = 0;
  private mouseDownY = 0;
  private mouseDownTime = 0;
  private movedDistance = 0;
  private readonly DRAG_THRESHOLD = 5;
  private readonly CLICK_TIME_THRESHOLD = 250;

  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;

  constructor(
    sceneManager: SceneManager,
    measureTool: MeasureTool,
    editTool: EditTool,
    container: HTMLElement
  ) {
    this.sceneManager = sceneManager;
    this.measureTool = measureTool;
    this.editTool = editTool;
    this.container = container;
    this.raycaster = new THREE.Raycaster();

    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onContextMenuBound = this.onContextMenu.bind(this);

    this.attachEvents();
  }

  private attachEvents(): void {
    this.container.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('mousemove', this.onMouseMoveBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
    this.container.addEventListener('wheel', this.onWheelBound, { passive: false });
    this.container.addEventListener('contextmenu', this.onContextMenuBound);
  }

  private detachEvents(): void {
    this.container.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
    this.container.removeEventListener('wheel', this.onWheelBound);
    this.container.removeEventListener('contextmenu', this.onContextMenuBound);
  }

  private getNormalizedScreenPoint(e: MouseEvent): THREE.Vector2 {
    const rect = this.container.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private pickAtom(e: MouseEvent): AtomMesh | null {
    if (!this.sceneManager.moleculeGroup) return null;

    const screenPoint = this.getNormalizedScreenPoint(e);
    this.raycaster.setFromCamera(screenPoint, this.sceneManager.camera);

    const atomMeshes: THREE.Mesh[] = [];
    this.sceneManager.moleculeGroup.userData.atomMeshes.forEach(mesh => {
      atomMeshes.push(mesh);
    });

    const intersects = this.raycaster.intersectObjects(atomMeshes, false);
    if (intersects.length > 0) {
      return intersects[0].object as AtomMesh;
    }

    return null;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;

    this.mouseDownX = e.clientX;
    this.mouseDownY = e.clientY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.mouseDownTime = performance.now();
    this.movedDistance = 0;

    const hitAtom = this.pickAtom(e);
    if (hitAtom) {
      const screenPoint = this.getNormalizedScreenPoint(e);
      this.editTool.startDrag(hitAtom.userData.atomId, screenPoint);
      this.isDraggingAtom = true;
    } else {
      this.isRotating = true;
      this.sceneManager.setInteracting(true);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    if (this.isDraggingAtom) {
      const screenPoint = this.getNormalizedScreenPoint(e);
      this.editTool.updateDrag(screenPoint);
    } else if (this.isRotating) {
      const rotationSpeed = 0.008;
      this.sceneManager.rotateMolecule(
        deltaX * rotationSpeed,
        deltaY * rotationSpeed
      );
      this.sceneManager.setRotationVelocity(
        deltaX * rotationSpeed * 0.6,
        deltaY * rotationSpeed * 0.6
      );
    }

    this.movedDistance += Math.abs(deltaX) + Math.abs(deltaY);
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;

    const elapsed = performance.now() - this.mouseDownTime;
    const isClick =
      this.movedDistance < this.DRAG_THRESHOLD && elapsed < this.CLICK_TIME_THRESHOLD;

    if (this.isDraggingAtom) {
      if (isClick) {
        const hitAtom = this.pickAtom(e);
        if (hitAtom) {
          this.measureTool.addSelectedAtom(hitAtom.userData.atomId);
        }
        this.editTool.cancelDrag();
      } else {
        this.editTool.endDrag();
      }
      this.isDraggingAtom = false;
    } else if (this.isRotating) {
      this.sceneManager.setInteracting(false);
      this.isRotating = false;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    this.sceneManager.zoom(zoomFactor);
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    this.measureTool.clearMeasurements();
  }

  public dispose(): void {
    this.detachEvents();
  }
}
