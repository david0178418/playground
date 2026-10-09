import { createProjectile } from '../entities';
import type { GameEngine, GameSystemRegistrar } from '../Engine';
import { allyQuery, enemyQuery, playerQuery, projectileQuery } from '../queries';

type EnemyEnt = {
  id: number;
  components: {
    position: { x: number; y: number };
    health: { current: number };
  };
};

function nearestEnemy(
  x: number,
  y: number,
  range: number,
  enemies: EnemyEnt[],
): { x: number; y: number; dist: number } | null {
  let best: { x: number; y: number; dist: number } | null = null;
  for (const e of enemies) {
    if (e.components.health.current <= 0) continue;
    const ex = e.components.position.x;
    const ey = e.components.position.y;
    const dist = Math.hypot(ex - x, ey - y);
    if (dist <= range && (!best || dist < best.dist)) {
      best = { x: ex, y: ey, dist };
    }
  }
  return best;
}

/** Speeds at or below this are standing still. Real movement is far above it. */
const STATIONARY_SPEED_LIMIT = 1;

const isStationary = function(velocity: { x: number; y: number }): boolean {
  return velocity.x * velocity.x + velocity.y * velocity.y <= STATIONARY_SPEED_LIMIT * STATIONARY_SPEED_LIMIT;
};

interface AttackerStats {
  range: number;
  damage: number;
  projectileSpeed: number;
  shotSpreadHalfDeg?: number;
  coneHalfDeg: number;
  style: string;
  cooldownSec: number;
  cooldownLeft: number;
}

function fireAt(
  ecs: GameEngine,
  x: number,
  y: number,
  target: { x: number; y: number },
  attacker: AttackerStats,
  fromAlly: boolean,
  enemies: EnemyEnt[],
): void {
  if (attacker.style === 'cone') {
    const facingX = target.x - x;
    const facingY = target.y - y;
    const facingLen = Math.hypot(facingX, facingY) || 1;
    const fx = facingX / facingLen;
    const fy = facingY / facingLen;
    const cosHalf = Math.cos((attacker.coneHalfDeg * Math.PI) / 180);
    for (const e of enemies) {
      if (e.components.health.current <= 0) continue;
      const dx = e.components.position.x - x;
      const dy = e.components.position.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > attacker.range || dist < 1) continue;
      const dot = (dx / dist) * fx + (dy / dist) * fy;
      if (dot >= cosHalf) {
        e.components.health.current -= attacker.damage;
      }
    }
    return;
  }

  if (attacker.style === 'hitscan') {
    let best: EnemyEnt | null = null;
    let bestD = Infinity;
    for (const en of enemies) {
      if (en.components.health.current <= 0) continue;
      const d = Math.hypot(en.components.position.x - x, en.components.position.y - y);
      if (d <= attacker.range && d < bestD) {
        bestD = d;
        best = en;
      }
    }
    if (best) best.components.health.current -= attacker.damage;
    return;
  }

  const dx = target.x - x;
  const dy = target.y - y;
  const len = Math.hypot(dx, dy) || 1;
  const spreadHalfDeg = attacker.shotSpreadHalfDeg ?? 0;
  const offset = spreadHalfDeg > 0 ? (Math.random() * 2 - 1) * spreadHalfDeg * Math.PI / 180 : 0;
  const cos = Math.cos(offset);
  const sin = Math.sin(offset);
  const speed = attacker.projectileSpeed;
  createProjectile(
    ecs.commands,
    x,
    y,
    ((dx * cos - dy * sin) / len) * speed,
    ((dx * sin + dy * cos) / len) * speed,
    attacker.damage,
    speed,
    fromAlly,
  );
}

export function addCombatSystem(systems: GameSystemRegistrar): void {
  systems.addSystem('combat')
    .addSingleton('player', playerQuery)
    .addQuery('allies', allyQuery)
    .addQuery('enemies', enemyQuery)
    .addQuery('projectiles', projectileQuery)
    .runWhenEmpty()
    .withResources(['phase'])
    .setProcess(({ queries, dt, ecs, resources: { phase } }) => {
      if (phase !== 'playing') return;
      const enemies = queries.enemies as EnemyEnt[];

      const tryAttack = (
        pos: { x: number; y: number },
        velocity: { x: number; y: number },
        attacker: AttackerStats,
        fromAlly: boolean,
      ) => {
        attacker.cooldownLeft = Math.max(0, attacker.cooldownLeft - dt);
        if (attacker.cooldownLeft > 0) return;
        // Movement systems write velocity earlier in this update.
        if (!isStationary(velocity)) return;
        const target = nearestEnemy(pos.x, pos.y, attacker.range, enemies);
        if (!target) return;
        fireAt(ecs, pos.x, pos.y, target, attacker, fromAlly, enemies);
        attacker.cooldownLeft = attacker.cooldownSec;
      };

      if (queries.player) {
        tryAttack(
          queries.player.components.position,
          queries.player.components.velocity,
          queries.player.components.attacker,
          true,
        );
      }
      for (const ally of queries.allies) {
        tryAttack(ally.components.position, ally.components.velocity, ally.components.attacker, true);
      }

      for (const proj of queries.projectiles) {
        const p = proj.components.projectile;
        const pos = proj.components.position;
        pos.x += p.vx * dt;
        pos.y += p.vy * dt;
        p.lifetime -= dt;
        if (p.lifetime <= 0) {
          ecs.commands.removeEntity(proj.id);
          continue;
        }
        if (!p.fromAlly) continue;
        for (const e of enemies) {
          if (e.components.health.current <= 0) continue;
          const d = Math.hypot(e.components.position.x - pos.x, e.components.position.y - pos.y);
          if (d < 14) {
            e.components.health.current -= p.damage;
            ecs.commands.removeEntity(proj.id);
            break;
          }
        }
      }
    });
}
