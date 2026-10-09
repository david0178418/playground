import { ENEMY } from '../config';

export type EnemyKind = 'regular' | 'chase' | 'brute' | 'raider';

interface EnemyDef {
  name: string;
  label: string;
  color: string;
  hpMultiplier: number;
  speed: number;
  damage: number;
  range: number;
  cooldownSec: number;
  engagesAllies: boolean;
}

export const ENEMY_TYPES: Record<EnemyKind, EnemyDef> = {
  regular: {
    name: 'Regular', label: 'EN', color: ENEMY.COLOR,
    hpMultiplier: 1, speed: ENEMY.SPEED, damage: ENEMY.DAMAGE,
    range: ENEMY.CONTACT_RANGE, cooldownSec: ENEMY.ATTACK_COOLDOWN_SEC,
    engagesAllies: false,
  },
  chase: {
    name: 'Chaser', label: 'CH', color: '#ef5350',
    hpMultiplier: 1, speed: ENEMY.SPEED * 1.2, damage: ENEMY.DAMAGE,
    range: ENEMY.CONTACT_RANGE, cooldownSec: ENEMY.ATTACK_COOLDOWN_SEC,
    engagesAllies: false,
  },
  brute: {
    name: 'Brute', label: 'BRU', color: '#ff7043',
    hpMultiplier: 1.5, speed: 42, damage: 14,
    range: 36, cooldownSec: 1.4, engagesAllies: true,
  },
  raider: {
    name: 'Raider', label: 'RAI', color: '#e040fb',
    hpMultiplier: 0.75, speed: 90, damage: 5,
    range: 28, cooldownSec: 0.55, engagesAllies: true,
  },
};

/** Half the pack remains its original type, with both melee types mixed in. */
export const rollEnemyKind = function (rear: boolean, random: number = Math.random()): EnemyKind {
  if (random < 0.25) return 'brute';
  if (random < 0.5) return 'raider';
  return rear ? 'chase' : 'regular';
};
