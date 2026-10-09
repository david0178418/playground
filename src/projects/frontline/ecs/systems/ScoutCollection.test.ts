import { expect, test } from 'bun:test';
import { ALLY, SCOUT } from '../../config';
import { createGameEngine } from '../Engine';
import { createAlly, createExperienceDrop, createPlayer, createScavengeToken } from '../entities';
import { chooseLevelUpUnit } from '../progression';
import { addPickupSystem } from './PickupSystem';
import { addSquadFollowSystem } from './SquadFollowSystem';

test('Scout leaves formation, collects XP and tokens for the player, then returns', async () => {
  const ecs = createGameEngine();
  try {
    addSquadFollowSystem(ecs);
    addPickupSystem(ecs);
    await ecs.initialize();
    createPlayer(ecs, 400, 240);
    const scout = createAlly(ecs, 400 - ALLY.FOLLOW_DISTANCE, 240 - ALLY.FOLLOW_SPREAD, 'scout', 0);
    createExperienceDrop(ecs.commands, 550, 240, 10);
    createExperienceDrop(ecs.commands, 570, 240, 15);
    createScavengeToken(ecs.commands, 600, 240, 'rifleman');
    createScavengeToken(ecs.commands, 600, 250, 'rifleman');
    ecs.update(0);
    ecs.update(0.1);
    expect(ecs.getComponent(scout.id, 'position')?.x).toBeGreaterThan(400 - ALLY.FOLLOW_DISTANCE);
    for (let frame = 0; frame < 50; frame++) ecs.update(0.05);
    expect(ecs.getResource('progression').experience).toBe(25);
    expect(ecs.getResource('bankedTokens')).toBe(2);
    expect(ecs.getEntitiesWithQuery(['experienceDrop'])).toHaveLength(0);
    expect(ecs.getEntitiesWithQuery(['scavengeToken'])).toHaveLength(0);
    expect(ecs.getComponent(scout.id, 'position')).toEqual({ x: 400 - ALLY.FOLLOW_DISTANCE, y: 240 - ALLY.FOLLOW_SPREAD });
    expect(ecs.getComponent(scout.id, 'velocity')).toEqual({ x: 0, y: 0 });
  } finally {
    await ecs.dispose();
  }
});

test('Scout chooses the nearest resource, respects the player leash, and freezes during level-up', async () => {
  const ecs = createGameEngine();
  try {
    addSquadFollowSystem(ecs);
    await ecs.initialize();
    const player = createPlayer(ecs, 400, 240);
    const scout = createAlly(ecs, 358, 212, 'scout', 0);
    createExperienceDrop(ecs.commands, 500, 212, 10);
    createScavengeToken(ecs.commands, 300, 212, 'rifleman');
    createExperienceDrop(ecs.commands, 400 + SCOUT.COLLECT_RANGE + 1, 240, 10);
    ecs.update(0);
    ecs.update(0.1);
    expect(ecs.getComponent(scout.id, 'position')?.x).toBeLessThan(358);
    const scoutPosition = ecs.getComponent(scout.id, 'position');
    if (!scoutPosition) throw new Error('Missing Scout position');
    const beforePause = { ...scoutPosition };
    ecs.setResource('phase', 'levelUp');
    ecs.update(1);
    expect(ecs.getComponent(scout.id, 'position')).toEqual(beforePause);
    ecs.setResource('phase', 'playing');
    const position = ecs.getComponent(player.id, 'position');
    if (!position) throw new Error('Missing player position');
    position.x = 1300;
    ecs.update(5);
    expect(ecs.getComponent(scout.id, 'position')).toEqual({ x: 1300 - ALLY.FOLLOW_DISTANCE, y: 240 - ALLY.FOLLOW_SPREAD });
  } finally {
    await ecs.dispose();
  }
});

