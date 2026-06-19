import * as THREE from 'three';
import { SceneManager, AtomMesh } from './sceneManager';
import { MeasureTool } from './measureTool';

export class EditTool {
  private sceneManager: SceneManager;
  private measureTool: MeasureTool;
  private dragging: boolean;
  private draggedAtomId: string | null;
  private dragPlane: THREE.Plane;
  private dragOffset: THREE.Vector3;
  private originalPosition: THREE.Vector3 | null;
  private onEditComplete?: () => void;

  constructor(sceneManager: SceneManager, measureTool: MeasureTool, onEditComplete?: () => void) {
    this.sceneManager = sceneManager;
    this.measureTool = measureTool;
    this.dragging = false;
    this.draggedAtomId = null;
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();
    this.originalPosition = null;
    this.onEditComplete = onEditComplete;
  }

  public startDrag(atomId: string, screenX: number, screenY: number): boolean {
    const atomMesh = this.sceneManager.atomMap.get(atomId);
    if (!atomMesh) return false;

    this.dragging = true;
    this.draggedAtomId = atomId;
    this.originalPosition = atomMesh.position.clone();

    const worldPos = new THREE.Vector3();
    atomMesh.getWorldPosition(worldPos);

    const camera = this.sceneManager.getCamera();
    const normal = new THREE.Vector3().subVectors(camera.position, worldPos).normalize();
    this.dragPlane.setFromNormalAndCoplanarPoint(normal, worldPos);

    const worldDragPoint = this.getDragPlaneIntersection(screenX, screenY);
    if (worldDragPoint) {
      const localDragPoint = worldDragPoint.clone();
      this.sceneManager.moleculeGroup.worldToLocal(localDragPoint);
      this.dragOffset.copy(atomMesh.position).sub(localDragPoint);
    }

    this.sceneManager.showSelectedRing(atomId);
    return true;
  }

  public doDrag(screenX: number, screenY: number): boolean {
    if (!this.dragging || !this.draggedAtomId) return false;

    const worldPos = this.getDragPlaneIntersection(screenX, screenY);
    if (!worldPos) return false;

    const localPos = worldPos.clone();
    this.sceneManager.moleculeGroup.worldToLocal(localPos);
    const newPos = localPos.add(this.dragOffset);

    this.sceneManager.setAtomPosition(this.draggedAtomId, newPos);
    this.measureTool.refreshAllMeasurements();
    this.sceneManager.showSelectedRing(this.draggedAtomId);

    return true;
  }

  public endDrag(): boolean {
    if (!this.dragging || !this.draggedAtomId) return false;

    this.dragging = false;
    this.draggedAtomId = null;
    this.originalPosition = null;

    if (this.onEditComplete) {
      this.onEditComplete();
    }

    return true;
  }

  public isDragging(): boolean {
    return this.dragging;
  }

  public getDraggedAtomId(): string | null {
    return this.draggedAtomId;
  }

  private getDragPlaneIntersection(screenX: number, screenY: number): THREE.Vector3 | null {
    const canvas = this.sceneManager.getCanvas();
    const camera = this.sceneManager.getCamera();
    const rect = canvas.getBoundingClientRect();

    const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((screenY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const intersection = new THREE.Vector3();
    const result = raycaster.ray.intersectPlane(this.dragPlane, intersection);

    return result ? intersection : null;
  }
}
