import { CORRIDOR, DOOR, ENEMY, SPAWN } from '../../config';
import { waveDef } from '../../data/waves';
import { createEnemy } from '../entities';
import type { GameSystemRegistrar } from '../Engine';
import { playerQuery } from '../queries';

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function packCount(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

export function addSpawnSystem(systems: GameSystemRegistrar): void {
  systems.addSystem('spawn')
    .addSingleton('player', playerQuery)
    .runWhenEmpty()
    .withResources([
      'phase',
      'waveId',
      'waveElapsed',
      'waveDuration',
      'spawnAheadAccumulator',
      'rearNextAt',
      'frontX',
    ])
    .setProcess(({ queries, dt, ecs, resources }) => {
      if (resources.phase !== 'playing') return;
      const player = queries.player;
      if (!player) return;

      const wave = waveDef(resources.waveId);
      const t = resources.waveElapsed;
      const dur = resources.waveDuration;
      const progress = Math.min(1, t / dur);

      // Spawn rate rises during wave
      const interval =
        (SPAWN.AHEAD_INTERVAL_START +
          (SPAWN.AHEAD_INTERVAL_END - SPAWN.AHEAD_INTERVAL_START) * progress) /
        wave.spawnRateMult;

      let acc = resources.spawnAheadAccumulator + dt;
      const px = player.components.position.x;
      const frontX = Math.max(resources.frontX, px);
      const goalProgress = Math.max(0, Math.min(1, frontX / DOOR.X));
      const packGrowth = Math.round(goalProgress * SPAWN.PACK_GROWTH_AT_GOAL);
      const hpScale = 1 + (resources.waveId - 1) * 0.25;

      while (acc >= interval) {
        acc -= interval;
        const n = packCount(
          SPAWN.AHEAD_PACK_MIN + packGrowth,
          SPAWN.AHEAD_PACK_MAX + resources.waveId - 1 + packGrowth,
        );
        for (let i = 0; i < n; i++) {
          const x = px + rand(ENEMY.AHEAD_MIN, ENEMY.AHEAD_MAX);
          const y = rand(CORRIDOR.EDGE_PAD + 30, CORRIDOR.HEIGHT - CORRIDOR.EDGE_PAD - 30);
          createEnemy(ecs.commands, Math.min(x, CORRIDOR.WIDTH - 40), y, 'regular', hpScale);
        }
      }
      ecs.setResource('spawnAheadAccumulator', acc);

      // Rear chase wave of regular units from the left (survivable, punishing)
      if (t >= resources.rearNextAt) {
        const pack = wave.rearPackSize +
          (resources.waveId - 1) * SPAWN.REAR_PACK_SIZE_WAVE_SCALE + packGrowth;
        for (let i = 0; i < pack; i++) {
          const x = Math.max(
            CORRIDOR.LEFT_WALL + 20,
            px - rand(ENEMY.REAR_OFFSET_MIN, ENEMY.REAR_OFFSET_MAX) - i * 18,
          );
          const y = rand(CORRIDOR.EDGE_PAD + 30, CORRIDOR.HEIGHT - CORRIDOR.EDGE_PAD - 30);
          createEnemy(ecs.commands, x, y, 'chase', hpScale);
        }
        ecs.setResource('rearNextAt', t + wave.rearIntervalSec);
      }

      // Advance front as player pushes right
      if (px > resources.frontX) {
        ecs.setResource('frontX', px);
      }
    });
}
