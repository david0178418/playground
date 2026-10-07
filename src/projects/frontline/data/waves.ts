import type { ArchetypeId } from './archetypes';
import { WAVE_DURATION_SEC } from '../config';

export type WaveId = 1 | 2 | 3;

export interface RecruitOfferPlan {
  /** World X of crate (ahead of typical start). */
  x: number;
  /** Forced archetype, or null = random from v1 pool / wave bias */
  forced: ArchetypeId | null;
  /** Dual offer: second crate nearby for composition choice */
  dual?: { x: number; forced: ArchetypeId };
}

export interface WaveDef {
  id: WaveId;
  name: string;
  durationSec: number;
  /** Spawn rate multiplier vs base config */
  spawnRateMult: number;
  /** When rear chase first triggers (sec into wave) */
  rearFirstAtSec: number;
  rearIntervalSec: number;
  rearPackSize: number;
  /** Greed-reachable recruit crates */
  offers: RecruitOfferPlan[];
  /** Brief flavor for HUD */
  blurb: string;
}

/**
 * Sample 3-wave run from DESIGN_BRIEF.md.
 * Durations default to WAVE_DURATION_SEC (~150s / 2.5 min).
 */
export const WAVES: Record<WaveId, WaveDef> = {
  1: {
    id: 1,
    name: 'Thin line',
    durationSec: WAVE_DURATION_SEC,
    spawnRateMult: 0.75,
    rearFirstAtSec: 55,
    rearIntervalSec: 34,
    rearPackSize: 3,
    offers: [
      { x: 420, forced: 'rifleman' },
      { x: 1100, forced: 'breacher' },
    ],
    blurb: 'You + 1 Rifleman. Recruit ahead. Feel the rear bump.',
  },
  2: {
    id: 2,
    name: 'Greed check',
    durationSec: WAVE_DURATION_SEC,
    spawnRateMult: 1.0,
    rearFirstAtSec: 40,
    rearIntervalSec: 26,
    rearPackSize: 4,
    offers: [
      { x: 480, forced: 'breacher' },
      // Deep greed pocket — further ahead, better but riskier
      { x: 1600, forced: 'marksman' },
      { x: 900, forced: 'rifleman' },
    ],
    blurb: 'Rear closer. Deep pocket vs reclaim. Door waits.',
  },
  3: {
    id: 3,
    name: 'Composition under fire',
    durationSec: WAVE_DURATION_SEC,
    spawnRateMult: 1.2,
    rearFirstAtSec: 32,
    rearIntervalSec: 22,
    rearPackSize: 5,
    // Dual offers: crowd-clear vs single-target so composition choice lands
    offers: [
      {
        x: 560,
        forced: 'breacher',
        dual: { x: 680, forced: 'marksman' },
      },
      { x: 1300, forced: 'rifleman' },
    ],
    blurb: 'Choose crowd-clear vs single-target. Hold, then push the door.',
  },
};

export function waveDef(id: WaveId): WaveDef {
  return WAVES[id];
}
