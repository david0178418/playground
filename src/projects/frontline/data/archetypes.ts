/**
 * Ally archetypes.
 * v1 offer pool spawns: Rifleman, Breacher, Marksman.
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
  /** True = can appear in v1 recruit crates */
  v1Offer: boolean;
  /** crowd-clear | single-target | baseline | support | absorb */
  compositionTag: 'baseline' | 'crowd-clear' | 'single-target' | 'support' | 'absorb' | 'breakthrough' | 'runner';
  color: string;
  maxHp: number;
  attackRange: number;
  attackDamage: number;
  attackCooldownSec: number;
  projectileSpeed: number;
  /** Cone half-angle degrees for breacher-style; 0 = point */
  coneHalfDeg: number;
  attackStyle: AttackStyle;
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypeDef> = {
  rifleman: {
    id: 'rifleman',
    name: 'Rifleman',
    role: 'Baseline DPS',
    v1Offer: true,
    compositionTag: 'baseline',
    color: '#81c784',
    maxHp: 75,
    attackRange: 280,
    attackDamage: 14,
    attackCooldownSec: 0.42,
    projectileSpeed: 520,
    coneHalfDeg: 0,
    attackStyle: 'projectile',
  },
  breacher: {
    id: 'breacher',
    name: 'Breacher',
    role: 'Close clear',
    v1Offer: true,
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
    v1Offer: true,
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
    v1Offer: false,
    compositionTag: 'crowd-clear',
    color: '#90a4ae',
    maxHp: 60,
    attackRange: 240,
    attackDamage: 6,
    attackCooldownSec: 0.18,
    projectileSpeed: 500,
    coneHalfDeg: 12,
    attackStyle: 'projectile',
  },
  shieldbearer: {
    id: 'shieldbearer',
    name: 'Shieldbearer',
    role: 'Absorb / frontline',
    v1Offer: false,
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
    v1Offer: false,
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
    v1Offer: false,
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
    v1Offer: false,
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

/** Archetypes that can spawn in v1 recruit offers. */
export const V1_OFFER_ARCHETYPES: ArchetypeId[] = (
  Object.values(ARCHETYPES)
    .filter(a => a.v1Offer)
    .map(a => a.id)
);

export function archetype(id: ArchetypeId): ArchetypeDef {
  return ARCHETYPES[id];
}