test('only one Scout pursues each XP drop', async () => {
  const ecs = createGameEngine();
  try {
    addSquadFollowSystem(ecs);
    await ecs.initialize();
    createPlayer(ecs, 400, 240);
    const firstScout = createAlly(ecs, 358, 212, 'scout', 0);
    const secondScout = createAlly(ecs, 358, 268, 'scout', 1);
    createExperienceDrop(ecs.commands, 600, 240, 10);
    ecs.update(0);
    ecs.update(0.1);

    expect(ecs.getComponent(firstScout.id, 'position')?.x).toBeGreaterThan(358);
    expect(ecs.getComponent(secondScout.id, 'position')).toEqual({ x: 358, y: 268 });
  } finally {
    await ecs.dispose();
  }
});

test('only living Scouts collect, and overlapping player/Scouts credit each resource once', async () => {
  const ecs = createGameEngine();
  try {
    addPickupSystem(ecs);
    await ecs.initialize();
    createPlayer(ecs, 400, 240);
    createAlly(ecs, 600, 240, 'rifleman', 0);
    const deadScout = createAlly(ecs, 600, 240, 'scout', 1);
    const health = ecs.getComponent(deadScout.id, 'health');
    if (!health) throw new Error('Missing Scout health');
    health.current = 0;
    createExperienceDrop(ecs.commands, 600, 240, 10);
    createScavengeToken(ecs.commands, 600, 240, 'rifleman');
    ecs.update(0);
    ecs.update(0);
    expect(ecs.getResource('progression').experience).toBe(0);
    expect(ecs.getResource('bankedTokens')).toBe(0);
    createAlly(ecs, 600, 240, 'scout', 2);
    createAlly(ecs, 600, 240, 'scout', 3);
    ecs.update(0);
    expect(ecs.getResource('progression').experience).toBe(10);
    expect(ecs.getResource('bankedTokens')).toBe(1);
    createAlly(ecs, 400, 240, 'scout', 4);
    createExperienceDrop(ecs.commands, 400, 240, 10);
    createScavengeToken(ecs.commands, 400, 240, 'rifleman');
    ecs.update(0);
    expect(ecs.getResource('progression').experience).toBe(20);
    expect(ecs.getResource('bankedTokens')).toBe(2);
  } finally {
    await ecs.dispose();
  }
});

test('remote Scout XP triggers the normal level-up choice and resumes after recruitment', async () => {
  const ecs = createGameEngine();
  try {
    addPickupSystem(ecs);
    await ecs.initialize();
    createPlayer(ecs, 400, 240);
    createAlly(ecs, 600, 240, 'scout', 0);
    createExperienceDrop(ecs.commands, 600, 240, 50);
    ecs.update(0);
    expect(ecs.getResource('phase')).toBe('levelUp');
    expect(ecs.getResource('progression')).toMatchObject({ level: 2, experience: 0 });
    const [choice] = ecs.getResource('progression').choices;
    if (!choice) throw new Error('Missing level-up choice');
    chooseLevelUpUnit(ecs, choice);
    expect(ecs.getResource('phase')).toBe('playing');
    expect(ecs.getEntitiesWithQuery(['ally'])).toHaveLength(2);
  } finally {
    await ecs.dispose();
  }
});

test('Scout ignores a lone drop outside the collection leash', async () => {
  const ecs = createGameEngine();
  try {
    addSquadFollowSystem(ecs);
    addPickupSystem(ecs);
    await ecs.initialize();
    createPlayer(ecs, 400, 240);
    const scout = createAlly(ecs, 358, 212, 'scout', 0);
    createExperienceDrop(ecs.commands, 400 + SCOUT.COLLECT_RANGE + 1, 240, 10);
    ecs.update(0);
    for (let frame = 0; frame < 30; frame++) ecs.update(0.1);
    expect(ecs.getComponent(scout.id, 'position')).toEqual({ x: 358, y: 212 });
    expect(ecs.getResource('progression').experience).toBe(0);
    expect(ecs.getEntitiesWithQuery(['experienceDrop'])).toHaveLength(1);
  } finally {
    await ecs.dispose();
  }
});
