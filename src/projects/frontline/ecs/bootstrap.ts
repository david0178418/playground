import { gameEngine, initializeEngine, startGameLoop, stopGameLoop } from './Engine';
import { addPlayerMovementSystem } from './systems/PlayerMovementSystem';
import { addSquadFollowSystem } from './systems/SquadFollowSystem';
import { addCombatSystem } from './systems/CombatSystem';
import { addSpawnSystem } from './systems/SpawnSystem';
import { addEnemyAISystem } from './systems/EnemyAISystem';
import { addPickupSystem } from './systems/PickupSystem';
import { addWaveSystem } from './systems/WaveSystem';
import { addCameraSystem } from './systems/CameraSystem';
import { addRenderSystem, initRenderTargets } from './systems/RenderSystem';
import { resizeCanvas } from '../render/canvasRenderer';
import { restartRun } from './waveLifecycle';

export async function initializeGame(root: ParentNode = document): Promise<() => void> {
  const canvas = root.querySelector<HTMLCanvasElement>('#game-canvas');
  const hud = root.querySelector<HTMLElement>('#hud');
  const overlay = root.querySelector<HTMLElement>('#overlay');
  if (!canvas || !hud || !overlay) throw new Error('Missing #game-canvas, #hud, or #overlay');

  resizeCanvas(canvas);
  initRenderTargets(canvas, hud, overlay);

  await initializeEngine();

  // Systems gate on `phase` resource; registered globally for the v1 slice.
  addPlayerMovementSystem(gameEngine);
  addSquadFollowSystem(gameEngine);
  addCombatSystem(gameEngine);
  addSpawnSystem(gameEngine);
  addEnemyAISystem(gameEngine);
  addPickupSystem(gameEngine);
  addWaveSystem(gameEngine);
  addCameraSystem(gameEngine);
  addRenderSystem(gameEngine);

  // Discard unbanked scavenge tokens when leaving a wave (shop / win).
  let lastPhase = gameEngine.getResource('phase');
  gameEngine.addSystem('phaseCleanup')
    .setProcess(({ ecs }) => {
      const phase = ecs.getResource('phase');
      if (phase !== lastPhase && (phase === 'shop' || phase === 'won' || phase === 'lost')) {
        for (const t of ecs.getEntitiesWithQuery(['scavengeToken'])) {
          ecs.removeEntity(t.id);
        }
        for (const e of ecs.getEntitiesWithQuery(['enemy'])) {
          ecs.removeEntity(e.id);
        }
        for (const p of ecs.getEntitiesWithQuery(['projectile'])) {
          ecs.removeEntity(p.id);
        }
      }
      lastPhase = phase;
    });

  await gameEngine.pushScreen('playing', { fresh: true });
  restartRun(gameEngine);
  startGameLoop();
  return stopGameLoop;
}
