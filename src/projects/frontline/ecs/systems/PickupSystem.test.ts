import { expect, test } from 'bun:test';
import { createTimer } from 'ecspresso/plugins/scripting/timers';
import { RECRUITABLE_ARCHETYPES } from '../../data/archetypes';
import { createGameEngine } from '../Engine';
import { createAlly, createEnemy, createExperienceDrop, createPlayer } from '../entities';
import { chooseLevelUpUnit, rollUnitChoices } from '../progression';
import { restartRun, startWave } from '../waveLifecycle';
import { addPickupSystem } from './PickupSystem';
import { addWaveSystem } from './WaveSystem';

const selectFirstChoice = function (ecs: ReturnType<typeof createGameEngine>): void {
  const [choice] = ecs.getResource('progression').choices;
  if (!choice) throw new Error('Expected a level-up choice');
  chooseLevelUpUnit(ecs, choice);
};

test('enemy deaths drop XP once; collection pauses, offers three units, and resumes after selection', async () => {
  const ecs = createGameEngine();
  try {
    addPickupSystem(ecs);
    addWaveSystem(ecs);
    await ecs.initialize();
    createPlayer(ecs, 100, 100);
    for (let i = 0; i < 5; i++) createEnemy(ecs.commands, 100, 100, 'regular');
    ecs.update(0);
    for (const enemy of ecs.getEntitiesWithQuery(['enemy', 'health'])) enemy.components.health.current = 0;
    ecs.update(0);
    expect(ecs.getEntitiesWithQuery(['enemy'])).toHaveLength(0);
    expect(ecs.getEntitiesWithQuery(['experienceDrop'])).toHaveLength(5);
    expect(ecs.getResource('coins')).toBe(15);
    ecs.update(0);
    expect(ecs.getEntitiesWithQuery(['experienceDrop'])).toHaveLength(0);
    expect(ecs.getResource('progression')).toMatchObject({ level: 2, experience: 0 });
    const choices = ecs.getResource('progression').choices;
    expect(choices).toHaveLength(3);
    expect(new Set(choices).size).toBe(3);
    expect(ecs.getResource('phase')).toBe('levelUp');
    const timerEntity = ecs.spawn({ timers: { attack: createTimer(10) } });
    ecs.update(1);
    expect(timerEntity.components.timers.attack?.elapsed).toBe(0);
    expect(ecs.getResource('waveElapsed')).toBe(0);
    chooseLevelUpUnit(ecs, 'medic'); // not offered
    expect(ecs.getResource('phase')).toBe('levelUp');
    selectFirstChoice(ecs);
    expect(ecs.getEntitiesWithQuery(['ally'])).toHaveLength(1);
    expect(ecs.getResource('stats').alliesRecruited).toBe(1);
    expect(ecs.getResource('phase')).toBe('playing');
    chooseLevelUpUnit(ecs, choices[0] ?? 'rifleman'); // stale click cannot recruit twice
    expect(ecs.getEntitiesWithQuery(['ally'])).toHaveLength(1);
    ecs.update(1);
    expect(timerEntity.components.timers.attack?.elapsed).toBe(1);
    expect(ecs.getResource('waveElapsed')).toBe(1);
    expect(ecs.getResource('stats').enemiesKilled).toBe(5);
  } finally {
    await ecs.dispose();
  }
});

test('XP overflow queues multiple choices, recruitment exceeds five, waves preserve XP, restart resets', async () => {
  const ecs = createGameEngine();
  try {
    addPickupSystem(ecs);
    await ecs.initialize();
    restartRun(ecs);
    createExperienceDrop(ecs.commands, 180, 240, 1000);
    ecs.update(0);
    ecs.update(0);
    let selections = 0;
    while (ecs.getResource('phase') === 'levelUp') {
      selectFirstChoice(ecs);
      selections++;
      if (selections > 20) throw new Error('Level-up queue did not drain');
    }
    expect(selections).toBe(8);
    expect(ecs.getResource('progression')).toEqual({ level: 9, experience: 40, choices: [] });
    expect(ecs.getEntitiesWithQuery(['ally'])).toHaveLength(9);
    const beforeWave = ecs.getResource('progression');
    startWave(ecs, 2, false);
    expect(ecs.getResource('progression')).toEqual(beforeWave);
    restartRun(ecs);
    expect(ecs.getResource('progression')).toEqual({ level: 1, experience: 0, choices: [] });
    expect(ecs.getEntitiesWithQuery(['ally'])).toHaveLength(1);
    expect(ecs.getResource('stats').alliesRecruited).toBe(0);
  } finally {
    await ecs.dispose();
  }
});

test('six recruitable types are reachable and each roll contains three distinct types', () => {
  expect(RECRUITABLE_ARCHETYPES).toHaveLength(6);
  const reached = new Set<string>();
  for (let index = 0; index < 6; index++) {
    const choices = rollUnitChoices(() => (index + 0.1) / 6);
    expect(choices).toHaveLength(3);
    expect(new Set(choices).size).toBe(3);
    choices.forEach(id => reached.add(id));
  }
  expect(reached.size).toBe(6);
});

test('lethal damage wins over a simultaneous XP pickup', async () => {
  const ecs = createGameEngine();
  try {
    addPickupSystem(ecs);
    addWaveSystem(ecs);
    await ecs.initialize();
    const player = createPlayer(ecs, 100, 100);
    createExperienceDrop(ecs.commands, 100, 100, 50);
    const health = ecs.getComponent(player.id, 'health');
    if (!health) throw new Error('Missing player health');
    health.current = 0;
    ecs.update(0);
    expect(ecs.getResource('phase')).toBe('lost');
  } finally {
    await ecs.dispose();
  }
});


test('recruitment reuses a vacant formation slot after a middle ally dies', async () => {
  const ecs = createGameEngine();
  try {
    addPickupSystem(ecs);
    await ecs.initialize();
    createPlayer(ecs, 100, 100);
    createAlly(ecs, 100, 100, 'rifleman', 0);
    const middle = createAlly(ecs, 100, 100, 'rifleman', 1);
    createAlly(ecs, 100, 100, 'rifleman', 2);
    ecs.removeEntity(middle.id);
    createExperienceDrop(ecs.commands, 100, 100, 50);
    ecs.update(0);
    selectFirstChoice(ecs);
    expect(ecs.getEntitiesWithQuery(['ally']).map(ally => ally.components.ally.formationIndex).sort()).toEqual([0, 1, 2]);
  } finally {
    await ecs.dispose();
  }
});
