import { useState, useRef, useEffect } from 'react';
import { GameState } from './data/gameState';
import { EnemySpawner } from './data/enemySpawner';
import { GameCanvas } from './render/GameCanvas';
import { UIPanel } from './render/UIPanel';

function App() {
  const gameStateRef = useRef<GameState>(new GameState());
  const enemySpawnerRef = useRef<EnemySpawner | null>(null);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const gameState = gameStateRef.current;
    enemySpawnerRef.current = new EnemySpawner(gameState);

    const unsubscribe = gameState.subscribe(() => {
      forceUpdate(n => n + 1);
    });

    let animationId: number;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const playerState = gameState.getPlayerState();
      if (playerState.phase === 'battle' && enemySpawnerRef.current) {
        const wave = gameState.getCurrentWave();
        if (wave && wave.isActive && wave.spawnedCount < wave.totalEnemies) {
          enemySpawnerRef.current.update();
        }
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      unsubscribe();
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleSelectPlanet = (id: string | null) => {
    setSelectedPlanetId(id);
  };

  const handleClosePanel = () => {
    setSelectedPlanetId(null);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <GameCanvas
        gameState={gameStateRef.current}
        selectedPlanetId={selectedPlanetId}
        onSelectPlanet={handleSelectPlanet}
      />
      <UIPanel
        gameState={gameStateRef.current}
        selectedPlanetId={selectedPlanetId}
        onClosePanel={handleClosePanel}
      />
    </div>
  );
}

export default App;
