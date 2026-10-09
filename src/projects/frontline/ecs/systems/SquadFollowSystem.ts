import { ALLY, CORRIDOR } from '../../config';
import type { GameSystemRegistrar } from '../Engine';
import { writeDisplacementVelocity } from '../motion';
import { allyQuery, enemyQuery, playerQuery } from '../queries';

/** Loose formation: allies fan behind/beside player based on formationIndex. */
export function addSquadFollowSystem(systems: GameSystemRegistrar): void {
  systems.addSystem('squadFollow')
    .addSingleton('player', playerQuery)
    .addQuery('allies', allyQuery)
    .addQuery('enemies', enemyQuery)
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
        let targetX = px - ALLY.FOLLOW_DISTANCE - row * 22;
        let targetY = py + side * (ALLY.FOLLOW_SPREAD + row * 10);

        if (ally.components.health.current <= 0) continue;
        const pos = ally.components.position;
        if (ally.components.attacker.style === 'melee') {
          const target = queries.enemies
            .filter(function (enemy) {
              return enemy.components.health.current > 0 &&
                Math.hypot(enemy.components.position.x - px, enemy.components.position.y - py) <= ALLY.MELEE_LEASH_RANGE;
            })
            .reduce<typeof queries.enemies[number] | undefined>(function (nearest, enemy) {
              if (!nearest) return enemy;
              const distance = function (position: { x: number; y: number }): number {
                return Math.hypot(position.x - pos.x, position.y - pos.y);
              };
              return distance(enemy.components.position) < distance(nearest.components.position) ? enemy : nearest;
            }, undefined);
          if (target) {
            const dx = target.components.position.x - pos.x;
            const dy = target.components.position.y - pos.y;
            const distance = Math.hypot(dx, dy);
            // Stop inside reach so combat's stationary gate permits a strike.
            const travel = Math.max(0, distance - ally.components.attacker.range * 0.8);
            targetX = pos.x + (distance > 0 ? dx / distance * travel : 0);
            targetY = pos.y + (distance > 0 ? dy / distance * travel : 0);
          }
        }
        const fromX = pos.x;
        const fromY = pos.y;
        const dx = targetX - pos.x;
        const dy = targetY - pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 4) {
          const step = Math.min(dist, ALLY.SPEED * dt);
          pos.x += (dx / dist) * step;
          pos.y += (dy / dist) * step;
        } else {
          // Stay in the slot. A moving player carries the ally instead of leaving a one-frame stop.
          pos.x = targetX;
          pos.y = targetY;
        }
        pos.x = Math.max(CORRIDOR.LEFT_WALL + ALLY.RADIUS, Math.min(CORRIDOR.WIDTH - ALLY.RADIUS, pos.x));
        pos.y = Math.max(CORRIDOR.EDGE_PAD + ALLY.RADIUS, Math.min(CORRIDOR.HEIGHT - CORRIDOR.EDGE_PAD - ALLY.RADIUS, pos.y));
        writeDisplacementVelocity(ally.components.velocity, fromX, fromY, pos.x, pos.y, dt);
      }
    });
}
