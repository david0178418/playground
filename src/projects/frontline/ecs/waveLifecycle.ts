import { CORRIDOR, DOOR, SOFT_SQUAD_CAP, WAVE_DURATION_SEC } from '../config';
import { waveDef, type WaveId } from '../data/waves';
import type { Components } from './types';
import type { GameEngine } from './Engine';
import { createAlly, createDoor, createPlayer } from './entities';

function clearWaveEntities(ecs: GameEngine, keepPlayerAndAllies: boolean): void {
  const remove = (components: readonly (keyof Components)[]) => {
    for (const e of ecs.getEntitiesWithQuery(components)) {
      if (keepPlayerAndAllies) {
        if (ecs.entityManager.getComponent(e.id, 'player')) continue;
        if (ecs.entityManager.getComponent(e.id, 'ally')) continue;
      }
      ecs.removeEntity(e.id);
    }
  };
  remove(['enemy']);
  remove(['projectile']);
  remove(['scavengeToken']); // unbanked lost on exit
  remove(['experienceDrop']);
  remove(['door']);
  if (!keepPlayerAndAllies) {
    remove(['player']);
    remove(['ally']);
  }
}

/** Begin or continue into a wave. fresh=false keeps player+allies across shop. */
export function startWave(ecs: GameEngine, waveId: WaveId, fresh: boolean): void {
  const wave = waveDef(waveId);
  clearWaveEntities(ecs, !fresh);

  ecs.setResource('phase', 'playing');
  ecs.setResource('waveId', waveId);
  ecs.setResource('waveElapsed', 0);
  ecs.setResource('waveDuration', wave.durationSec || WAVE_DURATION_SEC);
  ecs.setResource('spawnAheadAccumulator', 0);
  ecs.setResource('rearNextAt', wave.rearFirstAtSec);
  ecs.setResource('doorOpen', false);
  ecs.setResource('frontX', 200);
  ecs.setResource('cameraX', 0);
  ecs.setResource('softSquadCap', SOFT_SQUAD_CAP);
  ecs.setResource('endReason', '');

  if (fresh) {
    const startX = 180;
    const startY = CORRIDOR.HEIGHT / 2;
    createPlayer(ecs, startX, startY);
    createAlly(ecs, startX - 40, startY + 20, 'rifleman', 0);
    ecs.setResource('coins', 0);
    ecs.setResource('bankedTokens', 0);
    ecs.setResource('progression', { level: 1, experience: 0, choices: [] });
    ecs.enableSystemGroup('timers');
    ecs.setResource('stats', { wavesCleared: 0, alliesRecruited: 0, alliesLost: 0, alliesAlive: 1, enemiesKilled: 0 });
  } else {
    // Nudge player back toward corridor start of next segment feel
    for (const p of ecs.getEntitiesWithQuery(['player', 'position'])) {
      p.components.position.x = Math.min(p.components.position.x, 400);
    }
  }

  createDoor(ecs, DOOR.X, CORRIDOR.HEIGHT / 2);

  // Refresh alliesAlive count
  const allies = ecs.getEntitiesWithQuery(['ally', 'health']);
  const stats = ecs.getResource('stats');
  ecs.setResource('stats', { ...stats, alliesAlive: allies.length });
}

export function restartRun(ecs: GameEngine): void {
  startWave(ecs, 1, true);
}

/** Called from WaveSystem when door is entered — clear unbanked tokens. */
export function discardUnbankedTokens(ecs: GameEngine): void {
  for (const tok of ecs.getEntitiesWithQuery(['scavengeToken'])) {
    ecs.removeEntity(tok.id);
  }
}
