import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { SceneManager, AtomMesh } from './sceneManager';
import { SCALE_FACTOR, areAtomsBonded, BondData } from './moleculeLoader';

export interface BondLengthMeasurement {
  type: 'length';
  atom1Id: number;
  atom2Id: number;
  label: CSS3DObject;
  line?: THREE.Line;
}

export interface BondAngleMeasurement {
  type: 'angle';
  atom1Id: number;
  vertexAtomId: number;
  atom3Id: number;
  label: CSS3DObject;
  arc?: THREE.Line;
}

export type Measurement = BondLengthMeasurement | BondAngleMeasurement;

export class MeasureTool {
  private sceneManager: SceneManager;
  private measurements: Measurement[] = [];
  private selectedAtoms: number[] = [];
  private bondsData: BondData[] = [];

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  public setBondsData(bonds: BondData[]): void {
    this.bondsData = bonds;
  }

  public getSelectedAtoms(): number[] {
    return [...this.selectedAtoms];
  }

  public addSelectedAtom(atomId: number): void {
    if (this.selectedAtoms.includes(atomId)) {
      const idx = this.selectedAtoms.indexOf(atomId);
      this.selectedAtoms.splice(idx, 1);
      this.sceneManager.highlightAtom(atomId, false);
      return;
    }

    if (this.selectedAtoms.length >= 3) {
      this.clearSelection();
    }

    this.selectedAtoms.push(atomId);
    this.sceneManager.highlightAtom(atomId, true);

    this.tryCreateMeasurement();
  }

  public clearSelection(): void {
    this.selectedAtoms.forEach(id => {
      this.sceneManager.highlightAtom(id, false);
    });
    this.selectedAtoms = [];
  }

  public clearMeasurements(): void {
    this.measurements.forEach(m => {
      this.sceneManager.labelContainer.remove(m.label);
      if (m.label.element instanceof HTMLElement && m.label.element.parentNode) {
        m.label.element.parentNode.removeChild(m.label.element);
      }
      if (m.type === 'length' && m.line) {
        this.sceneManager.scene.remove(m.line);
        m.line.geometry.dispose();
        (m.line.material as THREE.Material).dispose();
      }
      if (m.type === 'angle' && m.arc) {
        this.sceneManager.scene.remove(m.arc);
        m.arc.geometry.dispose();
        (m.arc.material as THREE.Material).dispose();
      }
    });
    this.measurements = [];
    this.clearSelection();
  }

  private tryCreateMeasurement(): void {
    if (this.selectedAtoms.length === 2) {
      const [a1, a2] = this.selectedAtoms;
      if (areAtomsBonded(a1, a2, this.bondsData)) {
        this.createBondLengthMeasurement(a1, a2);
        this.clearSelection();
      }
    } else if (this.selectedAtoms.length === 3) {
      const [a1, vertex, a3] = this.selectedAtoms;
      if (
        areAtomsBonded(a1, vertex, this.bondsData) &&
        areAtomsBonded(vertex, a3, this.bondsData)
      ) {
        this.createBondAngleMeasurement(a1, vertex, a3);
        this.clearSelection();
      } else {
        this.clearSelection();
      }
    }
  }

  private createBondLengthMeasurement(atom1Id: number, atom2Id: number): void {
    const atom1 = this.getAtomMesh(atom1Id);
    const atom2 = this.getAtomMesh(atom2Id);
    if (!atom1 || !atom2) return;

    const distance = this.calculateBondLength(atom1, atom2);

    const div = document.createElement('div');
    div.style.cssText = `
      color: #FFD700;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 600;
      text-shadow: 0 0 8px rgba(255, 215, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.8);
      background: rgba(16, 20, 30, 0.75);
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 215, 0, 0.3);
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      backdrop-filter: blur(4px);
    `;
    div.textContent = `${distance.toFixed(3)} Å`;

    const label = new CSS3DObject(div);
    this.sceneManager.labelContainer.add(label);

    const midPoint = new THREE.Vector3().addVectors(atom1.position, atom2.position).multiplyScalar(0.5);
    label.position.copy(midPoint);
    label.position.y += 0.3;

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      atom1.position.clone(),
      atom2.position.clone()
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.5,
      linewidth: 2
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.sceneManager.scene.add(line);

    this.measurements.push({
      type: 'length',
      atom1Id,
      atom2Id,
      label,
      line
    });
  }

