import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import {
  MoleculeData,
  AtomData,
  ATOM_COLORS,
  ATOM_RADIUS,
  BOND_RADIUS,
  SCALE_FACTOR
} from './moleculeLoader';

export interface AtomMesh extends THREE.Mesh {
  userData: {
    type: 'atom';
    atomId: number;
    element: string;
    originalColor: number;
    ring?: THREE.Mesh;
  };
}

export interface BondMesh extends THREE.Mesh {
  userData: {
    type: 'bond';
    bondId: number;
    atom1Id: number;
    atom2Id: number;
  };
}

export type MoleculeMeshGroup = THREE.Group & {
  userData: {
    moleculeId: string;
    atomMeshes: Map<number, AtomMesh>;
    bondMeshes: Map<number, BondMesh[]>;
  };
};

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public cssRenderer: CSS3DRenderer;
  public moleculeGroup: MoleculeMeshGroup | null = null;
  public labelContainer: THREE.Group;

  private container: HTMLElement;
  private atomGeometryCache: Map<string, THREE.SphereGeometry> = new Map();
  private bondGeometry: THREE.CylinderGeometry;
  private ringGeometry: THREE.RingGeometry;

  private rotationVelocityX = 0;
  private rotationVelocityY = 0;
  private isUserInteracting = false;
  private animationFrameId: number = 0;
  private fpsCounter: HTMLElement | null = null;
  private lastFpsTime = performance.now();
  private frameCount = 0;

  private onResizeBound: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.bondGeometry = new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, 1, 16);
    this.ringGeometry = new THREE.RingGeometry(0.55, 0.65, 32);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x10141E);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(container.clientWidth, container.clientHeight);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0';
    this.cssRenderer.domElement.style.left = '0';
    this.cssRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.cssRenderer.domElement);

    this.labelContainer = new THREE.Group();
    this.scene.add(this.labelContainer);

    this.setupLights();
    this.setupFPSCounter();

    this.onResizeBound = this.onResize.bind(this);
    window.addEventListener('resize', this.onResizeBound);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x00D4FF, 0.3);
    rimLight.position.set(0, -5, 5);
    this.scene.add(rimLight);

    const pointLight = new THREE.PointLight(0x00D4FF, 0.5, 20);
    pointLight.position.set(0, 0, 6);
    this.scene.add(pointLight);
  }

  private setupFPSCounter(): void {
    this.fpsCounter = document.getElementById('fps-counter');
  }

  private getAtomGeometry(radius: number): THREE.SphereGeometry {
    const key = radius.toFixed(4);
    if (!this.atomGeometryCache.has(key)) {
      this.atomGeometryCache.set(key, new THREE.SphereGeometry(radius, 32, 32));
    }
    return this.atomGeometryCache.get(key)!;
  }

  private createAtomMesh(atom: AtomData): AtomMesh {
    const color = ATOM_COLORS[atom.element];
    const radius = ATOM_RADIUS[atom.element] * SCALE_FACTOR;

    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.25,
      emissive: color,
      emissiveIntensity: 0.15
    });

    const mesh = new THREE.Mesh(this.getAtomGeometry(radius), material) as unknown as AtomMesh;
    mesh.position.set(
      atom.position[0] * SCALE_FACTOR,
      atom.position[1] * SCALE_FACTOR,
      atom.position[2] * SCALE_FACTOR
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      type: 'atom',
      atomId: atom.id,
      element: atom.element,
      originalColor: color
    };

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ring = new THREE.Mesh(this.ringGeometry.clone(), ringMaterial);
    ring.scale.setScalar(radius * 1.8);
    ring.lookAt(this.camera.position);
    mesh.add(ring);
    mesh.userData.ring = ring;

    return mesh;
  }

  private createBondMesh(
    atom1Pos: [number, number, number],
    atom2Pos: [number, number, number],
    bondId: number,
    atom1Id: number,
    atom2Id: number,
    offset = 0
  ): BondMesh {
    const start = new THREE.Vector3(
      atom1Pos[0] * SCALE_FACTOR,
      atom1Pos[1] * SCALE_FACTOR,
      atom1Pos[2] * SCALE_FACTOR
    );
    const end = new THREE.Vector3(
      atom2Pos[0] * SCALE_FACTOR,
      atom2Pos[1] * SCALE_FACTOR,
      atom2Pos[2] * SCALE_FACTOR
    );

    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();

    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    const material = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.4,
      roughness: 0.3
    });

    const geometry = new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, length, 12);
    const mesh = new THREE.Mesh(geometry, material) as unknown as BondMesh;

    mesh.position.copy(midPoint);

    if (offset !== 0) {
      const perp = new THREE.Vector3(0, 1, 0);
      if (Math.abs(direction.normalize().dot(perp)) > 0.9) {
        perp.set(1, 0, 0);
      }
      const offsetDir = new THREE.Vector3().crossVectors(direction, perp).normalize();
      mesh.position.add(offsetDir.multiplyScalar(offset));
    }

    const up = new THREE.Vector3(0, 1, 0);
    const axis = new THREE.Vector3().crossVectors(up, direction).normalize();
    const angle = Math.acos(up.dot(direction.clone().normalize()));
    mesh.setRotationFromAxisAngle(axis, angle);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      type: 'bond',
      bondId,
      atom1Id,
      atom2Id
    };

    return mesh;
  }

  public loadMolecule(moleculeData: MoleculeData): MoleculeMeshGroup {
    this.clearMolecule();

    const group = new THREE.Group() as MoleculeMeshGroup;
    group.userData = {
      moleculeId: moleculeData.id,
      atomMeshes: new Map(),
      bondMeshes: new Map()
    };

    moleculeData.atoms.forEach(atom => {
      const mesh = this.createAtomMesh(atom);
      group.add(mesh);
      group.userData.atomMeshes.set(atom.id, mesh);
    });

    moleculeData.bonds.forEach(bond => {
      const atom1 = moleculeData.atoms.find(a => a.id === bond.atom1);
      const atom2 = moleculeData.atoms.find(a => a.id === bond.atom2);
      if (!atom1 || !atom2) return;

      const order = bond.order || 1;
      const bondMeshes: BondMesh[] = [];

      if (order === 1) {
        const m = this.createBondMesh(atom1.position, atom2.position, bond.id, bond.atom1, bond.atom2);
        group.add(m);
        bondMeshes.push(m);
      } else if (order === 2) {
        const m1 = this.createBondMesh(atom1.position, atom2.position, bond.id, bond.atom1, bond.atom2, 0.08);
        const m2 = this.createBondMesh(atom1.position, atom2.position, bond.id, bond.atom1, bond.atom2, -0.08);
        group.add(m1);
        group.add(m2);
        bondMeshes.push(m1, m2);
      } else if (order === 3) {
        const m1 = this.createBondMesh(atom1.position, atom2.position, bond.id, bond.atom1, bond.atom2, 0.12);
        const m2 = this.createBondMesh(atom1.position, atom2.position, bond.id, bond.atom1, bond.atom2, 0);
        const m3 = this.createBondMesh(atom1.position, atom2.position, bond.id, bond.atom1, bond.atom2, -0.12);
        group.add(m1);
        group.add(m2);
        group.add(m3);
        bondMeshes.push(m1, m2, m3);
      }

      group.userData.bondMeshes.set(bond.id, bondMeshes);
    });

    this.moleculeGroup = group;
    this.scene.add(group);
    this.fitCamera();

    return group;
  }

  public clearMolecule(): void {
    if (this.moleculeGroup) {
      this.moleculeGroup.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry && obj.geometry !== this.bondGeometry) {
            obj.geometry.dispose();
          }
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        }
      });
      this.scene.remove(this.moleculeGroup);
      this.moleculeGroup = null;
    }
  }

  public clearLabels(): void {
    while (this.labelContainer.children.length > 0) {
      const child = this.labelContainer.children[0];
      this.labelContainer.remove(child);
    }
  }

  public fitCamera(): void {
    if (!this.moleculeGroup) return;

    const box = new THREE.Box3().setFromObject(this.moleculeGroup);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = (maxDim / 2) / Math.tan(fov / 2) * 1.8;

    this.camera.position.copy(center);
    this.camera.position.z += distance;
    this.camera.lookAt(center);
  }

  public setMoleculeOpacity(opacity: number): void {
    if (!this.moleculeGroup) return;

    this.moleculeGroup.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.transparent = opacity < 1;
          mat.opacity = opacity;
          if (obj.userData.type === 'atom') {
            mat.emissiveIntensity = 0.15 * opacity;
          }
        }
        if (obj.userData.ring) {
          (obj.userData.ring.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      }
    });

    this.labelContainer.children.forEach(child => {
      if (child instanceof THREE.Object3D && (child as any).element) {
        (child as any).element.style.opacity = opacity.toString();
      }
    });
  }

  public highlightAtom(atomId: number, highlight: boolean): void {
    if (!this.moleculeGroup) return;

    const atomMesh = this.moleculeGroup.userData.atomMeshes.get(atomId);
    if (!atomMesh || !atomMesh.userData.ring) return;

    const ring = atomMesh.userData.ring;
    const ringMat = ring.material as THREE.MeshBasicMaterial;

    if (highlight) {
      ringMat.opacity = 0.5;
    } else {
      ringMat.opacity = 0;
    }
  }

  public updateAtomPosition(atomId: number, position: THREE.Vector3): void {
    if (!this.moleculeGroup) return;

    const atomMesh = this.moleculeGroup.userData.atomMeshes.get(atomId);
    if (!atomMesh) return;

    atomMesh.position.copy(position);

    this.moleculeGroup.userData.bondMeshes.forEach(bondMeshes => {
      bondMeshes.forEach(bm => {
        if (bm.userData.atom1Id === atomId || bm.userData.atom2Id === atomId) {
          this.scene.remove(bm);
        }
      });
    });

    const atomsMap = this.moleculeGroup.userData.atomMeshes;
    this.moleculeGroup.userData.bondMeshes.forEach((bondMeshes, bondId) => {
      const sample = bondMeshes[0];
      if (!sample) return;

      const a1Id = sample.userData.atom1Id;
      const a2Id = sample.userData.atom2Id;

      if (a1Id !== atomId && a2Id !== atomId) return;

      const a1Mesh = atomsMap.get(a1Id);
      const a2Mesh = atomsMap.get(a2Id);
      if (!a1Mesh || !a2Mesh) return;

      const order = bondMeshes.length;
      const offsets = order === 1 ? [0] : order === 2 ? [0.08, -0.08] : [0.12, 0, -0.12];

      bondMeshes.forEach((bm, i) => {
        this.rebuildBondMesh(bm, a1Mesh, a2Mesh, offsets[i]);
      });
    });
  }

  private rebuildBondMesh(
    bondMesh: BondMesh,
    atom1: AtomMesh,
    atom2: AtomMesh,
    offset: number
  ): void {
    const start = atom1.position.clone();
    const end = atom2.position.clone();
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();

    (bondMesh.geometry as THREE.CylinderGeometry).dispose();
    bondMesh.geometry = new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, length, 12);

    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    bondMesh.position.copy(midPoint);

    if (offset !== 0) {
      const perp = new THREE.Vector3(0, 1, 0);
      const dirNorm = direction.clone().normalize();
      if (Math.abs(dirNorm.dot(perp)) > 0.9) {
        perp.set(1, 0, 0);
      }
      const offsetDir = new THREE.Vector3().crossVectors(dirNorm, perp).normalize();
      bondMesh.position.add(offsetDir.multiplyScalar(offset));
    }

    const up = new THREE.Vector3(0, 1, 0);
    const dirNorm = direction.clone().normalize();
    const axis = new THREE.Vector3().crossVectors(up, dirNorm).normalize();
    const angle = Math.acos(up.dot(dirNorm));
    if (axis.length() > 0.001) {
      bondMesh.setRotationFromAxisAngle(axis, angle);
    }
  }

  public setRotationVelocity(vx: number, vy: number): void {
    this.rotationVelocityX = vx;
    this.rotationVelocityY = vy;
  }

  public setInteracting(interacting: boolean): void {
    this.isUserInteracting = interacting;
  }

  public rotateMolecule(deltaX: number, deltaY: number): void {
    if (!this.moleculeGroup) return;

    const axisY = new THREE.Vector3(0, 1, 0);
    const axisX = new THREE.Vector3(1, 0, 0);

    this.moleculeGroup.rotateOnWorldAxis(axisY, deltaX);
    this.moleculeGroup.rotateOnWorldAxis(axisX, deltaY);

    this.updateAtomRingOrientations();
  }

  private updateAtomRingOrientations(): void {
    if (!this.moleculeGroup) return;
    this.moleculeGroup.userData.atomMeshes.forEach(atomMesh => {
      if (atomMesh.userData.ring) {
        atomMesh.userData.ring.lookAt(this.camera.position);
      }
    });
  }

  public zoom(factor: number): void {
    this.camera.position.multiplyScalar(factor);
    const maxDist = 50;
    const minDist = 3;
    const dist = this.camera.position.length();
    if (dist > maxDist) {
      this.camera.position.setLength(maxDist);
    } else if (dist < minDist) {
      this.camera.position.setLength(minDist);
    }
  }

  public getRaycaster(): THREE.Raycaster {
    return new THREE.Raycaster();
  }

  public startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      if (!this.isUserInteracting && this.moleculeGroup) {
        if (Math.abs(this.rotationVelocityX) > 0.0001 || Math.abs(this.rotationVelocityY) > 0.0001) {
          this.rotateMolecule(this.rotationVelocityX, this.rotationVelocityY);
          this.rotationVelocityX *= 0.95;
          this.rotationVelocityY *= 0.95;
        }
      }

      this.updateAtomRingOrientations();

      this.renderer.render(this.scene, this.camera);
      this.cssRenderer.render(this.scene, this.camera);

      this.updateFPS();
    };

    animate();
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      if (this.fpsCounter) {
        this.fpsCounter.textContent = `FPS: ${fps}`;
      }
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  public stopAnimationLoop(): void {
    cancelAnimationFrame(this.animationFrameId);
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.cssRenderer.setSize(width, height);
  }

  public dispose(): void {
    this.stopAnimationLoop();
    window.removeEventListener('resize', this.onResizeBound);
    this.clearMolecule();
    this.clearLabels();

    this.atomGeometryCache.forEach(geo => geo.dispose());
    this.atomGeometryCache.clear();
    this.bondGeometry.dispose();
    this.ringGeometry.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    if (this.cssRenderer.domElement.parentElement) {
      this.cssRenderer.domElement.parentElement.removeChild(this.cssRenderer.domElement);
    }
  }
}
