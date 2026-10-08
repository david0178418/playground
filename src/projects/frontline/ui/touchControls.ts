import type { GameEngine } from '../ecs/Engine';

export const PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 900px), (orientation: portrait) and (any-pointer: coarse)';

export const joystickMovement = function(x: number, y: number, radius: number): { x: number; y: number } {
	const distance = Math.hypot(x, y);
	if (distance < radius * 0.12 || radius <= 0) return { x: 0, y: 0 };
	const scale = Math.max(radius, distance);
	return { x: x / scale, y: y / scale };
};

export const attachTouchControls = function(root: ParentNode, ecs: GameEngine): () => void {
	const joystick = root.querySelector<HTMLDivElement>('.touch-joystick');
	const stick = root.querySelector<HTMLSpanElement>('.joystick-stick');
	if (!joystick || !stick) throw new Error('Missing Frontline touch controls');

	const portrait = window.matchMedia(PORTRAIT_QUERY);
	let pointerId: number | null = null;
	const reset = function() {
		const captured = pointerId;
		pointerId = null;
		if (captured !== null && joystick.hasPointerCapture(captured)) joystick.releasePointerCapture(captured);
		ecs.setResource('touchMovement', { x: 0, y: 0 });
		stick.style.transform = 'translate(0px, 0px)';
		joystick.dataset['active'] = 'false';
	};
	const update = function(event: PointerEvent) {
		const bounds = joystick.getBoundingClientRect();
		const radius = bounds.width * 0.3;
		const movement = joystickMovement(event.clientX - bounds.left - bounds.width / 2,
			event.clientY - bounds.top - bounds.height / 2, radius);
		ecs.setResource('touchMovement', movement);
		stick.style.transform = `translate(${movement.x * radius}px, ${movement.y * radius}px)`;
	};
	const down = function(event: PointerEvent) {
		if (pointerId !== null || event.button !== 0 || portrait.matches || ecs.getResource('phase') !== 'playing') return;
		event.preventDefault();
		pointerId = event.pointerId;
		joystick.setPointerCapture(pointerId);
		joystick.dataset['active'] = 'true';
		update(event);
	};
	const move = function(event: PointerEvent) {
		if (event.pointerId !== pointerId) return;
		event.preventDefault();
		update(event);
	};
	const release = function(event: PointerEvent) {
		if (event.pointerId === pointerId) reset();
	};
	const orientationChanged = function() {
		reset();
		ecs.setResource('viewportPaused', portrait.matches);
	};
	const visibilityChanged = function() { if (document.hidden) reset(); };
	const detachPhase = ecs.onResourceChange('phase', function() { reset(); });
	joystick.addEventListener('pointerdown', down);
	joystick.addEventListener('pointermove', move);
	joystick.addEventListener('pointerup', release);
	joystick.addEventListener('pointercancel', release);
	joystick.addEventListener('lostpointercapture', release);
	window.addEventListener('blur', reset);
	document.addEventListener('visibilitychange', visibilityChanged);
	portrait.addEventListener('change', orientationChanged);
	orientationChanged();
	return function() {
		reset();
		detachPhase();
		joystick.removeEventListener('pointerdown', down);
		joystick.removeEventListener('pointermove', move);
		joystick.removeEventListener('pointerup', release);
		joystick.removeEventListener('pointercancel', release);
		joystick.removeEventListener('lostpointercapture', release);
		window.removeEventListener('blur', reset);
		document.removeEventListener('visibilitychange', visibilityChanged);
		portrait.removeEventListener('change', orientationChanged);
	};
};
