import { describe, expect, spyOn, test } from 'bun:test';
import { DOOR } from '../../config';
import { waveDef, type WaveId } from '../../data/waves';
import { createGameEngine } from '../Engine';
import { createPlayer } from '../entities';
import { addSpawnSystem } from './SpawnSystem';

describe('opponent packs grow toward the goal', () => {
  for (const waveId of [1, 2, 3] as const) {
    test(`wave ${waveId} increases both pack bounds and rear chasers`, async () => {
      const sample = async function (x: number, random: number, frontX = 200) {
        const ecs = createGameEngine();
        const randomSpy = spyOn(Math, 'random').mockReturnValue(random);
        try {
          addSpawnSystem(ecs);
          await ecs.initialize();
          createPlayer(ecs, x, 240);
          ecs.setResource('waveId', waveId);
          ecs.setResource('frontX', frontX);
          ecs.setResource('waveElapsed', waveDef(waveId).rearFirstAtSec);
          ecs.setResource('rearNextAt', 0);
          ecs.setResource('spawnAheadAccumulator', 4);
          ecs.update(0);
          const enemies = ecs.getEntitiesWithQuery(['enemy']);
          const expectedHp = { 1: 120, 2: 150, 3: 180 }[waveId];
          for (const enemy of enemies) {
            expect(enemy.components.health).toEqual({ current: expectedHp, max: expectedHp });
            expect(enemy.components.enemy.hp).toBe(expectedHp);
            expect(enemy.components.enemy.maxHp).toBe(expectedHp);
          }
          return {
            ahead: enemies.filter(function (enemy) {
              return enemy.components.enemy.kind === 'regular';
            }).length,
            rear: enemies.filter(function (enemy) {
              return enemy.components.enemy.kind === 'chase';
            }).length,
          };
        } finally {
          randomSpy.mockRestore();
          ecs.dispose();
        }
      };

      for (const random of [0, 0.999]) {
        const start = await sample(200, random);
        const middle = await sample(DOOR.X / 2, random);
        const goal = await sample(DOOR.X - 50, random);
        expect(start.ahead).toBeGreaterThan(0);
        expect(middle.ahead).toBe(start.ahead + 2);
        expect(goal.ahead).toBe(start.ahead + 4);
        expect(middle.rear).toBe(start.rear + 2);
        expect(goal.rear).toBe(start.rear + 4);
        expect(await sample(200, random, DOOR.X - 50)).toEqual(goal);
        expect(await sample(DOOR.X + 200, random)).toEqual(goal);
      }
    });
  }

  test('a new wave starts with its base pack sizes', async () => {
    const waveId: WaveId = 1;
    const ecs = createGameEngine();
    try {
      addSpawnSystem(ecs);
      await ecs.initialize();
      createPlayer(ecs, 200, 240);
      ecs.setResource('waveId', waveId);
      ecs.setResource('spawnAheadAccumulator', 4.6);
      ecs.update(0);
      const count = ecs.getEntitiesWithQuery(['enemy']).length;
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(3);
    } finally {
      ecs.dispose();
    }
  });
});
