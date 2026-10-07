import { ENEMY, RECRUIT, SCAVENGE, SOFT_SQUAD_CAP } from '../../config';
import { createAlly, createCoinDrop } from '../entities';
import type { GameSystemRegistrar } from '../Engine';
import {
  allyQuery,
  coinQuery,
  crateQuery,
  enemyQuery,
  playerQuery,
  tokenQuery,
} from '../queries';

export function addPickupSystem(systems: GameSystemRegistrar): void {
  systems.addSystem('pickup')
    .addSingleton('player', playerQuery)
    .addQuery('allies', allyQuery)
    .addQuery('crates', crateQuery)
    .addQuery('tokens', tokenQuery)
    .addQuery('coins', coinQuery)
    .addQuery('enemies', enemyQuery)
    .runWhenEmpty()
    .withResources(['phase', 'coins', 'bankedTokens', 'softSquadCap', 'stats'])
    .setProcess(({ queries, ecs, resources }) => {
      if (resources.phase !== 'playing') return;
      const player = queries.player;
      if (!player) return;
      const px = player.components.position.x;
      const py = player.components.position.y;

      // Enemy death → coin drop + cleanup
      for (const e of queries.enemies) {
        if (e.components.health.current > 0) continue;
        createCoinDrop(
          ecs.commands,
          e.components.position.x,
          e.components.position.y,
          ENEMY.COIN_DROP,
        );
        ecs.commands.removeEntity(e.id);
        const stats = ecs.getResource('stats');
        ecs.setResource('stats', {
          ...stats,
          enemiesKilled: stats.enemiesKilled + 1,
        });
      }

      // Recruit crates — touch to accept (soft cap blocks)
      const livingAllies = queries.allies.filter(a => a.components.health.current > 0).length;
      const cap = resources.softSquadCap ?? SOFT_SQUAD_CAP;

      for (const crate of queries.crates) {
        if (crate.components.recruitCrate.claimed) continue;
        const cpos = crate.components.position;
        const d = Math.hypot(cpos.x - px, cpos.y - py);
        if (d > RECRUIT.PICKUP_RANGE) continue;
        if (livingAllies >= cap) continue;

        crate.components.recruitCrate.claimed = true;
        const idx = livingAllies;
        createAlly(
          ecs,
          cpos.x,
          cpos.y,
          crate.components.recruitCrate.archetypeId,
          idx,
        );
        ecs.commands.removeEntity(crate.id);
        const stats = ecs.getResource('stats');
        ecs.setResource('stats', {
          ...stats,
          alliesRecruited: stats.alliesRecruited + 1,
          alliesAlive: stats.alliesAlive + 1,
        });
        break; // one recruit per frame is enough
      }

      // Scavenge tokens — walk over to bank; unbanked lost on exit
      for (const tok of queries.tokens) {
        if (tok.components.scavengeToken.banked) continue;
        const tpos = tok.components.position;
        if (Math.hypot(tpos.x - px, tpos.y - py) > SCAVENGE.PICKUP_RANGE) continue;
        tok.components.scavengeToken.banked = true;
        ecs.setResource('bankedTokens', resources.bankedTokens + 1);
        ecs.commands.removeEntity(tok.id);
      }

      // Coins
      for (const coin of queries.coins) {
        const cpos = coin.components.position;
        if (Math.hypot(cpos.x - px, cpos.y - py) > 22) continue;
        ecs.setResource('coins', resources.coins + coin.components.coinDrop.amount);
        ecs.commands.removeEntity(coin.id);
      }
    });
}
