export interface StickMovement {
	readonly x: number;
	readonly y: number;
}

export const joystickMovement = function(x: number, y: number, radius: number): StickMovement {
	const distance = Math.hypot(x, y);
	if (distance < radius * 0.12 || radius <= 0) return { x: 0, y: 0 };
	const scale = Math.max(radius, distance);
	return { x: x / scale, y: y / scale };
};

export interface FloatingTouchStickOptions {
	/** Input region; apply touch-action: none in the game's stylesheet. */
	readonly surface: HTMLElement;
	/** Visual uses fixed positioning and pointer-events: none. */
	readonly base: HTMLElement;
	readonly knob: HTMLElement;
	readonly onMovement: (movement: StickMovement) => void;
	readonly canStart?: (event: PointerEvent) => boolean;
}

/** A single touch/pen owns the stick until release. The initial touch is its center.
 * Games own markup, styling, and eligibility; call reset on pause and dispose on exit.
 */
export const attachFloatingTouchStick = function(options: FloatingTouchStickOptions) {
	const { surface, base, knob, onMovement, canStart } = options;
	const document = surface.ownerDocument;
	const view = document.defaultView;
	if (!view) throw new Error('Touch stick requires a window');
	let active: { pointerId: number; x: number; y: number; radius: number } | null = null;
	base.dataset['active'] = 'false';
	const reset = function() {
		const captured = active?.pointerId;
		active = null;
		base.dataset['active'] = 'false';
		knob.style.transform = 'translate(0px, 0px)';
		if (captured !== undefined && surface.hasPointerCapture(captured)) surface.releasePointerCapture(captured);
		onMovement({ x: 0, y: 0 });
	};
	const down = function(event: PointerEvent) {
		if (active || (event.pointerType !== 'touch' && event.pointerType !== 'pen') || event.button !== 0 || canStart?.(event) === false) return;
		event.preventDefault();
		base.style.left = `${event.clientX}px`;
		base.style.top = `${event.clientY}px`;
		base.dataset['active'] = 'true';
		active = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, radius: base.getBoundingClientRect().width * 0.3 };
		surface.setPointerCapture(event.pointerId);
		onMovement({ x: 0, y: 0 });
	};
	const move = function(event: PointerEvent) {
		if (!active || event.pointerId !== active.pointerId) return;
		event.preventDefault();
		const movement = joystickMovement(event.clientX - active.x, event.clientY - active.y, active.radius);
		knob.style.transform = `translate(${movement.x * active.radius}px, ${movement.y * active.radius}px)`;
		onMovement(movement);
	};
	const release = function(event: PointerEvent) {
		if (event.pointerId === active?.pointerId) reset();
	};
	const visibilityChanged = function() { if (document.hidden) reset(); };
	surface.addEventListener('pointerdown', down);
	surface.addEventListener('lostpointercapture', release);
	view.addEventListener('pointermove', move);
	view.addEventListener('pointerup', release);
	view.addEventListener('pointercancel', release);
	view.addEventListener('blur', reset);
	view.addEventListener('resize', reset);
	document.addEventListener('visibilitychange', visibilityChanged);
	return {
		reset,
		dispose: function() {
			reset();
			surface.removeEventListener('pointerdown', down);
			surface.removeEventListener('lostpointercapture', release);
			view.removeEventListener('pointermove', move);
			view.removeEventListener('pointerup', release);
			view.removeEventListener('pointercancel', release);
			view.removeEventListener('blur', reset);
			view.removeEventListener('resize', reset);
			document.removeEventListener('visibilitychange', visibilityChanged);
		},
	};
};
