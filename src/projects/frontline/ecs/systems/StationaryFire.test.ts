import { describe, expect, test } from 'bun:test';
import { ALLY, CORRIDOR, ENEMY, PLAYER } from '../../config';
import { archetype } from '../../data/archetypes';
import { createGameEngine } from '../Engine';
import { createAlly, createEnemy, createPlayer } from '../entities';
import { addCombatSystem } from './CombatSystem';
import { addPlayerMovementSystem } from './PlayerMovementSystem';
import { addSquadFollowSystem } from './SquadFollowSystem';

const STATIONARY_SPEED_LIMIT = 1;

describe('stationary fire', () => {
	test('player and following ally shoot only while stopped, including when pinned on a wall', async () => {
		const ecs = createGameEngine();
		try {
			addPlayerMovementSystem(ecs);
			addSquadFollowSystem(ecs);
			addCombatSystem(ecs);
			await ecs.initialize();

			const px = 200;
			const py = 200;
			createPlayer(ecs, px, py);
			createAlly(ecs, px - ALLY.FOLLOW_DISTANCE, py - ALLY.FOLLOW_SPREAD, 'rifleman', 0);
			createEnemy(ecs.commands, px + 200, py, 'regular');

			ecs.update(0);
			for (const bullet of ecs.getEntitiesWithQuery(['projectile'])) {
				ecs.removeEntity(bullet.id);
			}

			ecs.setResource('touchMovement', { x: 1, y: 0 });
			for (let frame = 0; frame < 10; frame++) {
				ecs.update(0.05);
				expect(ecs.getEntitiesWithQuery(['projectile'])).toHaveLength(0);
			}
			const movingUnits = [
				...ecs.getEntitiesWithQuery(['player', 'velocity']),
				...ecs.getEntitiesWithQuery(['ally', 'velocity']),
			];
			expect(movingUnits).toHaveLength(2);
			for (const unit of movingUnits) {
				const velocity = unit.components.velocity;
				expect(Math.hypot(velocity.x, velocity.y)).toBeGreaterThan(STATIONARY_SPEED_LIMIT);
			}

			ecs.setResource('touchMovement', { x: 0, y: 0 });
			const firedFrom = new Set<number>();
			for (let frame = 0; frame < 20; frame++) {
				ecs.update(0.05);
				const units = [
					...ecs.getEntitiesWithQuery(['player', 'position', 'velocity']),
					...ecs.getEntitiesWithQuery(['ally', 'position', 'velocity']),
				];
				for (const shot of ecs.getEntitiesWithQuery(['projectile', 'position'])) {
					const origin = shot.components.position;
					const owner = units.find((unit) => {
						const pos = unit.components.position;
						return Math.hypot(pos.x - origin.x, pos.y - origin.y) < 1;
					});
					expect(owner).toBeTruthy();
					if (!owner) continue;
					const velocity = owner.components.velocity;
					expect(Math.hypot(velocity.x, velocity.y)).toBeLessThanOrEqual(STATIONARY_SPEED_LIMIT);
					firedFrom.add(owner.id);
					ecs.removeEntity(shot.id);
				}
			}

			const player = ecs.getEntitiesWithQuery(['player'])[0];
			const ally = ecs.getEntitiesWithQuery(['ally'])[0];
			expect(player).toBeTruthy();
			expect(ally).toBeTruthy();
			if (!player || !ally) return;
			expect(firedFrom.has(player.id)).toBe(true);
			expect(firedFrom.has(ally.id)).toBe(true);

			ecs.setResource('touchMovement', { x: -1, y: 0 });
			const pinned = ecs.getEntitiesWithQuery(['player', 'position', 'velocity'])[0];
			const enemy = ecs.getEntitiesWithQuery(['enemy', 'position'])[0];
			expect(pinned).toBeTruthy();
			expect(enemy).toBeTruthy();
			if (!pinned || !enemy) return;
			pinned.components.position.x = CORRIDOR.LEFT_WALL + PLAYER.RADIUS;
			enemy.components.position.x = pinned.components.position.x + 200;
			enemy.components.position.y = pinned.components.position.y;
			for (const bullet of ecs.getEntitiesWithQuery(['projectile'])) {
				ecs.removeEntity(bullet.id);
			}
			ecs.update(PLAYER.ATTACK_COOLDOWN_SEC);
			expect(pinned.components.position.x).toBe(CORRIDOR.LEFT_WALL + PLAYER.RADIUS);
			expect(pinned.components.velocity.x).toBe(0);
			expect(ecs.getEntitiesWithQuery(['projectile']).length).toBeGreaterThan(0);
		} finally {
			await ecs.dispose();
		}
	});

	test('a cone attack deals no damage while the attacker is moving', async () => {
		const ecs = createGameEngine();
		try {
			addCombatSystem(ecs);
			await ecs.initialize();
			createAlly(ecs, 100, 100, 'breacher', 0);
			createEnemy(ecs.commands, 160, 100, 'regular');

			ecs.update(0);
			const enemy = ecs.getEntitiesWithQuery(['enemy', 'health'])[0];
			const ally = ecs.getEntitiesWithQuery(['ally', 'velocity'])[0];
			expect(enemy).toBeTruthy();
			expect(ally).toBeTruthy();
			if (!enemy || !ally) return;
			expect(enemy.components.health.current).toBe(ENEMY.HP - archetype('breacher').attackDamage);

			ally.components.velocity.x = 40;
			const hpWhileMoving = enemy.components.health.current;
			ecs.update(1);
			expect(enemy.components.health.current).toBe(hpWhileMoving);

			ally.components.velocity.x = 0;
			ally.components.velocity.y = 0;
			ecs.update(0);
			expect(enemy.components.health.current).toBe(hpWhileMoving - archetype('breacher').attackDamage);
		} finally {
			await ecs.dispose();
		}
	});
});
