/**
 * Frontline tunable knobs.
 * Defaults from V1_ACCEPTANCE_CRITERIA.md — mark LOCKED knobs clearly.
 */

/** Soft living-ally cap = 5 (LOCKED). Player does not count. */
export const SOFT_SQUAD_CAP = 5;

/** Wave duration target in seconds (~2.5 min). Clamp tune 2–4 min; floor ~120s. */
export const WAVE_DURATION_SEC = 150;

/** Minimum wave length floor (seconds). */
export const WAVE_DURATION_FLOOR_SEC = 120;

/** Corridor dimensions in world units (pixels). TEMPORARY: flat scroll strip. */
export const CORRIDOR = {
  WIDTH: 3200,
  HEIGHT: 480,
  /** Y playable band padding from top/bottom */
  EDGE_PAD: 40,
  /** Left hard wall — cannot escape run through left edge */
  LEFT_WALL: 0,
  /** Tag: corridor-first flat strip; arenas are nice-to-have next slice */
  TEMPORARY_FLAT_STRIP: true,
} as const;

export const PLAYER = {
  SPEED: 200,
  RADIUS: 14,
  MAX_HP: 140,
  COLOR: '#4fc3f7',
  /** Hitscan/projectile auto-attack */
  ATTACK_RANGE: 300,
  ATTACK_DAMAGE: 18,
  ATTACK_COOLDOWN_SEC: 0.35,
  PROJECTILE_SPEED: 560,
  /** Brief i-frames after absorbing a hit (seconds) */
  HURT_IFRAME_SEC: 0.55,
} as const;

export const ALLY = {
  FOLLOW_DISTANCE: 42,
  FOLLOW_SPREAD: 28,
  SPEED: 190,
  RADIUS: 12,
  HURT_IFRAME_SEC: 0.4,
} as const;

export const ENEMY = {
  RADIUS: 12,
  SPEED: 55,
  HP: 20,
  DAMAGE: 6,
  ATTACK_COOLDOWN_SEC: 1.15,
  CONTACT_RANGE: 20,
  COLOR: '#e57373',
  COIN_DROP: 3,
  /** Ahead (right) spawn band relative to player */
  AHEAD_MIN: 360,
  AHEAD_MAX: 680,
  /** Rear chase spawn band left of player */
  REAR_OFFSET_MIN: 200,
  REAR_OFFSET_MAX: 400,
} as const;

export const SPAWN = {
  /** Base interval between ahead packs at wave start (sec) */
  AHEAD_INTERVAL_START: 3.4,
  /** Interval at wave end (spawn rate rises) */
  AHEAD_INTERVAL_END: 1.2,
  AHEAD_PACK_MIN: 1,
  AHEAD_PACK_MAX: 3,
  /** Rear chase schedule */
  REAR_FIRST_AT_SEC: 50,
  REAR_INTERVAL: 30,
  REAR_PACK_SIZE: 3,
  REAR_PACK_SIZE_WAVE_SCALE: 1, // +1 per wave index
} as const;

export const RECRUIT = {
  CRATE_RADIUS: 16,
  PICKUP_RANGE: 48,
  COLOR: '#ffd54f',
} as const;

export const SCAVENGE = {
  TOKEN_RADIUS: 10,
  PICKUP_RANGE: 28,
  COLOR: '#ce93d8',
} as const;

export const DOOR = {
  WIDTH: 36,
  HEIGHT: 120,
  COLOR_CLOSED: '#546e7a',
  COLOR_OPEN: '#81c784',
  /** World X of exit door (near right end of corridor) */
  X: 3000,
} as const;

/**
 * Camera (LOCKED): Vampire Survivors–style — top-down playfield via cameraX follow;
 * ¾ / side-view placeholder sprites (not top-down discs).
 */
export const CAMERA = {
  VIEW_WIDTH: 960,
  VIEW_HEIGHT: 540,
  /** Keep player roughly left-of-center so ahead reads */
  PLAYER_SCREEN_X_RATIO: 0.38,
} as const;

/** Shop costs (currency = enemy coin drops + wave-clear payout). */
export const SHOP = {
  HEAL_COST: 20,
  HEAL_AMOUNT: 50,
  REVIVE_COST: 35,
  /** Revive also consumes 1 banked scavenge token */
  REROLL_COST: 12,
  OFFER_SLOTS: 3,
  /** Coins granted once when entering shop after clearing a wave */
  WAVE_CLEAR_PAYOUT: 25,
  /** Extra coins per wave index beyond 1 (wave 1→25, wave 2→30, …) */
  WAVE_CLEAR_PAYOUT_PER_WAVE: 5,
} as const;

export const COLORS = {
  BG: '#1a1f2e',
  CORRIDOR: '#243044',
  CORRIDOR_EDGE: '#1e2740',
  GRID: '#2a3548',
} as const;
