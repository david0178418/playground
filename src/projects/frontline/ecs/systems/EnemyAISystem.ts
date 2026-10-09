import { ALLY, CORRIDOR, ENEMY, PLAYER } from '../../config';
import { ENEMY_TYPES } from '../../data/enemies';
import { createScavengeToken } from '../entities';
import type { GameSystemRegistrar } from '../Engine';
import { allyQuery, enemyQuery, playerQuery } from '../queries';
import type { ArchetypeId } from '../../data/archetypes';

type AllyEntity = {
  id: number;
  components: {
    position: { x: number; y: number };
    health: { current: number; max: number };
    ally: { archetypeId: ArchetypeId };
  };
};

type PlayerEntity = {
  id: number;
  components: {
    position: { x: number; y: number };
    health: { current: number };
  };
};

const hurtIframeUntil = new Map<number, number>();
let simTime = 0;

/** Damage order: nearest living ally absorbs, then player. */
export function routeDamageToSquadThenPlayer(
  damage: number,
  allies: AllyEntity[],
  player: PlayerEntity | null,
  fromX: number,
  fromY: number,
  onAllyDeath: (ally: AllyEntity) => void,
  now: number,
): void {
  let nearest: AllyEntity | null = null;
  let nearestDist = Infinity;
  for (const a of allies) {
    if (a.components.health.current <= 0) continue;
    const until = hurtIframeUntil.get(a.id) ?? 0;
    if (now < until) continue;
    const d = Math.hypot(a.components.position.x - fromX, a.components.position.y - fromY);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = a;
    }
  }
  if (nearest) {
    nearest.components.health.current -= damage;
    hurtIframeUntil.set(nearest.id, now + ALLY.HURT_IFRAME_SEC);
    if (nearest.components.health.current <= 0) {
      onAllyDeath(nearest);
    }
    return;
  }
  if (player) {
    const until = hurtIframeUntil.get(player.id) ?? 0;
    if (now < until) return;
    player.components.health.current -= damage;
    hurtIframeUntil.set(player.id, now + PLAYER.HURT_IFRAME_SEC);
  }
}

export function addEnemyAISystem(systems: GameSystemRegistrar): void {
  const attackCd = new Map<number, number>();

  systems.addSystem('enemyAI')
    .addSingleton('player', playerQuery)
    .addQuery('allies', allyQuery)
    .addQuery('enemies', enemyQuery)
    .runWhenEmpty()
    .withResources(['phase', 'stats'])
    .setProcess(({ queries, dt, ecs, resources: { phase } }) => {
      if (phase !== 'playing') return;
      simTime += dt;
      const player = queries.player;
      if (!player) return;

      const px = player.components.position.x;
      const py = player.components.position.y;

      for (const enemy of queries.enemies) {
        if (enemy.components.health.current <= 0) continue;
        const pos = enemy.components.position;
        const kind = enemy.components.enemy.kind;

        const def = ENEMY_TYPES[kind];
        let target = player.components.position;
        if (def.engagesAllies) {
          let nearestDistance = player.components.health.current > 0 ? Math.hypot(px - pos.x, py - pos.y) : Infinity;
          for (const ally of queries.allies) {
            if (ally.components.health.current <= 0) continue;
            const distance = Math.hypot(ally.components.position.x - pos.x, ally.components.position.y - pos.y);
            if (distance < nearestDistance) {
              target = ally.components.position;
              nearestDistance = distance;
            }
          }
        }
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const dist = Math.hypot(dx, dy);
        const travel = def.engagesAllies ? Math.max(0, dist - def.range * 0.8) : dist;
        const step = Math.min(travel, def.speed * dt);
        pos.x += dist > 0 ? (dx / dist) * step : 0;
        pos.y += dist > 0 ? (dy / dist) * step : 0;
        pos.y = Math.max(
          CORRIDOR.EDGE_PAD + ENEMY.RADIUS,
          Math.min(CORRIDOR.HEIGHT - CORRIDOR.EDGE_PAD - ENEMY.RADIUS, pos.y),
        );

        let cd = attackCd.get(enemy.id) ?? 0;
        cd = Math.max(0, cd - dt);
        if (cd <= 0 && Math.hypot(target.x - pos.x, target.y - pos.y) <= def.range) {
          const stats = ecs.getResource('stats');
          routeDamageToSquadThenPlayer(
            enemy.components.enemy.damage,
            def.engagesAllies ? queries.allies.filter(function (ally) {
              return Math.hypot(ally.components.position.x - pos.x, ally.components.position.y - pos.y) <= def.range;
            }) : queries.allies,
            !def.engagesAllies || Math.hypot(px - pos.x, py - pos.y) <= def.range ? player : null,
            pos.x,
            pos.y,
            (ally) => {
              createScavengeToken(
                ecs.commands,
                ally.components.position.x,
                ally.components.position.y,
                ally.components.ally.archetypeId,
              );
              ecs.commands.removeEntity(ally.id);
              ecs.setResource('stats', {
                ...stats,
                alliesLost: stats.alliesLost + 1,
                alliesAlive: Math.max(0, stats.alliesAlive - 1),
              });
            },
            simTime,
          );
          cd = def.cooldownSec;
        }
        attackCd.set(enemy.id, cd);
      }
    });
}
