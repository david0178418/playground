import { DOOR, SHOP } from '../../config';
import type { WaveId } from '../../data/waves';
import type { GameEngine, GameSystemRegistrar } from '../Engine';
import { doorQuery, playerQuery } from '../queries';

export function addWaveSystem(systems: GameSystemRegistrar): void {
  systems.addSystem('wave')
    .addSingleton('player', playerQuery)
    .addQuery('doors', doorQuery)
    .runWhenEmpty()
    .withResources([
      'phase',
      'waveId',
      'waveElapsed',
      'waveDuration',
      'doorOpen',
      'stats',
    ])
    .setProcess(({ queries, dt, ecs, resources }) => {
      if (resources.phase !== 'playing') return;
      const player = queries.player;
      if (!player) return;

      if (player.components.health.current <= 0) {
        ecs.setResource('phase', 'lost');
        ecs.setResource('endReason', 'Player down. Run over.');
        return;
      }

      const elapsed = resources.waveElapsed + dt;
      ecs.setResource('waveElapsed', elapsed);

      const shouldOpen = elapsed >= resources.waveDuration;
      if (shouldOpen && !resources.doorOpen) {
        ecs.setResource('doorOpen', true);
        for (const door of queries.doors) {
          door.components.door.open = true;
          door.components.renderable.color = DOOR.COLOR_OPEN;
          door.components.renderable.label = 'OPEN';
        }
      }

      if (resources.doorOpen) {
        const pos = player.components.position;
        for (const door of queries.doors) {
          const dx = Math.abs(door.components.position.x - pos.x);
          const dy = Math.abs(door.components.position.y - pos.y);
          const halfH = (door.components.renderable.height ?? DOOR.HEIGHT) / 2;
          if (dx < DOOR.WIDTH && dy < halfH) {
            endWave(ecs);
            return;
          }
        }
      }
    });
}

function endWave(ecs: GameEngine): void {
  const waveId = ecs.getResource('waveId');
  const stats = ecs.getResource('stats');
  ecs.setResource('stats', { ...stats, wavesCleared: stats.wavesCleared + 1 });

  if (waveId >= 3) {
    ecs.setResource('phase', 'won');
    ecs.setResource('endReason', 'Wave 3 cleared. You held the line.');
    return;
  }

  // Grant wave-clear payout once on shop transition (enemy drops already collected in-wave).
  const payout =
    SHOP.WAVE_CLEAR_PAYOUT + (waveId - 1) * SHOP.WAVE_CLEAR_PAYOUT_PER_WAVE;
  ecs.setResource('coins', ecs.getResource('coins') + payout);

  ecs.setResource('phase', 'shop');
  ecs.setResource('waveId', (waveId + 1) as WaveId);
}
