/**
 * Ally archetypes.
 * Level-up pool: Rifleman, Breacher, Marksman, Gunner, Shieldbearer, Scout.
 * Others are data-ready only (not in offer weights).
 */

export type ArchetypeId =
  | 'rifleman'
  | 'breacher'
  | 'marksman'
  | 'gunner'
  | 'shieldbearer'
  | 'medic'
  | 'demo'
  | 'scout';

export type AttackStyle = 'hitscan' | 'projectile' | 'cone' | 'aura';

export interface ArchetypeDef {
  id: ArchetypeId;
  name: string;
  role: string;
  /** True = can appear in level-up choices */
  recruitable: boolean;
  /** crowd-clear | single-target | baseline | support | absorb */
  compositionTag: 'baseline' | 'crowd-clear' | 'single-target' | 'support' | 'absorb' | 'breakthrough' | 'runner';
  color: string;
  maxHp: number;
  attackRange: number;
  attackDamage: number;
  attackCooldownSec: number;
  projectileSpeed: number;
  /** Random projectile aim offset, in degrees on either side of the target. */
  shotSpreadHalfDeg?: number;
  /** Cone half-angle degrees for breacher-style; 0 = point */
  coneHalfDeg: number;
  attackStyle: AttackStyle;
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypeDef> = {
  rifleman: {
    id: 'rifleman',
    name: 'Rifleman',
    role: 'Baseline DPS',
    recruitable: true,
    compositionTag: 'baseline',
    color: '#81c784',
    maxHp: 75,
    attackRange: 280,
    attackDamage: 14,
    attackCooldownSec: 0.42 / 3,
    shotSpreadHalfDeg: 3,
    projectileSpeed: 1040,
    coneHalfDeg: 0,
    attackStyle: 'projectile',
  },
  breacher: {
    id: 'breacher',
    name: 'Breacher',
    role: 'Close clear',
    recruitable: true,
    compositionTag: 'crowd-clear',
    color: '#ff8a65',
    maxHp: 90,
    attackRange: 120,
    attackDamage: 22,
    attackCooldownSec: 0.65,
    projectileSpeed: 0,
    coneHalfDeg: 42,
    attackStyle: 'cone',
  },
  marksman: {
    id: 'marksman',
    name: 'Marksman',
    role: 'Single-target',
    recruitable: true,
    compositionTag: 'single-target',
    color: '#ba68c8',
    maxHp: 55,
    attackRange: 440,
    attackDamage: 36,
    attackCooldownSec: 0.95,
    projectileSpeed: 740,
    coneHalfDeg: 0,
    attackStyle: 'projectile',
  },
  gunner: {
    id: 'gunner',
    name: 'Gunner',
    role: 'Sustained MG',
    recruitable: true,
    compositionTag: 'crowd-clear',
    color: '#90a4ae',
    maxHp: 60,
    attackRange: 240,
    attackDamage: 6,
    attackCooldownSec: 0.18 / 3,
    shotSpreadHalfDeg: 3,
    projectileSpeed: 1000,
    coneHalfDeg: 12,
    attackStyle: 'projectile',
  },
  shieldbearer: {
    id: 'shieldbearer',
    name: 'Shieldbearer',
    role: 'Absorb / frontline',
    recruitable: true,
    compositionTag: 'absorb',
    color: '#64b5f6',
    maxHp: 120,
    attackRange: 80,
    attackDamage: 4,
    attackCooldownSec: 1.0,
    projectileSpeed: 0,
    coneHalfDeg: 0,
    attackStyle: 'hitscan',
  },
  medic: {
    id: 'medic',
    name: 'Medic',
    role: 'Support',
    recruitable: false,
    compositionTag: 'support',
    color: '#a5d6a7',
    maxHp: 45,
    attackRange: 200,
    attackDamage: 4,
    attackCooldownSec: 0.8,
    projectileSpeed: 400,
    coneHalfDeg: 0,
    attackStyle: 'aura',
  },
  demo: {
    id: 'demo',
    name: 'Demo',
    role: 'Explosive / breakthrough',
    recruitable: false,
    compositionTag: 'breakthrough',
    color: '#ffb74d',
    maxHp: 50,
    attackRange: 180,
    attackDamage: 35,
    attackCooldownSec: 1.6,
    projectileSpeed: 280,
    coneHalfDeg: 0,
    attackStyle: 'projectile',
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    role: 'Runner / map agency',
    recruitable: true,
    compositionTag: 'runner',
    color: '#80cbc4',
    maxHp: 35,
    attackRange: 200,
    attackDamage: 8,
    attackCooldownSec: 0.4,
    projectileSpeed: 520,
    coneHalfDeg: 0,
    attackStyle: 'projectile',
  },
};

/** Archetypes eligible for recruitment. */
export const RECRUITABLE_ARCHETYPES: ArchetypeId[] = (
  Object.values(ARCHETYPES)
    .filter(a => a.recruitable)
    .map(a => a.id)
);

export function archetype(id: ArchetypeId): ArchetypeDef {
  return ARCHETYPES[id];
}
