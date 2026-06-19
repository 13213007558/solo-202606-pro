import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from '../data/gameState';
import { Planet, Tower, Enemy, TowerType, Vector3 } from '../data/types';
import { AnimationController } from './animationController';

interface GameCanvasProps {
  gameState: GameState;
  selectedPlanetId: string | null;
  onSelectPlanet: (id: string | null) => void;
}

function PlanetMesh({
  planet,
  isSelected,
  onClick
}: {
  planet: Planet;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
    if (glowRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    gradient.addColorStop(0, planet.color);
    gradient.addColorStop(0.5, planet.color + 'aa');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random() * 10 + 2;
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, [planet.color]);

  return (
    <group position={[planet.position.x, planet.position.y, planet.position.z]}>
      <mesh
        ref={glowRef}
        scale={planet.radius * 1.5}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={planet.glowColor}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh
        ref={meshRef}
        scale={planet.radius}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          emissive={planet.glowColor}
          emissiveIntensity={0.2}
        />
      </mesh>

      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -planet.radius - 0.1, 0]}>
          <ringGeometry args={[planet.radius * 1.2, planet.radius * 1.4, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {planet.health < planet.maxHealth && (
        <group position={[0, planet.radius + 0.5, 0]}>
          <mesh>
            <planeGeometry args={[2, 0.15]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
          <mesh position={[-(1 - planet.health / planet.maxHealth), 0, 0.01]}>
            <planeGeometry args={[2 * (planet.health / planet.maxHealth), 0.15]} />
            <meshBasicMaterial color={planet.health / planet.maxHealth > 0.5 ? '#22c55e' : planet.health / planet.maxHealth > 0.25 ? '#eab308' : '#ef4444'} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function TowerMesh({ tower, level }: { tower: Tower; level: number }) {
  const meshRef = useRef<THREE.Group>(null);
  const colors: Record<TowerType, string> = {
    laser: '#ff6b35',
    missile: '#4ecdc4',
    emp: '#a855f7'
  };

  const color = colors[tower.type];
  const scale = 1 + (level - 1) * 0.2;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={meshRef} position={[tower.position.x, tower.position.y, tower.position.z]} scale={scale}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 0.6, 8]} />
        <meshStandardMaterial color="#333355" metalness={0.5} roughness={0.5} />
      </mesh>

      {tower.type === 'laser' && (
        <mesh position={[0, 0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.15, 0.5, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      )}

      {tower.type === 'missile' && (
        <>
          <mesh position={[0, 0.7, 0.1]}>
            <boxGeometry args={[0.15, 0.4, 0.15]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 0.7, -0.1]}>
            <boxGeometry args={[0.15, 0.4, 0.15]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
          </mesh>
        </>
      )}

      {tower.type === 'emp' && (
        <mesh position={[0, 0.8, 0]}>
          <octahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} wireframe={level >= 3} />
        </mesh>
      )}

      {level >= 3 && (
        <pointLight color={color} intensity={0.5} distance={3} />
      )}
    </group>
  );
}

function EnemyMesh({ enemy }: { enemy: Enemy }) {
  const meshRef = useRef<THREE.Group>(null);
  const colors: Record<string, string> = {
    scout: '#22c55e',
    fighter: '#eab308',
    cruiser: '#ef4444',
    boss: '#8b5cf6'
  };

  const sizes: Record<string, number> = {
    scout: 0.4,
    fighter: 0.6,
    cruiser: 1.0,
    boss: 1.8
  };

  const color = colors[enemy.type] || '#ffffff';
  const size = sizes[enemy.type] || 0.5;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = enemy.position.y + Math.sin(state.clock.elapsedTime * 3 + enemy.position.x) * 0.1;
    }
  });

  return (
    <group ref={meshRef} position={[enemy.position.x, enemy.position.y, enemy.position.z]} scale={size}>
      <mesh>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <mesh scale={0.5}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      <group position={[0, 1.5, 0]} scale={1 / size}>
        <mesh>
          <planeGeometry args={[1.5, 0.12]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
        <mesh position={[-(0.75 - 0.75 * (enemy.health / enemy.maxHealth)), 0, 0.01]}>
          <planeGeometry args={[1.5 * (enemy.health / enemy.maxHealth), 0.12]} />
          <meshBasicMaterial color={enemy.health / enemy.maxHealth > 0.5 ? '#22c55e' : enemy.health / enemy.maxHealth > 0.25 ? '#eab308' : '#ef4444'} />
        </mesh>
      </group>
    </group>
  );
}

function Connections({ planets }: { planets: Planet[] }) {
  const lines = useMemo(() => {
    const lines: { start: Vector3; end: Vector3 }[] = [];
    const processed = new Set<string>();

    planets.forEach(planet => {
      planet.connections.forEach(connId => {
        const key = [planet.id, connId].sort().join('-');
        if (!processed.has(key)) {
          processed.add(key);
          const target = planets.find(p => p.id === connId);
          if (target) {
            lines.push({
              start: planet.position,
              end: target.position
            });
          }
        }
      });
    });

    return lines;
  }, [planets]);

  return (
    <group>
      {lines.map((line, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                line.start.x, line.start.y, line.start.z,
                line.end.x, line.end.y, line.end.z
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4a5568" transparent opacity={0.4} />
        </line>
      ))}
    </group>
  );
}

function SceneContent({ gameState, selectedPlanetId, onSelectPlanet }: GameCanvasProps) {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const animationControllerRef = useRef<AnimationController | null>(null);
  const { scene } = useThree();
  const lastFiredTowers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    animationControllerRef.current = new AnimationController(scene);
    return () => {
      if (animationControllerRef.current) {
        animationControllerRef.current.dispose();
      }
    };
  }, [scene]);

  useEffect(() => {
    const updateState = () => {
      setPlanets(gameState.getPlanets());
      setEnemies(gameState.getEnemies());
    };

    updateState();
    return gameState.subscribe(updateState);
  }, [gameState]);

  useFrame((state, delta) => {
    const playerState = gameState.getPlayerState();
    if (playerState.phase === 'battle') {
      gameState.update(delta);

      if (animationControllerRef.current) {
        animationControllerRef.current.update(delta);
      }

      const currentTime = state.clock.elapsedTime;
      const allTowers: Tower[] = [];
      planets.forEach(p => allTowers.push(...p.towers));

      allTowers.forEach(tower => {
        const lastFired = lastFiredTowers.current.get(tower.id) || 0;
        if (currentTime - lastFired >= tower.fireRate) {
          let nearestEnemy: Enemy | null = null;
          let nearestDist = Infinity;

          for (const enemy of enemies) {
            const dist = Math.sqrt(
              Math.pow(tower.position.x - enemy.position.x, 2) +
              Math.pow(tower.position.y - enemy.position.y, 2) +
              Math.pow(tower.position.z - enemy.position.z, 2)
            );
            if (dist <= tower.range && dist < nearestDist) {
              nearestDist = dist;
              nearestEnemy = enemy;
            }
          }

          if (nearestEnemy && animationControllerRef.current) {
            animationControllerRef.current.spawnProjectile(
              tower.type,
              tower.position,
              nearestEnemy.position,
              tower.damage,
              tower.type === 'laser' ? 50 : tower.type === 'missile' ? 25 : 35
            );
            lastFiredTowers.current.set(tower.id, currentTime);
          }
        }
      });
    }
  });

  const handleBackgroundClick = () => {
    onSelectPlanet(null);
  };

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4a5568" />

      <Stars radius={300} depth={60} count={5000} factor={7} saturation={0} fade speed={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, 0]} onClick={handleBackgroundClick}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="transparent" transparent opacity={0} />
      </mesh>

      <Connections planets={planets} />

      {planets.map(planet => (
        <PlanetMesh
          key={planet.id}
          planet={planet}
          isSelected={planet.id === selectedPlanetId}
          onClick={() => onSelectPlanet(planet.id)}
        />
      ))}

      {planets.map(planet =>
        planet.towers.map(tower => (
          <TowerMesh key={tower.id} tower={tower} level={tower.level} />
        ))
      )}

      {enemies.map(enemy => (
        <EnemyMesh key={enemy.id} enemy={enemy} />
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={false}
        minDistance={10}
        maxDistance={80}
        target={[5, 0, 0]}
      />
    </>
  );
}

export function GameCanvas({ gameState, selectedPlanetId, onSelectPlanet }: GameCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 25, 35], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)' }}
    >
      <fog attach="fog" args={['#0a0a1a', 50, 150]} />
      <SceneContent
        gameState={gameState}
        selectedPlanetId={selectedPlanetId}
        onSelectPlanet={onSelectPlanet}
      />
    </Canvas>
  );
}
