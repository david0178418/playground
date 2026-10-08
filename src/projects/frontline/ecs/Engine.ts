import ECSpresso, { type SystemRegistrarOf } from 'ecspresso';
import { createInputPlugin } from 'ecspresso/plugins/input/input';
import { createTimerPlugin } from 'ecspresso/plugins/scripting/timers';
import { SOFT_SQUAD_CAP, WAVE_DURATION_SEC } from '../config';
import type { ArchetypeId } from '../data/archetypes';
import type { Components, GameAction, Resources, TimerSlot } from './types';
import { keyboardActionMap } from './inputMap';

const timerPlugin = createTimerPlugin<TimerSlot>({ priority: 10 });

const inputPlugin = createInputPlugin<GameAction>({
  actions: keyboardActionMap(),
  players: { keyboard: keyboardActionMap() },
  preventDefaultKeys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'],
});

const initialStats = (): Resources['stats'] => ({
  wavesCleared: 0,
  alliesRecruited: 0,
  alliesLost: 0,
  alliesAlive: 1,
  enemiesKilled: 0,
});

export function createGameEngine() {
  return ECSpresso.create()
  .withPlugin(inputPlugin)
  .withPlugin(timerPlugin)
  .withComponentTypes<Components>()
  .withResourceTypes<Resources>()
  .withResource('touchMovement', { x: 0, y: 0 })
  .withResource('viewportPaused', false)
  .withResource('phase', 'playing' as Resources['phase'])
  .withResource('waveId', 1 as Resources['waveId'])
  .withResource('waveElapsed', 0)
  .withResource('waveDuration', WAVE_DURATION_SEC)
  .withResource('coins', 0)
  .withResource('bankedTokens', 0)
  .withResource('softSquadCap', SOFT_SQUAD_CAP)
  .withResource('cameraX', 0)
  .withResource('frontX', 200)
  .withResource('spawnAheadAccumulator', 0)
  .withResource('rearNextAt', 55)
  .withResource('doorOpen', false)
  .withResource('shopOffers', ['rifleman', 'breacher', 'marksman'] as ArchetypeId[])
  .withResource('stats', initialStats())
  .withResource('endReason', '')
  .withRequired('player', 'timers', () => ({}))
  .withRequired('ally', 'timers', () => ({}))
  .withRequired('enemy', 'timers', () => ({}))
  .withScreens(screens => screens
    .add('playing', { initialState: () => ({ fresh: true }) })
    .add('shop', { initialState: () => ({}) })
    .add('end', { initialState: () => ({}) }))
  .build();
}

export type GameEngine = ReturnType<typeof createGameEngine>;

// Live binding: replaced on each mount so the React wrapper can remount cleanly.
export let gameEngine: GameEngine = createGameEngine();
export type GameSystemRegistrar = SystemRegistrarOf<GameEngine>;

let lastFrameTime = 0;
let gameRunning = false;

let frameHandle = 0;
const onVisibilityChange = (): void => {
  lastFrameTime = performance.now();
};

export async function initializeEngine(): Promise<void> {
  await gameEngine.dispose();
  gameEngine = createGameEngine();
  await gameEngine.initialize();
}

/** Stop the loop, remove listeners, and uninstall plugins (input listeners). */
export function stopGameLoop(): Promise<void> {
  gameRunning = false;
  cancelAnimationFrame(frameHandle);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  return gameEngine.dispose();
}

export function startGameLoop(): void {
  if (gameRunning) return;
  gameRunning = true;
  lastFrameTime = performance.now();
  document.addEventListener('visibilitychange', onVisibilityChange);
  frameHandle = requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime: number): void {
  if (!gameRunning) return;
  const deltaTime = document.hidden ? 0 : Math.min(0.05, (currentTime - lastFrameTime) / 1000);
  lastFrameTime = currentTime;
  if (!document.hidden && !gameEngine.getResource('viewportPaused')) {
    gameEngine.update(deltaTime);
  }
  frameHandle = requestAnimationFrame(gameLoop);
}

export function resetRunStats(): void {
  gameEngine.setResource('stats', initialStats());
}
