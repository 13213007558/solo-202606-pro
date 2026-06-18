import { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import * as THREE from 'three'
import { GameState } from '../data/gameState'
import { GameStateSnapshot, Planet, Tower, Enemy, Vector3, TowerType, EnemyType, TOWER_STATS } from '../data/types'
import { AnimationManager, getTowerColor, getTowerEmissive } from './animationController'

interface GameCanvasProps {
  gameState: GameState
}

function PlanetNode({
  planet,
  isSelected,
  onClick,
}: {
  planet: Planet
  isSelected: boolean
  onClick: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.1
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(t * 2) * 0.05
      glowRef.current.scale.setScalar(scale * 1.3)
    }
    if (ringRef.current && planet.techBonusActive) {
      ringRef.current.rotation.z = t
      ringRef.current.visible = true
    } else if (ringRef.current) {
      ringRef.current.visible = false
    }
  })

  const hpPercent = planet.currentHp / planet.maxHp

  return (
    <group position={[planet.position.x, planet.position.y, planet.position.z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
      >
        <sphereGeometry args={[planet.size, 32, 32]} />
        <meshStandardMaterial
          color={planet.color}
          emissive={planet.glowColor}
          emissiveIntensity={0.3}
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>

      <mesh ref={glowRef}>
        <sphereGeometry args={[planet.size, 32, 32]} />
        <meshBasicMaterial
          color={planet.glowColor}
          transparent
          opacity={0.25}
          side={THREE.BackSide}
        />
      </mesh>

      {planet.techBonusActive && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[planet.size * 1.6, planet.size * 1.8, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[planet.size * 1.4, planet.size * 1.5, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {hpPercent < 1 && (
        <Html position={[0, planet.size + 1.5, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            width: planet.size * 12,
            height: 6,
            background: 'rgba(0,0,0,0.6)',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <div style={{
              width: `${hpPercent * 100}%`,
              height: '100%',
              background: hpPercent > 0.5 ? '#4caf50' : hpPercent > 0.25 ? '#ff9800' : '#f44336',
              transition: 'width 0.3s',
            }} />
          </div>
        </Html>
      )}

      <Html position={[0, -planet.size - 1.2, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 'bold',
          textShadow: '0 0 8px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
          background: 'rgba(0,0,0,0.4)',
          padding: '2px 8px',
          borderRadius: 4,
        }}>
          {planet.name}
        </div>
      </Html>
    </group>
  )
}

function TowerNode({ tower, planet }: { tower: Tower; planet: Planet }) {
  const groupRef = useRef<THREE.Group>(null)
  const barrelRef = useRef<THREE.Mesh>(null)
  const color = getTowerColor(tower.type, tower.level)
  const emissive = getTowerEmissive(tower.type, tower.level)
  const baseHeight = tower.type === 'missile' ? 0.5 : tower.type === 'electromagnetic' ? 0.7 : 0.4
  const baseScale = 0.4 + tower.level * 0.1

  useFrame(() => {
    if (barrelRef.current) {
      barrelRef.current.rotation.y = tower.rotation
    }
  })

  const getBarrelShape = () => {
    if (tower.type === 'laser') {
      return <cylinderGeometry args={[0.08 * baseScale, 0.1 * baseScale, 1.0 * baseScale, 8]} />
    } else if (tower.type === 'missile') {
      return <boxGeometry args={[0.3 * baseScale, 0.3 * baseScale, 0.9 * baseScale]} />
    } else {
      return <torusGeometry args={[0.25 * baseScale, 0.08 * baseScale, 8, 16]} />
    }
  }

  return (
    <group position={[tower.position.x, tower.position.y, tower.position.z]} ref={groupRef}>
      <mesh position={[0, baseHeight / 2, 0]}>
        <cylinderGeometry args={[0.35 * baseScale, 0.45 * baseScale, baseHeight, 12]} />
        <meshStandardMaterial color="#333344" metalness={0.8} roughness={0.3} />
      </mesh>

      <mesh position={[0, baseHeight + 0.1, 0]}>
        <cylinderGeometry args={[0.3 * baseScale, 0.35 * baseScale, 0.2, 12]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.5} metalness={0.6} roughness={0.4} />
      </mesh>

      <mesh ref={barrelRef} position={[0, baseHeight + 0.3, 0.4 * baseScale]} rotation={[-Math.PI / 2, tower.rotation, 0]}>
        {getBarrelShape()}
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.6} metalness={0.7} roughness={0.3} />
      </mesh>

      {tower.level >= 3 && (
        <pointLight color={emissive} intensity={0.5} distance={5} />
      )}
    </group>
  )
}

function EnemyNode({ enemy }: { enemy: Enemy }) {
  const groupRef = useRef<THREE.Group>(null)
  const size = enemy.type === 'mothership' ? 1.8 : enemy.type === 'cruiser' ? 1.2 : enemy.type === 'fighter' ? 0.8 : 0.5
  const color = enemy.type === 'mothership' ? '#8b0000' : enemy.type === 'cruiser' ? '#b22222' : enemy.type === 'fighter' ? '#dc143c' : '#ff6347'
  const hpPercent = enemy.currentHp / enemy.maxHp

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.5
      groupRef.current.position.y = enemy.position.y + Math.sin(clock.getElapsedTime() * 3) * 0.1
    }
  })

  return (
    <group ref={groupRef} position={[enemy.position.x, enemy.position.y, enemy.position.z]}>
      <mesh>
        {enemy.type === 'mothership' ? (
          <dodecahedronGeometry args={[size, 0]} />
        ) : enemy.type === 'cruiser' ? (
          <octahedronGeometry args={[size, 0]} />
        ) : enemy.type === 'fighter' ? (
          <tetrahedronGeometry args={[size, 0]} />
        ) : (
          <sphereGeometry args={[size, 12, 12]} />
        )}
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} metalness={0.5} roughness={0.5} />
      </mesh>

      <pointLight color="#ff0000" intensity={0.3} distance={3} />

      <Html position={[0, size + 0.8, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          width: size * 25,
          height: 4,
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${hpPercent * 100}%`,
            height: '100%',
            background: '#ff4444',
          }} />
        </div>
      </Html>
    </group>
  )
}

function ConnectionLines({ planets }: { planets: Planet[] }) {
  const lines = useMemo(() => {
    const result: { from: Vector3; to: Vector3 }[] = []
    const seen = new Set<string>()
    planets.forEach(p => {
      p.connections.forEach(cid => {
        const key = [p.id, cid].sort().join('-')
        if (seen.has(key)) return
        seen.add(key)
        const target = planets.find(pp => pp.id === cid)
        if (target) {
          result.push({ from: p.position, to: target.position })
        }
      })
    })
    return result
  }, [planets])

  return (
    <group>
      {lines.map((line, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([
                line.from.x, line.from.y, line.from.z,
                line.to.x, line.to.y, line.to.z,
              ])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4a6fa5" transparent opacity={0.4} />
        </line>
      ))}
    </group>
  )
}

function NebulaBackground() {
  const tex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
    gradient.addColorStop(0, 'rgba(80, 40, 160, 0.3)')
    gradient.addColorStop(0.5, 'rgba(40, 20, 100, 0.2)')
    gradient.addColorStop(1, 'rgba(10, 5, 40, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)
    const t = new THREE.CanvasTexture(canvas)
    return t
  }, [])

  return (
    <mesh>
      <sphereGeometry args={[500, 32, 32]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} transparent opacity={0.5} />
    </mesh>
  )
}

function GameScene({ gameState }: { gameState: GameState }) {
  const [snapshot, setSnapshot] = useState<GameStateSnapshot | null>(null)
  const animRef = useRef<AnimationManager | null>(null)
  const { scene } = useThree()

  useEffect(() => {
    const unsubscribe = gameState.subscribe((snap) => {
      setSnapshot(snap)
    })
    return unsubscribe
  }, [gameState])

  useEffect(() => {
    animRef.current = new AnimationManager(scene)
    return () => {
      animRef.current?.dispose()
    }
  }, [scene])

  const prevTime = useRef(performance.now())

  useFrame(() => {
    const now = performance.now()
    const dt = (now - prevTime.current) / 1000
    prevTime.current = now
    gameState.update(dt)

    if (snapshot && animRef.current) {
      animRef.current.updateProjectiles(snapshot.projectiles)
      animRef.current.updateExplosions(snapshot.explosions)
      animRef.current.updateLasers(snapshot.projectiles)
    }
  })

  if (!snapshot) return null

  const handlePlanetClick = (planetId: string) => {
    const current = snapshot.player.selectedPlanetId
    gameState.selectPlanet(current === planetId ? null : planetId)
  }

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[50, 50, 50]} intensity={0.6} />
      <pointLight position={[0, 0, 0]} intensity={0.4} color="#6644ff" distance={100} />

      <NebulaBackground />
      <Stars radius={300} depth={60} count={5000} factor={4} saturation={0} fade speed={0.5} />

      <ConnectionLines planets={snapshot.planets} />

      {snapshot.planets.map(planet => (
        <PlanetNode
          key={planet.id}
          planet={planet}
          isSelected={snapshot.player.selectedPlanetId === planet.id}
          onClick={() => handlePlanetClick(planet.id)}
        />
      ))}

      {snapshot.planets.flatMap(p =>
        p.towers.map(t => <TowerNode key={t.id} tower={t} planet={p} />)
      )}

      {snapshot.enemies.map(e => (
        <EnemyNode key={e.id} enemy={e} />
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={20}
        maxDistance={120}
        autoRotate={false}
      />
    </>
  )
}

function GameCanvas({ gameState }: GameCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 30, 70], fov: 55, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(180deg, #0a0520 0%, #1a0a3a 50%, #0d0820 100%)' }}
    >
      <fog attach="fog" args={['#0a0520', 80, 180]} />
      <GameScene gameState={gameState} />
    </Canvas>
  )
}

export default GameCanvas
