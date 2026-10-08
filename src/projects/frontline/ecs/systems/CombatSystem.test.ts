import { describe, expect, spyOn, test } from 'bun:test';
import { createGameEngine } from '../Engine';
import { createAlly, createEnemy, createPlayer } from '../entities';
import { addCombatSystem } from './CombatSystem';

describe('automatic gun tuning', () => {
  for (const [kind, previousCooldown] of [
    ['player', 0.35],
    ['rifleman', 0.42],
    ['gunner', 0.18],
  ] as const) {
    test(`${kind} fires 50% faster with bounded spread and unchanged bullet speed`, async () => {
      const ecs = createGameEngine();
      const randomSpy = spyOn(Math, 'random');
      try {
        addCombatSystem(ecs);
        await ecs.initialize();
        if (kind === 'player') createPlayer(ecs, 100, 100);
        else createAlly(ecs, 100, 100, kind, 0);
        createEnemy(ecs.commands, 300, 100, 'regular');
        ecs.update(0); // Flush enemy spawn and fire the opening shot.
        for (const bullet of ecs.getEntitiesWithQuery(['projectile'])) {
          ecs.removeEntity(bullet.id);
        }

        for (const [random, expectedAngle] of [[0, -3], [0.5, 0], [1, 3]] as const) {
          randomSpy.mockReturnValue(random);
          ecs.update(previousCooldown / 1.5 / 2);
          expect(ecs.getEntitiesWithQuery(['projectile'])).toHaveLength(0);
          ecs.update(previousCooldown / 1.5 / 2);
          const bullets = ecs.getEntitiesWithQuery(['projectile']);
          expect(bullets).toHaveLength(1);
          for (const bullet of bullets) {
            const { vx, vy, speed } = bullet.components.projectile;
            expect(Math.atan2(vy, vx) * 180 / Math.PI).toBeCloseTo(expectedAngle, 8);
            expect(Math.hypot(vx, vy)).toBeCloseTo(speed, 8);
            ecs.removeEntity(bullet.id);
          }
          ecs.update(0); // No extra shot before the cooldown expires.
          expect(ecs.getEntitiesWithQuery(['projectile'])).toHaveLength(0);
        }
      } finally {
        randomSpy.mockRestore();
        ecs.dispose();
      }
    });
  }

  test('marksman shots retain precise aim and their existing cadence', async () => {
    const ecs = createGameEngine();
    const randomSpy = spyOn(Math, 'random').mockReturnValue(0);
    try {
      addCombatSystem(ecs);
      await ecs.initialize();
      createAlly(ecs, 100, 100, 'marksman', 0);
      createEnemy(ecs.commands, 300, 100, 'regular');
      ecs.update(0);
      ecs.update(0);
      const bullets = ecs.getEntitiesWithQuery(['projectile']);
      expect(bullets).toHaveLength(1);
      for (const bullet of bullets) {
        expect(bullet.components.projectile.vy).toBe(0);
        ecs.removeEntity(bullet.id);
      }
      ecs.update(0.94);
      expect(ecs.getEntitiesWithQuery(['projectile'])).toHaveLength(0);
      ecs.update(0.02);
      expect(ecs.getEntitiesWithQuery(['projectile'])).toHaveLength(1);
    } finally {
      randomSpy.mockRestore();
      ecs.dispose();
    }
  });
});
