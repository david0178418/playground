import { ALLY, CORRIDOR } from '../../config';
import type { GameSystemRegistrar } from '../Engine';
import { allyQuery, playerQuery } from '../queries';

/** Loose formation: allies fan behind/beside player based on formationIndex. */
export function addSquadFollowSystem(systems: GameSystemRegistrar): void {
  systems.addSystem('squadFollow')
    .addSingleton('player', playerQuery)
    .addQuery('allies', allyQuery)
    .runWhenEmpty()
    .withResources(['phase'])
    .setProcess(({ queries, dt, resources: { phase } }) => {
      if (phase !== 'playing') return;
      const player = queries.player;
      if (!player) return;
      const px = player.components.position.x;
      const py = player.components.position.y;

      for (const ally of queries.allies) {
        const idx = ally.components.ally.formationIndex;
        // Stagger: even indices left-rear, odd right-rear, deeper for higher index
        const side = idx % 2 === 0 ? -1 : 1;
        const row = Math.floor(idx / 2);
        const targetX = px - ALLY.FOLLOW_DISTANCE - row * 22;
        const targetY = py + side * (ALLY.FOLLOW_SPREAD + row * 10);

        const pos = ally.components.position;
        const dx = targetX - pos.x;
        const dy = targetY - pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 4) {
          const step = Math.min(dist, ALLY.SPEED * dt);
          pos.x += (dx / dist) * step;
          pos.y += (dy / dist) * step;
        }
        pos.y = Math.max(CORRIDOR.EDGE_PAD + ALLY.RADIUS, Math.min(CORRIDOR.HEIGHT - CORRIDOR.EDGE_PAD - ALLY.RADIUS, pos.y));
      }
    });
}
