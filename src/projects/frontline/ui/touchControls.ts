import { attachFloatingTouchStick } from '../../../common/floatingTouchStick';
import type { GameEngine } from '../ecs/Engine';

export const PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 900px), (orientation: portrait) and (any-pointer: coarse)';

export const attachTouchControls = function(root: ParentNode, ecs: GameEngine): () => void {
	const surface = root.querySelector<HTMLDivElement>('#frontline-app');
	const base = root.querySelector<HTMLDivElement>('.touch-joystick');
	const knob = root.querySelector<HTMLSpanElement>('.joystick-stick');
	if (!surface || !base || !knob) throw new Error('Missing Frontline touch controls');

	const portrait = window.matchMedia(PORTRAIT_QUERY);
	const controls = attachFloatingTouchStick({
		surface, base, knob,
		onMovement: function(movement) { ecs.setResource('touchMovement', movement); },
		canStart: function(event) {
			return !portrait.matches && ecs.getResource('phase') === 'playing'
				&& !(event.target instanceof Element && event.target.closest('button, a, #overlay'));
		},
	});
	const orientationChanged = function() {
		controls.reset();
		ecs.setResource('viewportPaused', portrait.matches);
	};
	const detachPhase = ecs.onResourceChange('phase', controls.reset);
	portrait.addEventListener('change', orientationChanged);
	orientationChanged();
	return function() {
		detachPhase();
		portrait.removeEventListener('change', orientationChanged);
		controls.dispose();
	};
};