  private createBondAngleMeasurement(atom1Id: number, vertexAtomId: number, atom3Id: number): void {
    const atom1 = this.getAtomMesh(atom1Id);
    const vertex = this.getAtomMesh(vertexAtomId);
    const atom3 = this.getAtomMesh(atom3Id);
    if (!atom1 || !vertex || !atom3) return;

    const angle = this.calculateBondAngle(atom1.position, vertex.position, atom3.position);

    const div = document.createElement('div');
    div.style.cssText = `
      color: #FFD700;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 600;
      text-shadow: 0 0 8px rgba(255, 215, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.8);
      background: rgba(16, 20, 30, 0.75);
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 215, 0, 0.3);
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      backdrop-filter: blur(4px);
    `;
    div.textContent = `${angle.toFixed(2)}°`;

    const label = new CSS3DObject(div);
    this.sceneManager.labelContainer.add(label);

    const v1 = new THREE.Vector3().subVectors(atom1.position, vertex.position).normalize();
    const v2 = new THREE.Vector3().subVectors(atom3.position, vertex.position).normalize();
    const bisector = new THREE.Vector3().addVectors(v1, v2).normalize();
    const labelPos = vertex.position.clone().add(bisector.multiplyScalar(0.8));
    label.position.copy(labelPos);

    const arc = this.createAngleArc(atom1.position, vertex.position, atom3.position) ?? undefined;
    if (arc) {
      this.sceneManager.scene.add(arc);
    }

    this.measurements.push({
      type: 'angle',
      atom1Id,
      vertexAtomId,
      atom3Id,
      label,
      arc
    });
  }

  private createAngleArc(p1: THREE.Vector3, vertex: THREE.Vector3, p3: THREE.Vector3): THREE.Line | null {
    const v1 = new THREE.Vector3().subVectors(p1, vertex);
    const v2 = new THREE.Vector3().subVectors(p3, vertex);

    const len1 = v1.length();
    const len2 = v2.length();
    const radius = Math.min(len1, len2) * 0.4;

    const v1Norm = v1.clone().normalize();
    const v2Norm = v2.clone().normalize();

    const angle = Math.acos(Math.max(-1, Math.min(1, v1Norm.dot(v2Norm))));
    const segments = Math.max(8, Math.ceil(angle * 20));

    const normal = new THREE.Vector3().crossVectors(v1Norm, v2Norm).normalize();
    if (normal.length() < 0.001) return null;

    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * angle;
      const point = v1Norm.clone()
        .applyAxisAngle(normal, t)
        .multiplyScalar(radius)
        .add(vertex);
      points.push(point);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });

    return new THREE.Line(geometry, material);
  }

  private calculateBondLength(atom1: AtomMesh, atom2: AtomMesh): number {
    const worldPos1 = atom1.getWorldPosition(new THREE.Vector3());
    const worldPos2 = atom2.getWorldPosition(new THREE.Vector3());
    return worldPos1.distanceTo(worldPos2) / SCALE_FACTOR;
  }

  private calculateBondAngle(p1: THREE.Vector3, vertex: THREE.Vector3, p3: THREE.Vector3): number {
    const v1 = new THREE.Vector3().subVectors(p1, vertex);
    const v2 = new THREE.Vector3().subVectors(p3, vertex);
    const cosAngle = v1.dot(v2) / (v1.length() * v2.length());
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    return (angle * 180) / Math.PI;
  }

  private getAtomMesh(atomId: number): AtomMesh | null {
    if (!this.sceneManager.moleculeGroup) return null;
    return this.sceneManager.moleculeGroup.userData.atomMeshes.get(atomId) || null;
  }

  public updateMeasurements(): void {
    this.measurements.forEach(m => {
      if (m.type === 'length') {
        const atom1 = this.getAtomMesh(m.atom1Id);
        const atom2 = this.getAtomMesh(m.atom2Id);
        if (!atom1 || !atom2) return;

        const midPoint = new THREE.Vector3().addVectors(atom1.position, atom2.position).multiplyScalar(0.5);
        m.label.position.copy(midPoint);
        m.label.position.y += 0.3;

        const distance = this.calculateBondLength(atom1, atom2);
        (m.label.element as HTMLElement).textContent = `${distance.toFixed(3)} Å`;

        if (m.line) {
          const positions = m.line.geometry.attributes.position.array as Float32Array;
          positions[0] = atom1.position.x;
          positions[1] = atom1.position.y;
          positions[2] = atom1.position.z;
          positions[3] = atom2.position.x;
          positions[4] = atom2.position.y;
          positions[5] = atom2.position.z;
          m.line.geometry.attributes.position.needsUpdate = true;
        }
      } else if (m.type === 'angle') {
        const atom1 = this.getAtomMesh(m.atom1Id);
        const vertex = this.getAtomMesh(m.vertexAtomId);
        const atom3 = this.getAtomMesh(m.atom3Id);
        if (!atom1 || !vertex || !atom3) return;

        const v1 = new THREE.Vector3().subVectors(atom1.position, vertex.position).normalize();
        const v2 = new THREE.Vector3().subVectors(atom3.position, vertex.position).normalize();
        const bisector = new THREE.Vector3().addVectors(v1, v2).normalize();
        const labelPos = vertex.position.clone().add(bisector.multiplyScalar(0.8));
        m.label.position.copy(labelPos);

        const angle = this.calculateBondAngle(atom1.position, vertex.position, atom3.position);
        (m.label.element as HTMLElement).textContent = `${angle.toFixed(2)}°`;

        if (m.arc) {
          this.sceneManager.scene.remove(m.arc);
          m.arc.geometry.dispose();
          (m.arc.material as THREE.Material).dispose();
          const newArc = this.createAngleArc(atom1.position, vertex.position, atom3.position);
          if (newArc) {
            this.sceneManager.scene.add(newArc);
            m.arc = newArc;
          }
        }
      }
    });
  }
}
