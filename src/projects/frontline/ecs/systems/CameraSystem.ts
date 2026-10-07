import { CAMERA, CORRIDOR } from '../../config';
import type { GameSystemRegistrar } from '../Engine';
import { playerQuery } from '../queries';

export function addCameraSystem(systems: GameSystemRegistrar): void {
  systems.addSystem('camera')
    .addSingleton('player', playerQuery)
    .runWhenEmpty()
    .withResources(['phase', 'cameraX'])
    .setProcess(({ queries, ecs, resources: { phase } }) => {
      if (phase !== 'playing') return;
      const player = queries.player;
      if (!player) return;

      // Camera follows player; keep player left-of-center so ahead reads
      const target =
        player.components.position.x - CAMERA.VIEW_WIDTH * CAMERA.PLAYER_SCREEN_X_RATIO;
      const maxX = Math.max(0, CORRIDOR.WIDTH - CAMERA.VIEW_WIDTH);
      const cameraX = Math.max(0, Math.min(maxX, target));
      ecs.setResource('cameraX', cameraX);
    });
}
