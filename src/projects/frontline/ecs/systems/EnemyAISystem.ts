import { ALLY, CORRIDOR, ENEMY, PLAYER } from '../../config';
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

        const speed = kind === 'chase' ? ENEMY.SPEED * 1.2 : ENEMY.SPEED;
        const dx = px - pos.x;
        const dy = py - pos.y;
        const dist = Math.hypot(dx, dy) || 1;
        pos.x += (dx / dist) * speed * dt;
        pos.y += (dy / dist) * speed * dt;
        pos.y = Math.max(
          CORRIDOR.EDGE_PAD + ENEMY.RADIUS,
          Math.min(CORRIDOR.HEIGHT - CORRIDOR.EDGE_PAD - ENEMY.RADIUS, pos.y),
        );

        let cd = attackCd.get(enemy.id) ?? 0;
        cd = Math.max(0, cd - dt);
        if (cd <= 0 && dist <= ENEMY.CONTACT_RANGE) {
          const stats = ecs.getResource('stats');
          routeDamageToSquadThenPlayer(
            enemy.components.enemy.damage,
            queries.allies as AllyEntity[],
            player as PlayerEntity,
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
          cd = ENEMY.ATTACK_COOLDOWN_SEC;
        }
        attackCd.set(enemy.id, cd);
      }
    });
}
