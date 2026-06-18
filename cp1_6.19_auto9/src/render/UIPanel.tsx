import { useEffect, useState } from 'react'
import { GameState } from '../data/gameState'
import { GameStateSnapshot, TowerType, PlanetType, TOWER_STATS } from '../data/types'

interface UIPanelProps {
  gameState: GameState
}

const TOWER_INFO: Record<TowerType, { name: string; icon: string; desc: string }> = {
  laser: { name: '激光塔', icon: '🔴', desc: '高射速低伤害，适合快速清理小型敌人' },
  missile: { name: '导弹塔', icon: '🔵', desc: '高伤害低射速，射程远，适合对付重型单位' },
  electromagnetic: { name: '电磁炮', icon: '🟣', desc: '平衡型，造成持续干扰伤害' },
}

const PLANET_TYPE_INFO: Record<PlanetType, { name: string; desc: string }> = {
  mineral: { name: '矿产星', desc: '高金币产出' },
  energy: { name: '能源星', desc: '高能量产出' },
  military: { name: '军事星', desc: '可建造更多防御塔（5座）' },
  neutral: { name: '中立星', desc: '平衡型星球' },
  endpoint: { name: '终点星', desc: '需要重点保护的星球' },
}

function TopStatusBar({ snapshot }: { snapshot: GameStateSnapshot }) {
  const { player, planets } = snapshot
  const endPlanet = planets.find(p => p.type === 'endpoint' && p.id === 'p9')
  const phaseText = {
    preparation: '🛡️ 准备阶段',
    combat: '⚔️ 战斗中',
    victory: '🎉 胜利！',
    defeat: '💀 失败',
  }[player.phase]

  return (
    <div className="glass-panel top-status">
      <div className="status-item">
        <span className="status-icon">🌊</span>
        <span className="status-label">波次</span>
        <span className="status-value">{player.currentWave}/{player.totalWaves}</span>
      </div>
      <div className="status-item gold">
        <span className="status-icon">💰</span>
        <span className="status-label">金币</span>
        <span className="status-value">{Math.floor(player.gold)}</span>
      </div>
      <div className="status-item energy">
        <span className="status-icon">⚡</span>
        <span className="status-label">能量</span>
        <span className="status-value">{Math.floor(player.energy)}</span>
      </div>
      {endPlanet && (
        <div className="status-item hp">
          <span className="status-icon">❤️</span>
          <span className="status-label">{endPlanet.name}</span>
          <span className="status-value">{Math.floor(endPlanet.currentHp)}/{endPlanet.maxHp}</span>
        </div>
      )}
      <div className={`status-item phase phase-${player.phase}`}>
        <span className="status-value">{phaseText}</span>
      </div>
      <div className="status-item score">
        <span className="status-icon">⭐</span>
        <span className="status-label">得分</span>
        <span className="status-value">{player.score}</span>
      </div>
    </div>
  )
}

