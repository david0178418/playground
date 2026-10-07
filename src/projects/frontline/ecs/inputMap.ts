import type { ActionMap } from 'ecspresso/plugins/input/input';
import type { GameAction } from './types';

export function keyboardActionMap(): ActionMap<GameAction> {
  return {
    up: { keys: ['ArrowUp', 'w', 'W'] },
    down: { keys: ['ArrowDown', 's', 'S'] },
    left: { keys: ['ArrowLeft', 'a', 'A'] },
    right: { keys: ['ArrowRight', 'd', 'D'] },
    interact: { keys: [' ', 'e', 'E', 'Enter'] },
    pause: { keys: ['Escape', 'p', 'P'] },
  };
}
