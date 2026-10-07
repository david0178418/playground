import { CORRIDOR, PLAYER } from '../../config';
import type { GameSystemRegistrar } from '../Engine';
import { playerQuery } from '../queries';

export function addPlayerMovementSystem(systems: GameSystemRegistrar): void {
  systems.addSystem('playerMovement')
    .addSingleton('player', playerQuery)
    .runWhenEmpty()
    .withResources(['inputState', 'phase'])
    .setProcess(({ queries, dt, resources: { inputState, phase } }) => {
      if (phase !== 'playing') return;
      const entity = queries.player;
      if (!entity) return;

      const actions = inputState.actions;
      let dx = 0;
      let dy = 0;
      if (actions.isActive('left')) dx -= 1;
      if (actions.isActive('right')) dx += 1;
      if (actions.isActive('up')) dy -= 1;
      if (actions.isActive('down')) dy += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
      }

      const pos = entity.components.position;
      pos.x += dx * PLAYER.SPEED * dt;
      pos.y += dy * PLAYER.SPEED * dt;

      // Unidirectional: cannot escape left out of the run
      pos.x = Math.max(CORRIDOR.LEFT_WALL + PLAYER.RADIUS, Math.min(CORRIDOR.WIDTH - PLAYER.RADIUS, pos.x));
      pos.y = Math.max(CORRIDOR.EDGE_PAD + PLAYER.RADIUS, Math.min(CORRIDOR.HEIGHT - CORRIDOR.EDGE_PAD - PLAYER.RADIUS, pos.y));
    });
}
