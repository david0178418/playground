import { EXPERIENCE } from '../config';
import { RECRUITABLE_ARCHETYPES, type ArchetypeId } from '../data/archetypes';
import type { GameEngine } from './Engine';
import { createAlly } from './entities';

export const experienceForLevel = function (level: number): number {
  return EXPERIENCE.FIRST_LEVEL_COST + (level - 1) * EXPERIENCE.COST_GROWTH;
};

/** Uniform sampling without replacement; duplicates may appear on later levels. */
export const rollUnitChoices = function (random: () => number = Math.random): ArchetypeId[] {
  const pool = [...RECRUITABLE_ARCHETYPES];
  const choices: ArchetypeId[] = [];
  while (choices.length < 3 && pool.length > 0) {
    const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
    const [choice] = pool.splice(index, 1);
    if (choice) choices.push(choice);
  }
  return choices;
};

/** Open one choice at a time, retaining XP overflow for subsequent levels. */
export const beginLevelUp = function (ecs: GameEngine): void {
  if (ecs.getResource('phase') !== 'playing') return;
  const progression = ecs.getResource('progression');
  const cost = experienceForLevel(progression.level);
  if (progression.experience < cost) return;
  ecs.setResource('progression', {
    level: progression.level + 1,
    experience: progression.experience - cost,
    choices: rollUnitChoices(),
  });
  ecs.disableSystemGroup('timers');
  ecs.setResource('phase', 'levelUp');
};

export const chooseLevelUpUnit = function (ecs: GameEngine, id: ArchetypeId): void {
  if (ecs.getResource('phase') !== 'levelUp') return;
  const progression = ecs.getResource('progression');
  if (!progression.choices.includes(id)) return;
  const [player] = ecs.getEntitiesWithQuery(['player', 'position', 'health']);
  if (!player || player.components.health.current <= 0) return;
  const allies = ecs.getEntitiesWithQuery(['ally', 'health'])
    .filter(ally => ally.components.health.current > 0);
  const living = allies.length;
  const occupied = new Set(allies.map(ally => ally.components.ally.formationIndex));
  let formationIndex = 0;
  while (occupied.has(formationIndex)) formationIndex++;
  createAlly(ecs, player.components.position.x - 30, player.components.position.y, id, formationIndex);
  const stats = ecs.getResource('stats');
  ecs.setResource('stats', { ...stats, alliesRecruited: stats.alliesRecruited + 1, alliesAlive: living + 1 });
  ecs.setResource('progression', { ...progression, choices: [] });
  ecs.setResource('phase', 'playing');
  ecs.enableSystemGroup('timers');
  beginLevelUp(ecs);
};
