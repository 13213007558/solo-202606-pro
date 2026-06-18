import { Wave, WaveEnemyConfig, EnemyType } from './types'

function makeWave(
  id: number,
  name: string,
  configs: WaveEnemyConfig[],
  reward: { gold: number; energy: number }
): Wave {
  return { id, name, enemyConfigs: configs, reward }
}

export function generateWaves(): Wave[] {
  const waves: Wave[] = []

  waves.push(makeWave(1, '先锋侦察', [
    { type: 'scout' as EnemyType, count: 8, interval: 0.8, delay: 0 },
  ], { gold: 50, energy: 20 }))

  waves.push(makeWave(2, '轻型编队', [
    { type: 'scout' as EnemyType, count: 10, interval: 0.6, delay: 0 },
    { type: 'fighter' as EnemyType, count: 4, interval: 1.2, delay: 3 },
  ], { gold: 80, energy: 30 }))

  waves.push(makeWave(3, '战斗集群', [
    { type: 'fighter' as EnemyType, count: 10, interval: 0.8, delay: 0 },
    { type: 'scout' as EnemyType, count: 8, interval: 0.4, delay: 2 },
  ], { gold: 100, energy: 40 }))

  waves.push(makeWave(4, '突击阵型', [
    { type: 'fighter' as EnemyType, count: 8, interval: 0.7, delay: 0 },
    { type: 'cruiser' as EnemyType, count: 2, interval: 2.5, delay: 5 },
  ], { gold: 120, energy: 50 }))

  waves.push(makeWave(5, '重装推进', [
    { type: 'cruiser' as EnemyType, count: 4, interval: 2.0, delay: 0 },
    { type: 'fighter' as EnemyType, count: 12, interval: 0.6, delay: 2 },
  ], { gold: 160, energy: 70 }))

  waves.push(makeWave(6, '混合舰队', [
    { type: 'scout' as EnemyType, count: 15, interval: 0.4, delay: 0 },
    { type: 'fighter' as EnemyType, count: 10, interval: 0.7, delay: 3 },
    { type: 'cruiser' as EnemyType, count: 3, interval: 2.0, delay: 6 },
  ], { gold: 200, energy: 90 }))

  waves.push(makeWave(7, '母舰出现', [
    { type: 'fighter' as EnemyType, count: 15, interval: 0.5, delay: 0 },
    { type: 'cruiser' as EnemyType, count: 5, interval: 1.5, delay: 4 },
    { type: 'mothership' as EnemyType, count: 1, interval: 5, delay: 10 },
  ], { gold: 280, energy: 120 }))

  waves.push(makeWave(8, '歼灭战', [
    { type: 'cruiser' as EnemyType, count: 8, interval: 1.2, delay: 0 },
    { type: 'fighter' as EnemyType, count: 20, interval: 0.4, delay: 2 },
    { type: 'mothership' as EnemyType, count: 2, interval: 4, delay: 8 },
  ], { gold: 350, energy: 150 }))

  waves.push(makeWave(9, '最终决战', [
    { type: 'fighter' as EnemyType, count: 25, interval: 0.35, delay: 0 },
    { type: 'cruiser' as EnemyType, count: 10, interval: 1.0, delay: 3 },
    { type: 'mothership' as EnemyType, count: 3, interval: 3.5, delay: 8 },
    { type: 'scout' as EnemyType, count: 20, interval: 0.3, delay: 12 },
  ], { gold: 500, energy: 250 }))

  return waves
}
