import type { Timer, TimerComponentTypes } from 'ecspresso/plugins/scripting/timers';
import type { EnemyKind } from '../data/enemies';
import type { AttackStyle, ArchetypeId } from '../data/archetypes';
import type { WaveId } from '../data/waves';

export type GameAction = 'up' | 'down' | 'left' | 'right' | 'interact' | 'pause';

export type TimerSlot = 'attack' | 'enemyAttack' | 'lifetime';

export type GameTimer = Timer<TimerSlot>;

export type RunPhase = 'playing' | 'levelUp' | 'shop' | 'won' | 'lost';

export interface Components {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  renderable: {
    shape: 'circle' | 'rect' | 'token' | 'door' | 'unit';
    color: string;
    radius?: number;
    width?: number;
    height?: number;
    label?: string;
  };
  player: {
    maxHp: number;
  };
  ally: {
    archetypeId: ArchetypeId;
    formationIndex: number;
  };
  enemy: {
    kind: EnemyKind;
    hp: number;
    maxHp: number;
    damage: number;
  };
  health: {
    current: number;
    max: number;
  };
  attacker: {
    range: number;
    damage: number;
    cooldownSec: number;
    projectileSpeed: number;
    shotSpreadHalfDeg?: number;
    coneHalfDeg: number;
    style: AttackStyle;
    cooldownLeft: number;
  };
  projectile: {
    damage: number;
    speed: number;
    vx: number;
    vy: number;
    lifetime: number;
    fromAlly: boolean;
  };
  scavengeToken: {
    archetypeId: ArchetypeId;
    banked: boolean;
  };
  experienceDrop: {
    amount: number;
  };
  door: {
    open: boolean;
  };
  collider: {
    radius: number;
  };
}

export type AllComponents = Components & TimerComponentTypes<TimerSlot>;

export interface RunStats {
  wavesCleared: number;
  alliesRecruited: number;
  alliesLost: number;
  alliesAlive: number;
  enemiesKilled: number;
}

export interface Resources {
  touchMovement: { readonly x: number; readonly y: number };
  viewportPaused: boolean;
  phase: RunPhase;
  waveId: WaveId;
  waveElapsed: number;
  waveDuration: number;
  coins: number;
  bankedTokens: number;
  progression: {
    level: number;
    experience: number;
    choices: ArchetypeId[];
  };
  softSquadCap: number;
  cameraX: number;
  frontX: number;
  spawnAheadAccumulator: number;
  rearNextAt: number;
  doorOpen: boolean;
  stats: RunStats;
  /** Pending end reason */
  endReason: string;
}

export type PlayingScreenConfig = { fresh: boolean };
