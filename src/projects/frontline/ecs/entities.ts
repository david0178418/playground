import { ALLY, DOOR, ENEMY, PLAYER, SCAVENGE } from '../config';
import { ENEMY_TYPES, type EnemyKind } from '../data/enemies';
import { archetype, type ArchetypeId } from '../data/archetypes';
import type { GameEngine } from './Engine';
import type { AllComponents } from './types';

export function createPlayer(ecs: GameEngine, x: number, y: number): { id: number } {
  return ecs.spawn({
    position: { x, y },
    velocity: { x: 0, y: 0 },
    player: { maxHp: PLAYER.MAX_HP },
    health: { current: PLAYER.MAX_HP, max: PLAYER.MAX_HP },
    attacker: {
      range: PLAYER.ATTACK_RANGE,
      damage: PLAYER.ATTACK_DAMAGE,
      cooldownSec: PLAYER.ATTACK_COOLDOWN_SEC,
      projectileSpeed: PLAYER.PROJECTILE_SPEED,
      shotSpreadHalfDeg: PLAYER.SHOT_SPREAD_HALF_DEG,
      coneHalfDeg: 0,
      style: 'projectile',
      cooldownLeft: 0,
    },
    collider: { radius: PLAYER.RADIUS },
    renderable: {
      shape: 'unit',
      color: PLAYER.COLOR,
      radius: PLAYER.RADIUS,
      label: 'YOU',
    },
    timers: {},
  } satisfies Partial<AllComponents>);
}

export function createAlly(
  ecs: GameEngine,
  x: number,
  y: number,
  archetypeId: ArchetypeId,
  formationIndex: number,
): { id: number } {
  const def = archetype(archetypeId);
  return ecs.spawn({
    position: { x, y },
    velocity: { x: 0, y: 0 },
    ally: { archetypeId, formationIndex },
    health: { current: def.maxHp, max: def.maxHp },
    attacker: {
      range: def.attackRange,
      damage: def.attackDamage,
      cooldownSec: def.attackCooldownSec,
      projectileSpeed: def.projectileSpeed,
      shotSpreadHalfDeg: def.shotSpreadHalfDeg ?? 0,
      coneHalfDeg: def.coneHalfDeg,
      style: def.attackStyle,
      cooldownLeft: 0,
    },
    collider: { radius: ALLY.RADIUS },
    renderable: {
      shape: 'unit',
      color: def.color,
      radius: ALLY.RADIUS,
      label: def.name.slice(0, 3).toUpperCase(),
    },
    timers: {},
  } satisfies Partial<AllComponents>);
}

export function createEnemy(
  commands: GameEngine['commands'],
  x: number,
  y: number,
  kind: EnemyKind,
  hpScale = 1,
): void {
  const def = ENEMY_TYPES[kind];
  const hp = Math.round(ENEMY.HP * hpScale * def.hpMultiplier);
  commands.spawn({
    position: { x, y },
    velocity: { x: 0, y: 0 },
    enemy: {
      kind,
      hp,
      maxHp: hp,
      damage: def.damage,
    },
    health: { current: hp, max: hp },
    collider: { radius: ENEMY.RADIUS },
    renderable: {
      shape: 'unit',
      color: def.color,
      radius: ENEMY.RADIUS,
      label: def.label,
    },
    timers: {},
  } satisfies Partial<AllComponents>);
}

export function createScavengeToken(
  commands: GameEngine['commands'],
  x: number,
  y: number,
  archetypeId: ArchetypeId,
): void {
  commands.spawn({
    position: { x, y },
    scavengeToken: { archetypeId, banked: false },
    collider: { radius: SCAVENGE.TOKEN_RADIUS },
    renderable: {
      shape: 'token',
      color: SCAVENGE.COLOR,
      radius: SCAVENGE.TOKEN_RADIUS,
      label: 'TOK',
    },
  } satisfies Partial<AllComponents>);
}

export const createExperienceDrop = function (
  commands: GameEngine['commands'],
  x: number,
  y: number,
  amount: number,
): void {
  commands.spawn({
    position: { x, y },
    experienceDrop: { amount },
    renderable: {
      shape: 'token',
      color: '#4dd0e1',
      radius: 8,
      label: 'XP',
    },
  } satisfies Partial<AllComponents>);
};

export function createDoor(ecs: GameEngine, x: number, y: number): { id: number } {
  return ecs.spawn({
    position: { x, y },
    door: { open: false },
    renderable: {
      shape: 'door',
      color: DOOR.COLOR_CLOSED,
      width: DOOR.WIDTH,
      height: DOOR.HEIGHT,
      label: 'EXIT',
    },
  } satisfies Partial<AllComponents>);
}

export function createProjectile(
  commands: GameEngine['commands'],
  x: number,
  y: number,
  vx: number,
  vy: number,
  damage: number,
  speed: number,
  fromAlly: boolean,
): void {
  commands.spawn({
    position: { x, y },
    projectile: {
      damage,
      speed,
      vx,
      vy,
      lifetime: 1.2,
      fromAlly,
    },
    renderable: {
      shape: 'circle',
      color: fromAlly ? '#fff59d' : '#ffab91',
      radius: 4,
    },
  } satisfies Partial<AllComponents>);
}