function PlanetDetailPanel({
  snapshot,
  gameState,
  onClose,
}: {
  snapshot: GameStateSnapshot
  gameState: GameState
  onClose: () => void
}) {
  const planet = snapshot.planets.find(p => p.id === snapshot.player.selectedPlanetId)
  if (!planet) return null

  const typeInfo = PLANET_TYPE_INFO[planet.type]
  const canBuild = planet.towers.length < planet.maxTowers
  const hpPercent = (planet.currentHp / planet.maxHp) * 100

  const handleBuild = (type: TowerType) => {
    gameState.buildTower(planet.id, type)
  }

  const handleUpgrade = (towerId: string) => {
    gameState.upgradeTower(planet.id, towerId)
  }

  const handleSell = (towerId: string) => {
    gameState.sellTower(planet.id, towerId)
  }

  return (
    <div className="glass-panel planet-detail panel-anim">
      <div className="panel-header">
        <div className="planet-header-info">
          <div className="planet-color-dot" style={{ background: planet.color, boxShadow: `0 0 10px ${planet.glowColor}` }} />
          <h2>{planet.name}</h2>
          <span className="planet-type-badge">{typeInfo.name}</span>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <p className="planet-desc">{typeInfo.desc}</p>

      <div className="hp-bar-container">
        <div className="hp-bar-label">
          <span>星球血量</span>
          <span>{Math.floor(planet.currentHp)} / {planet.maxHp}</span>
        </div>
        <div className="hp-bar-bg">
          <div className="hp-bar-fill" style={{
            width: `${hpPercent}%`,
            background: hpPercent > 50 ? 'linear-gradient(90deg,#4caf50,#8bc34a)' : hpPercent > 25 ? 'linear-gradient(90deg,#ff9800,#ffc107)' : 'linear-gradient(90deg,#f44336,#ff5722)',
          }} />
        </div>
      </div>

      <div className="resource-row">
        <div className="resource-item">
          <span>💰</span>
          <span>+{planet.goldPerSecond}/秒</span>
        </div>
        <div className="resource-item">
          <span>⚡</span>
          <span>+{planet.energyPerSecond}/秒</span>
        </div>
        <div className="resource-item">
          <span>🏰</span>
          <span>{planet.towers.length}/{planet.maxTowers} 塔位</span>
        </div>
      </div>

      <div className="section-title">建造防御塔</div>
      <div className="tower-build-list">
        {(['laser', 'missile', 'electromagnetic'] as TowerType[]).map(type => {
          const info = TOWER_INFO[type]
          const stats = TOWER_STATS[type][0]
          const canAfford = snapshot.player.gold >= stats.cost && snapshot.player.energy >= stats.energyCost
          return (
            <button
              key={type}
              className={`tower-build-btn ${!canBuild || !canAfford ? 'disabled' : ''}`}
              onClick={() => handleBuild(type)}
              disabled={!canBuild || !canAfford}
            >
              <div className="tower-icon">{info.icon}</div>
              <div className="tower-info">
                <div className="tower-name">{info.name}</div>
                <div className="tower-stats">
                  伤害:{stats.damage} 射程:{stats.range} 射速:{stats.fireRate}/s
                </div>
                <div className="tower-cost">
                  <span className="gold-cost">💰{stats.cost}</span>
                  <span className="energy-cost">⚡{stats.energyCost}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {planet.towers.length > 0 && (
        <>
          <div className="section-title">已建造 ({planet.towers.length})</div>
          <div className="tower-list">
            {planet.towers.map(tower => {
              const info = TOWER_INFO[tower.type]
              const stats = TOWER_STATS[tower.type][tower.level - 1]
              const nextStats = tower.level < 3 ? TOWER_STATS[tower.type][tower.level] : null
              const canUpgrade = nextStats && snapshot.player.gold >= nextStats.cost && snapshot.player.energy >= nextStats.energyCost
              return (
                <div key={tower.id} className="tower-item glass-card">
                  <div className="tower-item-header">
                    <span className="tower-icon-sm">{info.icon}</span>
                    <span className="tower-item-name">{info.name}</span>
                    <span className="tower-level">Lv.{tower.level}</span>
                  </div>
                  <div className="tower-item-stats">
                    伤害:{Math.floor(stats.damage)} | 射程:{stats.range} | 射速:{stats.fireRate}/s
                  </div>
                  <div className="tower-item-actions">
                    {nextStats ? (
                      <button
                        className={`upgrade-btn ${!canUpgrade ? 'disabled' : ''}`}
                        onClick={() => handleUpgrade(tower.id)}
                        disabled={!canUpgrade}
                      >
                        ⬆ 升级
                        <span className="upgrade-cost">💰{nextStats.cost} ⚡{nextStats.energyCost}</span>
                      </button>
                    ) : (
                      <span className="max-level">已满级 ✨</span>
                    )}
                    <button className="sell-btn" onClick={() => handleSell(tower.id)}>
                      💸 出售
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function TechTreePanel({
  snapshot,
  gameState,
  isOpen,
  onClose,
}: {
  snapshot: GameStateSnapshot
  gameState: GameState
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen) return null

  const handleUnlock = (techId: string) => {
    gameState.unlockTech(techId)
  }

  return (
    <div className="tech-overlay" onClick={onClose}>
      <div className="glass-panel tech-tree panel-anim" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <h2>🔬 全局科技树</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <p className="tech-subtitle">消耗金币解锁全局永久加成</p>
        <div className="tech-grid">
          {snapshot.techTree.map(tech => {
            const prereqsMet = tech.prerequisites.every(pid =>
              snapshot.techTree.find(t => t.id === pid)?.unlocked
            )
            const canAfford = snapshot.player.gold >= tech.cost
            const canUnlock = !tech.unlocked && prereqsMet && canAfford
            return (
              <div
                key={tech.id}
                className={`tech-node ${tech.unlocked ? 'unlocked' : ''} ${!prereqsMet ? 'locked' : ''}`}
              >
                <div className="tech-icon">{tech.icon}</div>
                <div className="tech-name">{tech.name}</div>
                <div className="tech-desc">{tech.description}</div>
                {tech.unlocked ? (
                  <div className="tech-unlocked">✅ 已解锁</div>
                ) : (
                  <button
                    className={`tech-unlock-btn ${!canUnlock ? 'disabled' : ''}`}
                    onClick={() => handleUnlock(tech.id)}
                    disabled={!canUnlock}
                  >
                    💰 {tech.cost}
                    {!prereqsMet && <span className="tech-lock">🔒</span>}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SpeedControl({
  snapshot,
  gameState,
}: {
  snapshot: GameStateSnapshot
  gameState: GameState
}) {
  const speeds = [1, 2]
  return (
    <div className="glass-panel speed-control">
      {speeds.map(s => (
        <button
          key={s}
          className={`speed-btn ${snapshot.player.speedMultiplier === s ? 'active' : ''}`}
          onClick={() => gameState.setSpeed(s)}
        >
          {s}×
        </button>
      ))}
    </div>
  )
}

function BottomControls({
  snapshot,
  gameState,
  onOpenTech,
}: {
  snapshot: GameStateSnapshot
  gameState: GameState
  onOpenTech: () => void
}) {
  const { player } = snapshot
  const canStartWave = player.phase === 'preparation' && player.currentWave < player.totalWaves

  return (
    <div className="bottom-controls">
      <button className="glass-btn tech-btn" onClick={onOpenTech}>
        🔬 科技树
      </button>
      {player.phase === 'preparation' && player.currentWave < player.totalWaves && (
        <button
          className={`glass-btn start-wave-btn ${!canStartWave ? 'disabled' : ''}`}
          onClick={() => gameState.startWave()}
        >
          ▶ 开始第 {player.currentWave + 1} 波
        </button>
      )}
      {(player.phase === 'victory' || player.phase === 'defeat') && (
        <button className="glass-btn restart-btn" onClick={() => gameState.resetGame()}>
          🔄 重新开始
        </button>
      )}
    </div>
  )
}

function GameOverModal({ snapshot, gameState }: { snapshot: GameStateSnapshot; gameState: GameState }) {
  const { player } = snapshot
  if (player.phase !== 'victory' && player.phase !== 'defeat') return null

  const isVictory = player.phase === 'victory'
  return (
    <div className="game-over-overlay">
      <div className="glass-panel game-over-modal panel-anim">
        <h1 className={isVictory ? 'victory' : 'defeat'}>
          {isVictory ? '🎉 星海守护成功！' : '💀 终焉星陷落...'}
        </h1>
        <p className="game-over-score">最终得分：<strong>{player.score}</strong></p>
        <p className="game-over-sub">
          {isVictory ? '你成功抵御了所有外星舰队的入侵！' : '外星舰队攻破了最后防线...'}
        </p>
        <button className="glass-btn start-wave-btn" onClick={() => gameState.resetGame()}>
          🔄 再战一局
        </button>
      </div>
    </div>
  )
}

function HelpTooltip() {
  return (
    <div className="glass-panel help-tooltip">
      <div className="help-title">🎮 操作说明</div>
      <ul>
        <li>🖱️ 点击星球查看详情并建造防御塔</li>
        <li>🔄 鼠标拖拽旋转视角，滚轮缩放</li>
        <li>💰 消灭敌人获取金币和能量</li>
        <li>🔬 合理升级科技树获得全局加成</li>
        <li>❤️ 保护终焉星不被摧毁即可获胜</li>
      </ul>
    </div>
  )
}

function UIPanel({ gameState }: UIPanelProps) {
  const [snapshot, setSnapshot] = useState<GameStateSnapshot | null>(null)
  const [techOpen, setTechOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = gameState.subscribe(setSnapshot)
    return unsubscribe
  }, [gameState])

  if (!snapshot) return null

  const selectedPlanet = snapshot.player.selectedPlanetId

  return (
    <div className="ui-container">
      <TopStatusBar snapshot={snapshot} />

      {selectedPlanet && (
        <PlanetDetailPanel
          snapshot={snapshot}
          gameState={gameState}
          onClose={() => gameState.selectPlanet(null)}
        />
      )}

      <HelpTooltip />

      <div className="bottom-right-controls">
        <SpeedControl snapshot={snapshot} gameState={gameState} />
      </div>

      <BottomControls
        snapshot={snapshot}
        gameState={gameState}
        onOpenTech={() => setTechOpen(true)}
      />

      <TechTreePanel
        snapshot={snapshot}
        gameState={gameState}
        isOpen={techOpen}
        onClose={() => setTechOpen(false)}
      />

      <GameOverModal snapshot={snapshot} gameState={gameState} />
    </div>
  )
}

export default UIPanel
