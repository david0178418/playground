import { CORRIDOR, PLAYER } from '../../config';
import type { GameSystemRegistrar } from '../Engine';
import { writeDisplacementVelocity } from '../motion';
import { playerQuery } from '../queries';

export function addPlayerMovementSystem(systems: GameSystemRegistrar): void {
  systems.addSystem('playerMovement')
    .addSingleton('player', playerQuery)
    .runWhenEmpty()
    .withResources(['inputState', 'phase', 'touchMovement'])
    .setProcess(({ queries, dt, resources: { inputState, phase, touchMovement } }) => {
      if (phase !== 'playing') return;
      const entity = queries.player;
      if (!entity) return;

      const actions = inputState.actions;
      let dx = touchMovement.x;
      let dy = touchMovement.y;
      if (actions.isActive('left')) dx -= 1;
      if (actions.isActive('right')) dx += 1;
      if (actions.isActive('up')) dy -= 1;
      if (actions.isActive('down')) dy += 1;

      if (Math.hypot(dx, dy) > 1) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
      }

      const pos = entity.components.position;
      const fromX = pos.x;
      const fromY = pos.y;
      pos.x += dx * PLAYER.SPEED * dt;
      pos.y += dy * PLAYER.SPEED * dt;

      // Unidirectional: cannot escape left out of the run
      pos.x = Math.max(CORRIDOR.LEFT_WALL + PLAYER.RADIUS, Math.min(CORRIDOR.WIDTH - PLAYER.RADIUS, pos.x));
      pos.y = Math.max(CORRIDOR.EDGE_PAD + PLAYER.RADIUS, Math.min(CORRIDOR.HEIGHT - CORRIDOR.EDGE_PAD - PLAYER.RADIUS, pos.y));
      writeDisplacementVelocity(entity.components.velocity, fromX, fromY, pos.x, pos.y, dt);
    });
}
