import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { MoleculeData, ELEMENT_COLORS, ELEMENT_RADIUS, BOND_RADIUS, AtomData, BondData } from './moleculeLoader';

export interface AtomMesh extends THREE.Mesh {
  userData: {
    type: 'atom';
    atomId: string;
    element: string;
    originalColor: number;
  };
}

export interface BondMesh extends THREE.Mesh {
  userData: {
    type: 'bond';
    bondId: string;
    atom1: string;
    atom2: string;
  };
}

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public cssRenderer: CSS3DRenderer;
  public moleculeGroup: THREE.Group;
  public atomMap: Map<string, AtomMesh>;
  public bondMap: Map<string, BondMesh>;
  public atomDataMap: Map<string, AtomData>;
  public bondDataMap: Map<string, BondData>;
  public selectedRing: THREE.Mesh | null = null;

  private canvas: HTMLCanvasElement;
  private cssContainer: HTMLElement;
  private fpsElement: HTMLElement;
  private rotationTarget: { x: number; y: number };
  private rotationVelocity: { x: number; y: number };
  private currentRotation: { x: number; y: number };
  private cameraDistance: number;
  private targetCameraDistance: number;
  private frameCount: number;
  private lastFpsTime: number;
  private lastFrameTime: number;
  private animationId: number;
  private moleculeOpacity: number;
  private targetMoleculeOpacity: number;
  private switchInProgress: boolean;
  private pendingMolecule: MoleculeData | null;
  private inertiaDamping: number;
  private light1: THREE.PointLight;
  private light2: THREE.PointLight;
  private ambientLight: THREE.AmbientLight;

  constructor(canvasId: string, cssContainerId: string, fpsId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.cssContainer = document.getElementById(cssContainerId) as HTMLElement;
    this.fpsElement = document.getElementById(fpsId) as HTMLElement;

    this.atomMap = new Map();
    this.bondMap = new Map();
    this.atomDataMap = new Map();
    this.bondDataMap = new Map();

    this.rotationTarget = { x: 0, y: 0 };
    this.rotationVelocity = { x: 0, y: 0 };
    this.currentRotation = { x: 0, y: 0 };
    this.cameraDistance = 10;
    this.targetCameraDistance = 10;
    this.moleculeOpacity = 1;
    this.targetMoleculeOpacity = 1;
    this.switchInProgress = false;
    this.pendingMolecule = null;
    this.inertiaDamping = 0.92;
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.lastFrameTime = performance.now();
    this.animationId = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x10141e);

    const viewport = this.canvas.parentElement!;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, this.cameraDistance);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.cssRenderer = new CSS3DRenderer();
    this.cssRenderer.setSize(width, height);
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0';
    this.cssRenderer.domElement.style.left = '0';
    this.cssContainer.appendChild(this.cssRenderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(this.ambientLight);

    this.light1 = new THREE.PointLight(0xffffff, 2, 100);
    this.light1.position.set(10, 10, 10);
    this.scene.add(this.light1);

    this.light2 = new THREE.PointLight(0x00d4ff, 0.8, 100);
    this.light2.position.set(-10, -5, -8);
    this.scene.add(this.light2);

    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);

    window.addEventListener('resize', this.handleResize.bind(this));
    this.animate();
  }

  private handleResize(): void {
    const viewport = this.canvas.parentElement!;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
    this.cssRenderer.setSize(width, height);
  }

  private createAtomMesh(atom: AtomData): AtomMesh {
    const radius = ELEMENT_RADIUS[atom.element];
    const color = ELEMENT_COLORS[atom.element];

    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.2,
      roughness: 0.35,
      emissive: color,
      emissiveIntensity: atom.element === 'H' ? 0.35 : 0.12,
      transparent: true,
      opacity: this.moleculeOpacity
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...atom.position);
    mesh.userData = {
      type: 'atom',
      atomId: atom.id,
      element: atom.element,
      originalColor: color
    };
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh as unknown as AtomMesh;
  }

  private createBondMesh(bond: BondData, atom1Pos: THREE.Vector3, atom2Pos: THREE.Vector3): BondMesh {
    const direction = new THREE.Vector3().subVectors(atom2Pos, atom1Pos);
    const length = direction.length();
    const midpoint = new THREE.Vector3().addVectors(atom1Pos, atom2Pos).multiplyScalar(0.5);

    const offset = bond.order === 2 ? 0.14 : bond.order === 3 ? 0.16 : 0;
    const bondCount = bond.order;

    const visualGroup = new THREE.Group();
    visualGroup.position.copy(midpoint);

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize());
    visualGroup.quaternion.copy(quaternion);

    const perpendicular = new THREE.Vector3(1, 0, 0);
    if (Math.abs(direction.clone().normalize().dot(perpendicular)) > 0.9) {
      perpendicular.set(0, 1, 0);
    }
    const tangentLocal = new THREE.Vector3().crossVectors(direction.clone().normalize(), perpendicular).normalize();
    const tangentWorldToLocal = tangentLocal.clone().applyQuaternion(quaternion.clone().invert());

    for (let i = 0; i < bondCount; i++) {
      const parallelOffset = (i - (bondCount - 1) / 2) * offset;
      const geometry = new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, length, 16);
      const material = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.1,
        roughness: 0.6,
        emissive: 0x555555,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: this.moleculeOpacity
      });

      const segment = new THREE.Mesh(geometry, material);
      segment.position.copy(tangentWorldToLocal.clone().multiplyScalar(parallelOffset));
      visualGroup.add(segment);
    }

    const wrapperGeometry = new THREE.CylinderGeometry(BOND_RADIUS * 1.2, BOND_RADIUS * 1.2, length, 8);
    const wrapperMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false
    });
    const wrapperMesh = new THREE.Mesh(wrapperGeometry, wrapperMaterial);
    wrapperMesh.position.copy(midpoint);
    wrapperMesh.quaternion.copy(quaternion);
    wrapperMesh.renderOrder = 0;

    wrapperMesh.userData = {
      type: 'bond',
      bondId: bond.id,
      atom1: bond.atom1,
      atom2: bond.atom2
    };
    (wrapperMesh as any).visualGroup = visualGroup;

    return wrapperMesh as unknown as BondMesh;
  }

  public renderMolecule(data: MoleculeData): void {
    this.clearMolecule();

    data.atoms.forEach(atom => {
      this.atomDataMap.set(atom.id, atom);
      const mesh = this.createAtomMesh(atom);
      this.atomMap.set(atom.id, mesh);
      this.moleculeGroup.add(mesh);
    });

    data.bonds.forEach(bond => {
      this.bondDataMap.set(bond.id, bond);
      const a1 = this.atomDataMap.get(bond.atom1);
      const a2 = this.atomDataMap.get(bond.atom2);
      if (a1 && a2) {
        const p1 = new THREE.Vector3(...a1.position);
        const p2 = new THREE.Vector3(...a2.position);
        const mesh = this.createBondMesh(bond, p1, p2);
        this.bondMap.set(bond.id, mesh);
        this.moleculeGroup.add(mesh);
        if ((mesh as any).visualGroup) {
          this.moleculeGroup.add((mesh as any).visualGroup);
        }
      }
    });

    this.adjustCameraForMolecule();
  }

  private adjustCameraForMolecule(): void {
    const box = new THREE.Box3().setFromObject(this.moleculeGroup);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.8;

    this.targetCameraDistance = Math.max(distance, 4);
    this.cameraDistance = this.targetCameraDistance;
    this.camera.position.set(0, 0, this.cameraDistance);
  }

  public clearMolecule(): void {
    while (this.moleculeGroup.children.length > 0) {
      const child = this.moleculeGroup.children[0];
      this.moleculeGroup.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) {
        if (Array.isArray((child as any).material)) {
          (child as any).material.forEach((m: THREE.Material) => m.dispose());
        } else {
          (child as any).material.dispose();
        }
      }
    }
    this.atomMap.clear();
    this.bondMap.clear();
    this.atomDataMap.clear();
    this.bondDataMap.clear();
    this.removeSelectedRing();
  }

  public setAtomPosition(atomId: string, position: THREE.Vector3): void {
    const atomData = this.atomDataMap.get(atomId);
    const atomMesh = this.atomMap.get(atomId);
    if (!atomData || !atomMesh) return;

    atomData.position = [position.x, position.y, position.z];
    atomMesh.position.copy(position);
    this.updateBondsForAtom(atomId);
  }

  private updateBondsForAtom(atomId: string): void {
    this.bondDataMap.forEach((bondData, bondId) => {
      if (bondData.atom1 === atomId || bondData.atom2 === atomId) {
        this.regenerateBond(bondId);
      }
    });
  }

  private regenerateBond(bondId: string): void {
    const bondData = this.bondDataMap.get(bondId);
    const oldBondMesh = this.bondMap.get(bondId);
    if (!bondData || !oldBondMesh) return;

    const a1 = this.atomDataMap.get(bondData.atom1);
    const a2 = this.atomDataMap.get(bondData.atom2);
    if (!a1 || !a2) return;

    const p1 = new THREE.Vector3(...a1.position);
    const p2 = new THREE.Vector3(...a2.position);
    const direction = new THREE.Vector3().subVectors(p2, p1);
    const length = direction.length();
    const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

    oldBondMesh.position.copy(midpoint);
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize());
    oldBondMesh.quaternion.copy(quaternion);

    if ((oldBondMesh as any).visualGroup) {
      const visualGroup = (oldBondMesh as any).visualGroup as THREE.Group;
      visualGroup.position.copy(midpoint);
      visualGroup.quaternion.copy(quaternion);

      const offset = bondData.order === 2 ? 0.14 : bondData.order === 3 ? 0.16 : 0;
      const bondCount = bondData.order;

      const perpendicular = new THREE.Vector3(1, 0, 0);
      if (Math.abs(direction.clone().normalize().dot(perpendicular)) > 0.9) {
        perpendicular.set(0, 1, 0);
      }
      const tangentLocal = new THREE.Vector3().crossVectors(direction.clone().normalize(), perpendicular).normalize();
      const tangentWorldToLocal = tangentLocal.clone().applyQuaternion(quaternion.clone().invert());

      visualGroup.children.forEach((segment, i) => {
        const parallelOffset = (i - (bondCount - 1) / 2) * offset;
        const mesh = segment as THREE.Mesh;
        mesh.position.copy(tangentWorldToLocal.clone().multiplyScalar(parallelOffset));
        if (mesh.geometry instanceof THREE.CylinderGeometry) {
          mesh.geometry.dispose();
          mesh.geometry = new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, length, 16);
        }
      });
    }
  }

  public showSelectedRing(atomId: string): void {
    this.removeSelectedRing();
    const atomMesh = this.atomMap.get(atomId);
    if (!atomMesh) return;

    const element = atomMesh.userData.element;
    const radius = ELEMENT_RADIUS[element] * 1.6;

    const geometry = new THREE.RingGeometry(radius, radius + 0.08, 48);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    this.selectedRing = new THREE.Mesh(geometry, material);
    this.selectedRing.position.copy(atomMesh.position);
    this.moleculeGroup.add(this.selectedRing);
  }

  public removeSelectedRing(): void {
    if (this.selectedRing) {
      this.moleculeGroup.remove(this.selectedRing);
      this.selectedRing.geometry.dispose();
      (this.selectedRing.material as THREE.Material).dispose();
      this.selectedRing = null;
    }
  }

  public rotate(deltaX: number, deltaY: number): void {
    this.rotationTarget.y += deltaX * 0.008;
    this.rotationTarget.x += deltaY * 0.008;
    this.rotationVelocity.x = deltaY * 0.0008;
    this.rotationVelocity.y = deltaX * 0.0008;
  }

  public setRotationVelocity(vx: number, vy: number): void {
    this.rotationVelocity.x = vx;
    this.rotationVelocity.y = vy;
  }

  public zoom(delta: number): void {
    const zoomFactor = Math.exp(delta * 0.0015);
    this.targetCameraDistance = Math.max(3, Math.min(30, this.targetCameraDistance * zoomFactor));
  }

  public setZoom(distance: number): void {
    this.targetCameraDistance = Math.max(3, Math.min(30, distance));
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getCssScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public raycastAtoms(raycaster: THREE.Raycaster): THREE.Intersection[] {
    const atomMeshes = Array.from(this.atomMap.values());
    return raycaster.intersectObjects(atomMeshes, false);
  }

  public switchMoleculeSmooth(newData: MoleculeData): void {
    if (this.switchInProgress) {
      this.pendingMolecule = newData;
      return;
    }
    this.switchInProgress = true;
    this.targetMoleculeOpacity = 0;
    this.pendingMolecule = newData;
  }

  private animateSwitching(delta: number): void {
    if (!this.switchInProgress) return;

    this.moleculeOpacity += (this.targetMoleculeOpacity - this.moleculeOpacity) * Math.min(delta * 6, 1);

    this.atomMap.forEach(mesh => {
      (mesh.material as THREE.MeshStandardMaterial).opacity = this.moleculeOpacity;
    });
    this.bondMap.forEach(mesh => {
      if ((mesh as any).visualGroup) {
        ((mesh as any).visualGroup as THREE.Group).traverse(child => {
          if ((child as THREE.Mesh).material) {
            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            mat.opacity = this.moleculeOpacity;
          }
        });
      }
    });

    if (this.targetMoleculeOpacity === 0 && this.moleculeOpacity < 0.05) {
      if (this.pendingMolecule) {
        this.renderMolecule(this.pendingMolecule);
        this.pendingMolecule = null;
        this.targetMoleculeOpacity = 1;
      } else {
        this.targetMoleculeOpacity = 1;
      }
    }

    if (this.targetMoleculeOpacity === 1 && this.moleculeOpacity > 0.95) {
      this.moleculeOpacity = 1;
      this.switchInProgress = false;
      if (this.pendingMolecule) {
        const next = this.pendingMolecule;
        this.pendingMolecule = null;
        this.switchMoleculeSmooth(next);
      }
    }
  }

  public screenToWorld(screenX: number, screenY: number, planeZ: number): THREE.Vector3 {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;

    const vector = new THREE.Vector3(x, y, 0.5);
    vector.unproject(this.camera);

    const dir = vector.sub(this.camera.position).normalize();
    const distance = (planeZ - this.camera.position.z) / dir.z;

    return this.camera.position.clone().add(dir.multiplyScalar(distance));
  }

  public projectToScreen(position: THREE.Vector3): THREE.Vector2 {
    const projected = position.clone().project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(
      (projected.x * 0.5 + 0.5) * rect.width,
      (-projected.y * 0.5 + 0.5) * rect.height
    );
  }

  private animate(): void {
    const now = performance.now();
    const delta = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;

    this.frameCount++;
    if (now - this.lastFpsTime >= 500) {
      const fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsTime));
      this.fpsElement.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    this.rotationVelocity.x += (this.rotationTarget.x - this.currentRotation.x) * 0.15;
    this.rotationVelocity.y += (this.rotationTarget.y - this.currentRotation.y) * 0.15;

    this.rotationVelocity.x *= this.inertiaDamping;
    this.rotationVelocity.y *= this.inertiaDamping;

    this.currentRotation.x += this.rotationVelocity.x * delta * 60;
    this.currentRotation.y += this.rotationVelocity.y * delta * 60;

    this.currentRotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.currentRotation.x));

    this.moleculeGroup.rotation.x = this.currentRotation.x;
    this.moleculeGroup.rotation.y = this.currentRotation.y;

    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * Math.min(delta * 10, 1);
    this.camera.position.set(0, 0, this.cameraDistance);
    this.camera.lookAt(0, 0, 0);

    if (this.selectedRing) {
      this.selectedRing.quaternion.copy(this.camera.quaternion);
    }

    this.animateSwitching(delta);

    this.renderer.render(this.scene, this.camera);
    this.cssRenderer.render(this.scene, this.camera);

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.clearMolecule();
    this.renderer.dispose();
  }
}
