import { describe, expect, spyOn, test } from 'bun:test';
import { ALLY, ENEMY, PLAYER } from '../../config';
import { archetype } from '../../data/archetypes';
import { ENEMY_TYPES } from '../../data/enemies';
import { createGameEngine } from '../Engine';
import { createAlly, createEnemy, createPlayer } from '../entities';
import { addCombatSystem } from './CombatSystem';
import { addEnemyAISystem } from './EnemyAISystem';
import { addSpawnSystem } from './SpawnSystem';
import { addSquadFollowSystem } from './SquadFollowSystem';

describe('melee recruits', () => {
  for (const kind of ['brawler', 'duelist'] as const) {
    test(`${kind} closes, stops to strike, respects cooldown and returns to formation`, async () => {
      const ecs = createGameEngine();
      try {
        addSquadFollowSystem(ecs);
        addCombatSystem(ecs);
        await ecs.initialize();
        createPlayer(ecs, 200, 200);
        const ally = createAlly(ecs, 200 - ALLY.FOLLOW_DISTANCE, 200 - ALLY.FOLLOW_SPREAD, kind, 0);
        // Keep the player from shooting, isolating the melee recruit.
        const playerAttacker = ecs.getEntitiesWithQuery(['player', 'attacker'])[0];
        if (!playerAttacker) throw new Error('Missing player');
        playerAttacker.components.attacker.range = 0;
        createEnemy(ecs.commands, 320, 200, 'regular');
        ecs.update(0.1);
        const enemy = ecs.getEntitiesWithQuery(['enemy', 'health', 'position'])[0];
        if (!enemy) throw new Error('Missing enemy');
        expect(enemy.components.health.current).toBe(ENEMY.HP);
        for (let frame = 0; frame < 12 && enemy.components.health.current === ENEMY.HP; frame++) ecs.update(0.1);
        expect(enemy.components.health.current).toBe(ENEMY.HP - archetype(kind).attackDamage);
        const velocity = ecs.getComponent(ally.id, 'velocity');
        expect(velocity).toEqual({ x: 0, y: 0 });
        expect(ecs.getEntitiesWithQuery(['projectile'])).toHaveLength(0);
        ecs.update(archetype(kind).attackCooldownSec / 2);
        expect(enemy.components.health.current).toBe(ENEMY.HP - archetype(kind).attackDamage);
        ecs.update(archetype(kind).attackCooldownSec / 2 + 0.001);
        expect(enemy.components.health.current).toBe(ENEMY.HP - archetype(kind).attackDamage * 2);
        enemy.components.position.x = 600; // Beyond the leash: rejoin rather than pursue.
        ecs.update(1);
        expect(ecs.getComponent(ally.id, 'position')).toEqual({ x: 200 - ALLY.FOLLOW_DISTANCE, y: 200 - ALLY.FOLLOW_SPREAD });
        expect(enemy.components.health.current).toBe(ENEMY.HP - archetype(kind).attackDamage * 2);
      } finally {
        await ecs.dispose();
      }
    });

    test(`${kind} hits only in reach; Brawler cleaves forward while Duelist hits one`, async () => {
      const ecs = createGameEngine();
      try {
        addCombatSystem(ecs);
        await ecs.initialize();
        createAlly(ecs, 100, 100, kind, 0);
        for (const [x, y] of [[125, 100], [130, 110], [80, 100], [160, 100]] as const) createEnemy(ecs.commands, x, y, 'regular');
        ecs.update(0);
        const health = ecs.getEntitiesWithQuery(['enemy', 'health']).map(function (enemy) { return enemy.components.health.current; });
        // The closest target is behind: Brawler's arc faces it; Duelist hits only it.
        expect(health).toEqual([ENEMY.HP, ENEMY.HP, ENEMY.HP - archetype(kind).attackDamage, ENEMY.HP]);
        const enemies = ecs.getEntitiesWithQuery(['enemy', 'position', 'health']);
        const behind = enemies[2];
        if (!behind) throw new Error('Missing rear target');
        behind.components.health.current = 0;
        ecs.update(archetype(kind).attackCooldownSec);
        expect(enemies[0]?.components.health.current).toBe(ENEMY.HP - archetype(kind).attackDamage);
        expect(enemies[1]?.components.health.current).toBe(ENEMY.HP - (kind === 'brawler' ? archetype(kind).attackDamage : 0));
        expect(enemies[3]?.components.health.current).toBe(ENEMY.HP);
        expect(ecs.getEntitiesWithQuery(['projectile'])).toHaveLength(0);
      } finally {
        await ecs.dispose();
      }
    });
  }
});

describe('melee enemies', () => {
  for (const kind of ['brute', 'raider'] as const) {
    test(`${kind} approaches a nearby ally and attacks at melee cadence, without remote player damage`, async () => {
      const ecs = createGameEngine();
      try {
        addEnemyAISystem(ecs);
        await ecs.initialize();
        const player = createPlayer(ecs, 600, 200);
        const ally = createAlly(ecs, 200, 200, 'brawler', 0);
        createEnemy(ecs.commands, 300, 200, kind);
        ecs.update(0);
        const enemy = ecs.getEntitiesWithQuery(['enemy', 'health', 'position'])[0];
        if (!enemy) throw new Error('Missing enemy');
        expect(enemy.components.health.current).toBe(Math.round(ENEMY.HP * ENEMY_TYPES[kind].hpMultiplier));
        const allyHealth = ecs.getComponent(ally.id, 'health');
        if (!allyHealth) throw new Error('Missing ally health');
        for (let frame = 0; frame < 30 && allyHealth.current === allyHealth.max; frame++) ecs.update(0.1);
        expect(allyHealth.current).toBe(allyHealth.max - ENEMY_TYPES[kind].damage);
        expect(ecs.getComponent(player.id, 'health')?.current).toBe(PLAYER.MAX_HP);
        ecs.update(ENEMY_TYPES[kind].cooldownSec - 0.01);
        expect(allyHealth.current).toBe(allyHealth.max - ENEMY_TYPES[kind].damage);
        ecs.update(0.02);
        expect(allyHealth.current).toBe(allyHealth.max - ENEMY_TYPES[kind].damage * 2);
        ecs.removeEntity(ally.id);
        const before = enemy.components.position.x;
        ecs.update(0.1);
        expect(enemy.components.position.x).toBeGreaterThan(before);
      } finally {
        await ecs.dispose();
      }
    });

    test(`${kind} appears in normal ahead and rear packs`, async () => {
      const ecs = createGameEngine();
      const random = spyOn(Math, 'random').mockReturnValue(kind === 'brute' ? 0.1 : 0.3);
      try {
        addSpawnSystem(ecs);
        await ecs.initialize();
        createPlayer(ecs, 600, 200);
        ecs.setResource('spawnAheadAccumulator', 5);
        ecs.setResource('rearNextAt', 0);
        ecs.update(0);
        const enemies = ecs.getEntitiesWithQuery(['enemy', 'position']);
        expect(enemies.every(function (enemy) { return enemy.components.enemy.kind === kind; })).toBe(true);
        expect(enemies.some(function (enemy) { return enemy.components.position.x > 600; })).toBe(true);
        expect(enemies.some(function (enemy) { return enemy.components.position.x < 600; })).toBe(true);
      } finally {
        random.mockRestore();
        await ecs.dispose();
      }
    });
  }
});
