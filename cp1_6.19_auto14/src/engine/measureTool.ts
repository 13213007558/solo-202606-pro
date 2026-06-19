import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { SceneManager, AtomMesh } from './sceneManager';

export interface BondMeasurement {
  id: string;
  atom1Id: string;
  atom2Id: string;
  length: number;
  label: CSS3DObject;
  line?: THREE.Line;
}

export interface AngleMeasurement {
  id: string;
  atom1Id: string;
  vertexId: string;
  atom2Id: string;
  angle: number;
  label: CSS3DObject;
  arc?: THREE.Line;
}

export class MeasureTool {
  private sceneManager: SceneManager;
  private selectedAtoms: string[];
  public bondMeasurements: Map<string, BondMeasurement>;
  public angleMeasurements: Map<string, AngleMeasurement>;
  private labelContainer: THREE.Group;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.selectedAtoms = [];
    this.bondMeasurements = new Map();
    this.angleMeasurements = new Map();
    this.labelContainer = new THREE.Group();
    this.sceneManager.scene.add(this.labelContainer);
  }

  public selectAtom(atomId: string): void {
    const idx = this.selectedAtoms.indexOf(atomId);
    if (idx !== -1) {
      this.selectedAtoms.splice(idx, 1);
      this.refreshMeasurements();
      return;
    }

    if (this.selectedAtoms.length >= 3) {
      this.clearMeasurements();
      this.selectedAtoms = [];
    }

    this.selectedAtoms.push(atomId);
    this.refreshMeasurements();
  }

  public clearSelectedAtoms(): void {
    this.selectedAtoms = [];
  }

  public getSelectedAtoms(): string[] {
    return [...this.selectedAtoms];
  }

  private refreshMeasurements(): void {
    this.clearVisualizations();

    if (this.selectedAtoms.length === 2) {
      this.measureBond(this.selectedAtoms[0], this.selectedAtoms[1]);
    } else if (this.selectedAtoms.length === 3) {
      this.measureBond(this.selectedAtoms[0], this.selectedAtoms[1]);
      this.measureBond(this.selectedAtoms[1], this.selectedAtoms[2]);
      this.measureAngle(this.selectedAtoms[0], this.selectedAtoms[1], this.selectedAtoms[2]);
    }
  }

  private getAtomWorldPosition(atomId: string): THREE.Vector3 | null {
    const mesh = this.sceneManager.atomMap.get(atomId);
    if (!mesh) return null;
    const pos = new THREE.Vector3();
    mesh.getWorldPosition(pos);
    return pos;
  }

  private getAtomLocalPosition(atomId: string): THREE.Vector3 | null {
    const mesh = this.sceneManager.atomMap.get(atomId);
    if (!mesh) return null;
    return mesh.position.clone();
  }

  private measureBond(atom1Id: string, atom2Id: string): void {
    const p1 = this.getAtomLocalPosition(atom1Id);
    const p2 = this.getAtomLocalPosition(atom2Id);
    if (!p1 || !p2) return;

    const distance = p1.distanceTo(p2);
    const measurementId = `bond_${atom1Id}_${atom2Id}`;
    const altId = `bond_${atom2Id}_${atom1Id}`;

    if (this.bondMeasurements.has(measurementId) || this.bondMeasurements.has(altId)) {
      return;
    }

    const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const labelEl = document.createElement('div');
    labelEl.className = 'measurement-label';
    labelEl.textContent = `${distance.toFixed(3)} Å`;
    const label = new CSS3DObject(labelEl);
    label.position.copy(midpoint);
    label.position.y += 0.3;
    this.labelContainer.add(label);

    const linePoints = [p1.clone(), p2.clone()];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.5
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.sceneManager.moleculeGroup.add(line);

    this.bondMeasurements.set(measurementId, {
      id: measurementId,
      atom1Id,
      atom2Id,
      length: distance,
      label,
      line
    });
  }

  private measureAngle(atom1Id: string, vertexId: string, atom2Id: string): void {
    const p1 = this.getAtomLocalPosition(atom1Id);
    const pv = this.getAtomLocalPosition(vertexId);
    const p2 = this.getAtomLocalPosition(atom2Id);
    if (!p1 || !pv || !p2) return;

    const v1 = new THREE.Vector3().subVectors(p1, pv).normalize();
    const v2 = new THREE.Vector3().subVectors(p2, pv).normalize();
    const angleRad = v1.angleTo(v2);
    const angleDeg = angleRad * (180 / Math.PI);

    const measurementId = `angle_${atom1Id}_${vertexId}_${atom2Id}`;

    const bisector = new THREE.Vector3().addVectors(v1, v2).normalize();
    const labelPos = pv.clone().add(bisector.multiplyScalar(0.9));

    const labelEl = document.createElement('div');
    labelEl.className = 'measurement-label';
    labelEl.textContent = `${angleDeg.toFixed(2)}°`;
    const label = new CSS3DObject(labelEl);
    label.position.copy(labelPos);
    this.labelContainer.add(label);

    const arcPoints: THREE.Vector3[] = [];
    const segments = 32;
    const radius = Math.min(p1.distanceTo(pv), p2.distanceTo(pv)) * 0.5;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const interpolated = new THREE.Vector3().lerpVectors(v1, v2, t).normalize();
      arcPoints.push(pv.clone().add(interpolated.multiplyScalar(radius)));
    }

    const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMaterial = new THREE.LineBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.6
    });
    const arc = new THREE.Line(arcGeometry, arcMaterial);
    this.sceneManager.moleculeGroup.add(arc);

    this.angleMeasurements.set(measurementId, {
      id: measurementId,
      atom1Id,
      vertexId,
      atom2Id,
      angle: angleDeg,
      label,
      arc
    });
  }

  public refreshAllMeasurements(): void {
    const currentSelected = [...this.selectedAtoms];
    this.clearVisualizations();
    this.selectedAtoms = currentSelected;
    this.refreshMeasurements();
  }

  private clearVisualizations(): void {
    this.bondMeasurements.forEach(m => {
      this.labelContainer.remove(m.label);
      if (m.line) {
        this.sceneManager.moleculeGroup.remove(m.line);
        m.line.geometry.dispose();
        (m.line.material as THREE.Material).dispose();
      }
    });
    this.bondMeasurements.clear();

    this.angleMeasurements.forEach(m => {
      this.labelContainer.remove(m.label);
      if (m.arc) {
        this.sceneManager.moleculeGroup.remove(m.arc);
        m.arc.geometry.dispose();
        (m.arc.material as THREE.Material).dispose();
      }
    });
    this.angleMeasurements.clear();
  }

  public clearMeasurements(): void {
    this.clearVisualizations();
    this.selectedAtoms = [];
  }

  public updateLabelPositions(): void {
    this.bondMeasurements.forEach(m => {
      const p1 = this.getAtomLocalPosition(m.atom1Id);
      const p2 = this.getAtomLocalPosition(m.atom2Id);
      if (p1 && p2) {
        const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        m.label.position.copy(midpoint);
        m.label.position.y += 0.3;
      }
    });

    this.angleMeasurements.forEach(m => {
      const p1 = this.getAtomLocalPosition(m.atom1Id);
      const pv = this.getAtomLocalPosition(m.vertexId);
      const p2 = this.getAtomLocalPosition(m.atom2Id);
      if (p1 && pv && p2) {
        const v1 = new THREE.Vector3().subVectors(p1, pv).normalize();
        const v2 = new THREE.Vector3().subVectors(p2, pv).normalize();
        const bisector = new THREE.Vector3().addVectors(v1, v2).normalize();
        m.label.position.copy(pv.clone().add(bisector.multiplyScalar(0.9)));
      }
    });
  }
}
