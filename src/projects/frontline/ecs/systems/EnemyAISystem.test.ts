import { describe, expect, test } from 'bun:test';
import { routeDamageToSquadThenPlayer } from './EnemyAISystem';

describe('routeDamageToSquadThenPlayer', () => {
  test('nearest living ally absorbs before player', () => {
    const deaths: number[] = [];
    const allies = [
      {
        id: 1,
        components: {
          position: { x: 100, y: 0 },
          health: { current: 20, max: 20 },
          ally: { archetypeId: 'rifleman' as const },
        },
      },
      {
        id: 2,
        components: {
          position: { x: 50, y: 0 },
          health: { current: 20, max: 20 },
          ally: { archetypeId: 'breacher' as const },
        },
      },
    ];
    const player = {
      id: 99,
      components: {
        position: { x: 0, y: 0 },
        health: { current: 100 },
      },
    };

    routeDamageToSquadThenPlayer(10, allies, player, 40, 0, a => deaths.push(a.id), 0);

    expect(allies[1]!.components.health.current).toBe(10); // nearer ally (id 2 at x=50)
    expect(allies[0]!.components.health.current).toBe(20);
    expect(player.components.health.current).toBe(100);
    expect(deaths).toEqual([]);
  });

  test('player takes damage when no allies remain', () => {
    const player = {
      id: 99,
      components: {
        position: { x: 0, y: 0 },
        health: { current: 100 },
      },
    };
    routeDamageToSquadThenPlayer(15, [], player, 0, 0, () => {}, 1000);
    expect(player.components.health.current).toBe(85);
  });
});
