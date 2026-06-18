import * as THREE from 'three';
import { SceneManager } from './sceneManager';
import { MoleculeData, SCALE_FACTOR } from './moleculeLoader';
import { MeasureTool } from './measureTool';

export class EditTool {
  private sceneManager: SceneManager;
  private measureTool: MeasureTool;
  private moleculeData: MoleculeData | null = null;

  private isDragging = false;
  private draggedAtomId: number | null = null;
  private dragPlane: THREE.Plane | null = null;
  private dragOffset = new THREE.Vector3();
  private raycaster: THREE.Raycaster;

  constructor(sceneManager: SceneManager, measureTool: MeasureTool) {
    this.sceneManager = sceneManager;
    this.measureTool = measureTool;
    this.raycaster = new THREE.Raycaster();
  }

  public setMoleculeData(data: MoleculeData): void {
    this.moleculeData = data;
  }

  public getIsDragging(): boolean {
    return this.isDragging;
  }

  public getDraggedAtomId(): number | null {
    return this.draggedAtomId;
  }

  public startDrag(atomId: number, screenPoint: THREE.Vector2): boolean {
    if (!this.sceneManager.moleculeGroup || !this.moleculeData) return false;

    const atomMesh = this.sceneManager.moleculeGroup.userData.atomMeshes.get(atomId);
    if (!atomMesh) return false;

    this.isDragging = true;
    this.draggedAtomId = atomId;

    const worldPos = atomMesh.getWorldPosition(new THREE.Vector3());

    const cameraDir = new THREE.Vector3();
    this.sceneManager.camera.getWorldDirection(cameraDir);
    this.dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraDir, worldPos);

    const worldIntersection = new THREE.Vector3();
    this.raycaster.setFromCamera(screenPoint, this.sceneManager.camera);
    if (this.raycaster.ray.intersectPlane(this.dragPlane, worldIntersection)) {
      this.dragOffset.copy(worldPos).sub(worldIntersection);
    }

    this.sceneManager.highlightAtom(atomId, true);
    this.sceneManager.setInteracting(true);

    return true;
  }

  public updateDrag(screenPoint: THREE.Vector2): void {
    if (!this.isDragging || this.draggedAtomId === null || !this.dragPlane || !this.sceneManager.moleculeGroup) {
      return;
    }

    this.raycaster.setFromCamera(screenPoint, this.sceneManager.camera);
    const intersection = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
      return;
    }

    const newWorldPos = intersection.add(this.dragOffset);

    const moleculeGroup = this.sceneManager.moleculeGroup;
    const localPos = moleculeGroup.worldToLocal(newWorldPos.clone());

    this.sceneManager.updateAtomPosition(this.draggedAtomId, localPos);

    if (this.moleculeData) {
      const atomData = this.moleculeData.atoms.find(a => a.id === this.draggedAtomId);
      if (atomData) {
        atomData.position = [
          localPos.x / SCALE_FACTOR,
          localPos.y / SCALE_FACTOR,
          localPos.z / SCALE_FACTOR
        ];
      }
    }

    this.measureTool.updateMeasurements();
  }

  public endDrag(): void {
    if (this.draggedAtomId !== null) {
      this.sceneManager.highlightAtom(this.draggedAtomId, true);
    }
    this.isDragging = false;
    this.draggedAtomId = null;
    this.dragPlane = null;
    this.sceneManager.setInteracting(false);
  }

  public cancelDrag(): void {
    if (this.draggedAtomId !== null) {
      this.sceneManager.highlightAtom(this.draggedAtomId, false);
    }
    this.isDragging = false;
    this.draggedAtomId = null;
    this.dragPlane = null;
    this.sceneManager.setInteracting(false);
  }
}
