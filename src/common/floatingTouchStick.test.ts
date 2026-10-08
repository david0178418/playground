import { describe, expect, test } from 'bun:test';
import { joystickMovement } from './floatingTouchStick';

describe('floating stick movement relative to its touch origin', function() {
	test('touch-down and small finger jitter produce no movement', function() {
		expect(joystickMovement(0, 0, 30)).toEqual({ x: 0, y: 0 });
		expect(joystickMovement(2, -2, 30)).toEqual({ x: 0, y: 0 });
	});
	test('dragging within the radius produces proportional movement', function() {
		expect(joystickMovement(15, -6, 30)).toEqual({ x: 0.5, y: -0.2 });
	});
	test('long diagonal drags preserve direction and cap speed', function() {
		const movement = joystickMovement(-90, 120, 30);
		expect(movement).toEqual({ x: -0.6, y: 0.8 });
		expect(Math.hypot(movement.x, movement.y)).toBeCloseTo(1);
	});
	test('a collapsed input visual cannot generate invalid movement', function() {
		expect(joystickMovement(20, 30, 0)).toEqual({ x: 0, y: 0 });
	});
});
