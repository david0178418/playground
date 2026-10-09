import type { AllComponents } from './types';

export const playerQuery = {
  with: ['player', 'position', 'velocity', 'health', 'attacker'] as const satisfies readonly (keyof AllComponents)[],
};

export const allyQuery = {
  with: ['ally', 'position', 'velocity', 'health', 'attacker'] as const satisfies readonly (keyof AllComponents)[],
};

export const enemyQuery = {
  with: ['enemy', 'position', 'health'] as const satisfies readonly (keyof AllComponents)[],
};

export const projectileQuery = {
  with: ['projectile', 'position'] as const satisfies readonly (keyof AllComponents)[],
};

export const tokenQuery = {
  with: ['scavengeToken', 'position'] as const satisfies readonly (keyof AllComponents)[],
};

export const experienceQuery = {
  with: ['experienceDrop', 'position'] as const satisfies readonly (keyof AllComponents)[],
};

export const doorQuery = {
  with: ['door', 'position', 'renderable'] as const satisfies readonly (keyof AllComponents)[],
};
