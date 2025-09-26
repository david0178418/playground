import { Direction } from '../../models/Command';
import type { GameState } from '../../models/Room';
import { MessageType } from '../../models/Room';
import type { CommandResult } from '../CommandProcessor';

/**
 * Handles movement-related commands
 */
export class MovementProcessor {
	/**
	 * Check if a command is a direction command
	 */
	isDirectionCommand(verb: string): boolean {
		const directions = ['north', 'south', 'east', 'west', 'n', 's', 'e', 'w',
			'northeast', 'northwest', 'southeast', 'southwest',
			'ne', 'nw', 'se', 'sw', 'up', 'down', 'u', 'd'];
		return directions.includes(verb);
	}

	/**
	 * Parse direction from command verb
	 */
	parseDirection(verb: string): Direction {
		switch (verb) {
			case 'north':
			case 'n':
				return Direction.NORTH;
			case 'south':
			case 's':
				return Direction.SOUTH;
			case 'east':
			case 'e':
				return Direction.EAST;
			case 'west':
			case 'w':
				return Direction.WEST;
			case 'northeast':
			case 'ne':
				return Direction.NORTHEAST;
			case 'northwest':
			case 'nw':
				return Direction.NORTHWEST;
			case 'southeast':
			case 'se':
				return Direction.SOUTHEAST;
			case 'southwest':
			case 'sw':
				return Direction.SOUTHWEST;
			case 'up':
			case 'u':
				return Direction.UP;
			case 'down':
			case 'd':
				return Direction.DOWN;
			default:
				throw new Error(`Invalid direction: ${verb}`);
		}
	}

	/**
	 * Execute movement command
	 */
	executeMove(direction: Direction, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return {
				success: false,
				message: 'You cannot move from here.',
				messageType: MessageType.ERROR
			};
		}

		// Check if direction exists
		if (!currentRoom.exits.has(direction)) {
			return {
				success: false,
				message: `You cannot go ${direction.toLowerCase()}.`,
				messageType: MessageType.ACTION
			};
		}

		// Check if exit is locked
		if (currentRoom.lockedExits?.has(direction)) {
			const lock = currentRoom.lockedExits.get(direction)!;
			if (!lock.unlocked) {
				return {
					success: false,
					message: `The ${direction.toLowerCase()} exit is locked.`,
					messageType: MessageType.ACTION
				};
			}
		}

		// Move to new room
		const targetRoomId = currentRoom.exits.get(direction)!;
		const targetRoom = gameState.dungeon.rooms.get(targetRoomId);

		if (!targetRoom) {
			return {
				success: false,
				message: 'That path leads nowhere.',
				messageType: MessageType.ERROR
			};
		}

		// Update game state
		gameState.currentRoomId = targetRoomId;
		targetRoom.visited = true;
		gameState.turnCount++;

		// Get room description
		const directionName = this.getDirectionName(direction);
		let description = targetRoom.description.generatedDescription || targetRoom.description.template;

		// Add exit information
		const availableExits = Array.from(targetRoom.exits.keys()).map(d => d.toLowerCase()).join(', ');
		const exitInfo = availableExits ? `Exits: ${availableExits}.` : 'There are no visible exits.';

		// Add enemy information
		let enemyInfo = '';
		if (targetRoom.contents.enemies.length > 0) {
			const enemyNames = targetRoom.contents.enemies.map(e => e.name).join(', ');
			enemyInfo = ` Enemies: ${enemyNames}.`;
		}

		// Add item information
		let itemInfo = '';
		if (targetRoom.contents.items.length > 0) {
			const itemNames = targetRoom.contents.items.map(i => i.name).join(', ');
			itemInfo = ` Items: ${itemNames}.`;
		}

		return {
			success: true,
			message: `You go ${directionName}. ${description} ${exitInfo}${enemyInfo}${itemInfo}`,
			messageType: MessageType.ACTION
		};
	}

	/**
	 * Get human-readable direction name
	 */
	private getDirectionName(direction: Direction): string {
		switch (direction) {
			case Direction.NORTH: return 'north';
			case Direction.SOUTH: return 'south';
			case Direction.EAST: return 'east';
			case Direction.WEST: return 'west';
			case Direction.NORTHEAST: return 'northeast';
			case Direction.NORTHWEST: return 'northwest';
			case Direction.SOUTHEAST: return 'southeast';
			case Direction.SOUTHWEST: return 'southwest';
			case Direction.UP: return 'up';
			case Direction.DOWN: return 'down';
			default: return direction;
		}
	}
}