import * as THREE from 'three';
import { Vector3, TowerType } from '../data/types';

interface PooledProjectile {
  mesh: THREE.Mesh;
  trail: THREE.Line;
  active: boolean;
  type: TowerType;
  targetPosition: THREE.Vector3;
  damage: number;
  speed: number;
  trailPoints: THREE.Vector3[];
}

interface PooledExplosion {
  mesh: THREE.Mesh;
  active: boolean;
  life: number;
  maxLife: number;
  maxRadius: number;
}

export class AnimationController {
  private scene: THREE.Scene;
  private projectilePool: PooledProjectile[] = [];
  private explosionPool: PooledExplosion[] = [];
  private activeProjectiles: PooledProjectile[] = [];
  private activeExplosions: PooledExplosion[] = [];
  private maxProjectiles = 100;
  private maxExplosions = 50;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializePools();
  }

  private initializePools(): void {
    for (let i = 0; i < this.maxProjectiles; i++) {
      const projectile = this.createProjectile('laser');
      projectile.mesh.visible = false;
      projectile.trail.visible = false;
      this.projectilePool.push(projectile);
    }

    for (let i = 0; i < this.maxExplosions; i++) {
      const explosion = this.createExplosion();
      explosion.mesh.visible = false;
      this.explosionPool.push(explosion);
    }
  }

  private createProjectile(type: TowerType): PooledProjectile {
    const colors: Record<TowerType, number> = {
      laser: 0xff4500,
      missile: 0x00ffff,
      emp: 0xbf00ff
    };

    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: colors[type],
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);

    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({
      color: colors[type],
      transparent: true,
      opacity: 0.6
    });
    const trail = new THREE.Line(trailGeometry, trailMaterial);

    this.scene.add(mesh);
    this.scene.add(trail);

    return {
      mesh,
      trail,
      active: false,
      type,
      targetPosition: new THREE.Vector3(),
      damage: 0,
      speed: 30,
      trailPoints: []
    };
  }

  private createExplosion(): PooledExplosion {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);

    this.scene.add(mesh);

    return {
      mesh,
      active: false,
      life: 0,
      maxLife: 0.5,
      maxRadius: 2
    };
  }

  spawnProjectile(
    type: TowerType,
    startPos: Vector3,
    targetPos: Vector3,
    damage: number,
    speed: number = 30
  ): PooledProjectile | null {
    const projectile = this.projectilePool.find(p => !p.active);
    if (!projectile) return null;

    const colors: Record<TowerType, number> = {
      laser: 0xff4500,
      missile: 0x00ffff,
      emp: 0xbf00ff
    };

    projectile.active = true;
    projectile.type = type;
    projectile.damage = damage;
    projectile.speed = speed;
    projectile.targetPosition.set(targetPos.x, targetPos.y, targetPos.z);

    (projectile.mesh.material as THREE.MeshBasicMaterial).color.setHex(colors[type]);
    (projectile.trail.material as THREE.LineBasicMaterial).color.setHex(colors[type]);

    projectile.mesh.position.set(startPos.x, startPos.y, startPos.z);
    projectile.mesh.visible = true;

    projectile.trailPoints = [
      new THREE.Vector3(startPos.x, startPos.y, startPos.z),
      new THREE.Vector3(startPos.x, startPos.y, startPos.z)
    ];

    const positions = new Float32Array(projectile.trailPoints.length * 3);
    projectile.trailPoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    projectile.trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    projectile.trail.visible = true;

    this.activeProjectiles.push(projectile);

    return projectile;
  }

  spawnExplosion(position: Vector3, maxRadius: number = 2, color: number = 0xff6600): PooledExplosion | null {
    const explosion = this.explosionPool.find(e => !e.active);
    if (!explosion) return null;

    explosion.active = true;
    explosion.life = 0;
    explosion.maxLife = 0.5;
    explosion.maxRadius = maxRadius;

    (explosion.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    (explosion.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8;

    explosion.mesh.position.set(position.x, position.y, position.z);
    explosion.mesh.scale.setScalar(0.1);
    explosion.mesh.visible = true;

    this.activeExplosions.push(explosion);

    return explosion;
  }

  update(deltaTime: number): void {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.activeProjectiles[i];
      if (!projectile.active) continue;

      const direction = new THREE.Vector3()
        .subVectors(projectile.targetPosition, projectile.mesh.position)
        .normalize();

      const moveDistance = projectile.speed * deltaTime;
      const distToTarget = projectile.mesh.position.distanceTo(projectile.targetPosition);

      if (distToTarget <= moveDistance) {
        projectile.mesh.position.copy(projectile.targetPosition);
        this.deactivateProjectile(projectile);
        this.activeProjectiles.splice(i, 1);
        this.spawnExplosion(
          { x: projectile.targetPosition.x, y: projectile.targetPosition.y, z: projectile.targetPosition.z },
          1.5,
          projectile.type === 'laser' ? 0xff4500 : projectile.type === 'missile' ? 0x00ffff : 0xbf00ff
        );
      } else {
        projectile.mesh.position.add(direction.multiplyScalar(moveDistance));

        projectile.trailPoints[0].copy(projectile.trailPoints[1]);
        projectile.trailPoints[1].copy(projectile.mesh.position);

        const positions = new Float32Array(projectile.trailPoints.length * 3);
        projectile.trailPoints.forEach((p, idx) => {
          positions[idx * 3] = p.x;
          positions[idx * 3 + 1] = p.y;
          positions[idx * 3 + 2] = p.z;
        });
        projectile.trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      }
    }

    for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
      const explosion = this.activeExplosions[i];
      if (!explosion.active) continue;

      explosion.life += deltaTime;
      const progress = explosion.life / explosion.maxLife;

      if (progress >= 1) {
        this.deactivateExplosion(explosion);
        this.activeExplosions.splice(i, 1);
      } else {
        const scale = 0.1 + explosion.maxRadius * progress;
        explosion.mesh.scale.setScalar(scale);
        (explosion.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - progress);
      }
    }
  }

  private deactivateProjectile(projectile: PooledProjectile): void {
    projectile.active = false;
    projectile.mesh.visible = false;
    projectile.trail.visible = false;
  }

  private deactivateExplosion(explosion: PooledExplosion): void {
    explosion.active = false;
    explosion.mesh.visible = false;
  }

  getActiveProjectileCount(): number {
    return this.activeProjectiles.length;
  }

  getActiveExplosionCount(): number {
    return this.activeExplosions.length;
  }

  clearAll(): void {
    this.activeProjectiles.forEach(p => this.deactivateProjectile(p));
    this.activeExplosions.forEach(e => this.deactivateExplosion(e));
    this.activeProjectiles = [];
    this.activeExplosions = [];
  }

  dispose(): void {
    this.projectilePool.forEach(p => {
      this.scene.remove(p.mesh);
      this.scene.remove(p.trail);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      p.trail.geometry.dispose();
      (p.trail.material as THREE.Material).dispose();
    });

    this.explosionPool.forEach(e => {
      this.scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      (e.mesh.material as THREE.Material).dispose();
    });

    this.projectilePool = [];
    this.explosionPool = [];
    this.activeProjectiles = [];
    this.activeExplosions = [];
  }
}
