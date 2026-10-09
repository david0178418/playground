import { ENEMY, EXPERIENCE, SCAVENGE } from '../../config';
import { createExperienceDrop } from '../entities';
import type { GameSystemRegistrar } from '../Engine';
import { beginLevelUp } from '../progression';
import { enemyQuery, experienceQuery, playerQuery, tokenQuery } from '../queries';

export function addPickupSystem(systems: GameSystemRegistrar): void {
  systems.addSystem('pickup')
    .addSingleton('player', playerQuery)
    .addQuery('experience', experienceQuery)
    .addQuery('tokens', tokenQuery)
    .addQuery('enemies', enemyQuery)
    .runWhenEmpty()
    .withResources(['phase'])
    .setProcess(({ queries, ecs, resources }) => {
      if (resources.phase !== 'playing') return;
      const player = queries.player;
      if (!player) return;
      const { x: px, y: py } = player.components.position;

      for (const enemy of queries.enemies) {
        if (enemy.components.health.current > 0) continue;
        createExperienceDrop(ecs.commands, enemy.components.position.x, enemy.components.position.y, EXPERIENCE.PER_ENEMY);
        ecs.setResource('coins', ecs.getResource('coins') + ENEMY.COIN_DROP);
        ecs.commands.removeEntity(enemy.id);
        const stats = ecs.getResource('stats');
        ecs.setResource('stats', { ...stats, enemiesKilled: stats.enemiesKilled + 1 });
      }

      for (const token of queries.tokens) {
        if (token.components.scavengeToken.banked) continue;
        const pos = token.components.position;
        if (Math.hypot(pos.x - px, pos.y - py) > SCAVENGE.PICKUP_RANGE) continue;
        token.components.scavengeToken.banked = true;
        ecs.setResource('bankedTokens', ecs.getResource('bankedTokens') + 1);
        ecs.commands.removeEntity(token.id);
      }

      let gained = 0;
      for (const drop of queries.experience) {
        const pos = drop.components.position;
        if (Math.hypot(pos.x - px, pos.y - py) > EXPERIENCE.PICKUP_RANGE) continue;
        gained += drop.components.experienceDrop.amount;
        ecs.commands.removeEntity(drop.id);
      }
      if (gained === 0 || player.components.health.current <= 0) return;
      const progression = ecs.getResource('progression');
      ecs.setResource('progression', { ...progression, experience: progression.experience + gained });
      beginLevelUp(ecs);
    });
}
