import { useState, useEffect } from 'react';
import { GameState } from '../data/gameState';
import { Planet, TowerType, Tower, TechNode, PlayerState, Wave } from '../data/types';

interface UIPanelProps {
  gameState: GameState;
  selectedPlanetId: string | null;
  onClosePanel: () => void;
}

const towerTypeNames: Record<TowerType, string> = {
  laser: '激光塔',
  missile: '导弹塔',
  emp: '电磁炮'
};

const towerTypeColors: Record<TowerType, string> = {
  laser: '#ff6b35',
  missile: '#4ecdc4',
  emp: '#a855f7'
};

const planetTypeNames: Record<string, string> = {
  mineral: '矿产星',
  energy: '能源星',
  military: '军事星'
};

function StatusBar({ playerState, currentWave }: { playerState: PlayerState; currentWave: Wave | undefined }) {
  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      zIndex: 100
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: 12,
        padding: '12px 20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white',
        minWidth: 200
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>当前波次</span>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: '#fbbf24' }}>
            {playerState.currentWave + 1} / {currentWave ? '9' : '0'}
          </span>
        </div>
        {currentWave && (
          <div style={{ fontSize: 13, color: '#cbd5e1' }}>{currentWave.name}</div>
        )}
        <div style={{
          marginTop: 8,
          height: 4,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #fbbf24, #f97316)',
            width: currentWave ? `${(currentWave.killedCount / currentWave.totalEnemies) * 100}%` : '0%',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: 12,
        padding: '12px 20px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white',
        display: 'flex',
        gap: 20
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>金币</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#fbbf24' }}>
            💰 {Math.floor(playerState.gold)}
          </div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>能量</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#3b82f6' }}>
            ⚡ {Math.floor(playerState.energy)}
          </div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>得分</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#22c55e' }}>
            🏆 {playerState.score}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeedControl({ speed, onChange }: { speed: number; onChange: (s: number) => void }) {
  const speeds = [1, 2];

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      right: 20,
      zIndex: 100,
      display: 'flex',
      gap: 8,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(10px)',
      borderRadius: 12,
      padding: 8,
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      {speeds.map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 'bold',
            background: speed === s ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            transition: 'all 0.2s ease',
            transform: speed === s ? 'translateY(-2px)' : 'none',
            boxShadow: speed === s ? '0 4px 15px rgba(139, 92, 246, 0.4)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (speed !== s) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (speed !== s) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }
          }}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}

function TowerPanel({
  planet,
  gameState,
  onBuild,
  onUpgrade
}: {
  planet: Planet;
  gameState: GameState;
  onBuild: (type: TowerType) => void;
  onUpgrade: (towerId: string) => void;
}) {
  const towerTypes: TowerType[] = ['laser', 'missile', 'emp'];

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      right: 20,
      transform: 'translateY(-50%)',
      width: 320,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(15px)',
      borderRadius: 16,
      padding: 20,
      border: '1px solid rgba(255, 255, 255, 0.15)',
      color: 'white',
      zIndex: 100,
      animation: 'slideIn 0.3s ease'
    }}>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-50%) translateX(20px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          50% { box-shadow: 0 0 20px 5px rgba(255,255,255,0.2); }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>{planet.name}</h3>
        <span style={{
          padding: '4px 10px',
          borderRadius: 20,
          fontSize: 12,
          background: planet.color + '30',
          color: planet.color
        }}>
          {planetTypeNames[planet.type]}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: 12, color: '#94a3b8' }}>
        <div>❤️ 血量: {Math.floor(planet.health)}/{planet.maxHealth}</div>
        <div>💰 +{planet.goldPerSecond}/s</div>
        <div>⚡ +{planet.energyPerSecond}/s</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
          防御塔 ({planet.towers.length}/{planet.towerSlots})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {planet.towers.map(tower => {
            const config = gameState.getTowerConfig(tower.type);
            const canUpgrade = gameState.canUpgradeTower(tower.id);
            const upgradeCost = tower.level < 3 ? config.upgradeCost[tower.level - 1] : 0;

            return (
              <div key={tower.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 10,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${towerTypeColors[tower.type]}40`
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: towerTypeColors[tower.type] }}>
                    {towerTypeNames[tower.type]} Lv.{tower.level}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    伤害: {Math.floor(tower.damage)} | 射程: {tower.range.toFixed(1)}
                  </div>
                </div>
                {tower.level < 3 && (
                  <button
                    onClick={() => onUpgrade(tower.id)}
                    disabled={!canUpgrade}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: canUpgrade ? 'pointer' : 'not-allowed',
                      fontSize: 12,
                      fontWeight: 'bold',
                      background: canUpgrade ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      opacity: canUpgrade ? 1 : 0.5,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    升级 💰{upgradeCost}
                  </button>
                )}
                {tower.level >= 3 && (
                  <span style={{ fontSize: 11, color: '#fbbf24' }}>⭐ 满级</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {planet.towers.length < planet.towerSlots && (
        <div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>建造防御塔</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {towerTypes.map(type => {
              const config = gameState.getTowerConfig(type);
              const canBuild = gameState.canBuildTower(planet.id, type);

              return (
                <button
                  key={type}
                  onClick={() => onBuild(type)}
                  disabled={!canBuild}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 8,
                    border: `1px solid ${towerTypeColors[type]}60`,
                    cursor: canBuild ? 'pointer' : 'not-allowed',
                    background: canBuild ? `${towerTypeColors[type]}20` : 'rgba(255,255,255,0.05)',
                    color: canBuild ? towerTypeColors[type] : '#64748b',
                    fontSize: 12,
                    fontWeight: 'bold',
                    opacity: canBuild ? 1 : 0.5,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (canBuild) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 4px 15px ${towerTypeColors[type]}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ marginBottom: 4 }}>{towerTypeNames[type]}</div>
                  <div style={{ fontSize: 10 }}>💰{config.baseCost} ⚡20</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TechTreePanel({
  isOpen,
  onClose,
  techTree,
  onUnlock,
  gold
}: {
  isOpen: boolean;
  onClose: () => void;
  techTree: TechNode[];
  onUnlock: (id: string) => void;
  gold: number;
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      animation: 'fadeIn 0.3s ease'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{
        width: 600,
        maxHeight: '80vh',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 20,
        padding: 24,
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: 'white',
        animation: 'scaleIn 0.3s ease',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>🔬 科技树</h2>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
          >
            ×
          </button>
        </div>

        <div style={{ position: 'relative', height: 320 }}>
          {techTree.map(tech => {
            const canUnlock = !tech.unlocked &&
              tech.requires.every(reqId => techTree.find(t => t.id === reqId)?.unlocked) &&
              gold >= tech.cost;

            return (
              <div
                key={tech.id}
                onClick={() => canUnlock && onUnlock(tech.id)}
                style={{
                  position: 'absolute',
                  left: tech.position.x,
                  top: tech.position.y,
                  width: 100,
                  padding: 10,
                  borderRadius: 12,
                  background: tech.unlocked
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2))'
                    : canUnlock
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(99, 102, 241, 0.2))'
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${tech.unlocked ? '#22c55e' : canUnlock ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`,
                  cursor: canUnlock ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  transform: canUnlock ? 'scale(1)' : 'scale(0.95)',
                  opacity: tech.unlocked ? 1 : canUnlock ? 1 : 0.5
                }}
                onMouseEnter={(e) => {
                  if (canUnlock) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = canUnlock ? 'scale(1)' : 'scale(0.95)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: 24, textAlign: 'center', marginBottom: 6 }}>{tech.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
                  {tech.name}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginBottom: 6 }}>
                  {tech.description}
                </div>
                {!tech.unlocked && (
                  <div style={{
                    fontSize: 11,
                    textAlign: 'center',
                    color: canUnlock ? '#fbbf24' : '#64748b'
                  }}>
                    💰 {tech.cost}
                  </div>
                )}
                {tech.unlocked && (
                  <div style={{ fontSize: 11, textAlign: 'center', color: '#22c55e' }}>
                    ✅ 已解锁
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GameOverPanel({
  isVictory,
  score,
  onRestart
}: {
  isVictory: boolean;
  score: number;
  onRestart: () => void;
}) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
      animation: 'fadeIn 0.5s ease'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      <div style={{
        textAlign: 'center',
        color: 'white',
        animation: 'bounce 0.5s ease'
      }}>
        <div style={{ fontSize: 80, marginBottom: 20 }}>
          {isVictory ? '🎉' : '💥'}
        </div>
        <h1 style={{
          fontSize: 48,
          margin: 0,
          marginBottom: 10,
          background: isVictory
            ? 'linear-gradient(135deg, #fbbf24, #f97316)'
            : 'linear-gradient(135deg, #ef4444, #dc2626)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {isVictory ? '胜利！' : '失败'}
        </h1>
        <p style={{ fontSize: 18, color: '#94a3b8', marginBottom: 30 }}>
          {isVictory ? '恭喜你成功守护了星海！' : '终点星球已被摧毁...'}
        </p>
        <div style={{ fontSize: 24, marginBottom: 30, color: '#fbbf24' }}>
          最终得分: {score}
        </div>
        <button
          onClick={onRestart}
          style={{
            padding: '16px 48px',
            fontSize: 18,
            fontWeight: 'bold',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(139, 92, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.4)';
          }}
        >
          重新开始
        </button>
      </div>
    </div>
  );
}

export function UIPanel({ gameState, selectedPlanetId, onClosePanel }: UIPanelProps) {
  const [playerState, setPlayerState] = useState(gameState.getPlayerState());
  const [planets, setPlanets] = useState<Planet[]>(gameState.getPlanets());
  const [techTree, setTechTree] = useState<TechNode[]>(gameState.getTechTree());
  const [currentWave, setCurrentWave] = useState<Wave | undefined>(gameState.getCurrentWave());
  const [showTechTree, setShowTechTree] = useState(false);

  useEffect(() => {
    const updateState = () => {
      setPlayerState(gameState.getPlayerState());
      setPlanets(gameState.getPlanets());
      setTechTree(gameState.getTechTree());
      setCurrentWave(gameState.getCurrentWave());
    };

    return gameState.subscribe(updateState);
  }, [gameState]);

  const selectedPlanet = planets.find(p => p.id === selectedPlanetId);

  const handleBuildTower = (type: TowerType) => {
    if (selectedPlanetId) {
      gameState.buildTower(selectedPlanetId, type);
    }
  };

  const handleUpgradeTower = (towerId: string) => {
    gameState.upgradeTower(towerId);
  };

  const handleStartWave = () => {
    gameState.startWave();
  };

  const handleSpeedChange = (speed: number) => {
    gameState.setGameSpeed(speed);
  };

  const handleUnlockTech = (techId: string) => {
    gameState.unlockTech(techId);
  };

  const handleRestart = () => {
    gameState.resetGame();
  };

  return (
    <>
      <StatusBar playerState={playerState} currentWave={currentWave} />

      {selectedPlanet && (
        <TowerPanel
          planet={selectedPlanet}
          gameState={gameState}
          onBuild={handleBuildTower}
          onUpgrade={handleUpgradeTower}
        />
      )}

      {playerState.phase === 'prepare' && playerState.currentWave < 9 && (
        <button
          onClick={handleStartWave}
          style={{
            position: 'absolute',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '16px 48px',
            fontSize: 18,
            fontWeight: 'bold',
            borderRadius: 30,
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: 'white',
            zIndex: 100,
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
            animation: 'pulse 2s infinite'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(34, 197, 94, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(34, 197, 94, 0.4)';
          }}
        >
          🚀 开始第 {playerState.currentWave + 1} 波
        </button>
      )}

      <button
        onClick={() => setShowTechTree(true)}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          padding: '12px 24px',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          cursor: 'pointer',
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          fontSize: 14,
          fontWeight: 'bold',
          zIndex: 100,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.background = 'rgba(15, 23, 42, 0.7)';
        }}
      >
        🔬 科技树
      </button>

      <SpeedControl speed={playerState.gameSpeed} onChange={handleSpeedChange} />

      <TechTreePanel
        isOpen={showTechTree}
        onClose={() => setShowTechTree(false)}
        techTree={techTree}
        onUnlock={handleUnlockTech}
        gold={playerState.gold}
      />

      {playerState.phase === 'victory' && (
        <GameOverPanel isVictory={true} score={playerState.score} onRestart={handleRestart} />
      )}

      {playerState.phase === 'defeat' && (
        <GameOverPanel isVictory={false} score={playerState.score} onRestart={handleRestart} />
      )}
    </>
  );
}
