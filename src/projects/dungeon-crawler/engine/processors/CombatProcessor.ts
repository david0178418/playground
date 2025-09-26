import type { GameState } from '../../models/Room';
import { MessageType } from '../../models/Room';
import type { CommandResult } from '../CommandProcessor';

/**
 * Handles combat-related commands
 */
export class CombatProcessor {
	/**
	 * Execute attack command
	 */
	executeAttack(_target: string | undefined, gameState: GameState): CommandResult {
		// Combat attacks are handled by the CombatSystem through the GameEngine
		// This is just for non-combat situations
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return {
				success: false,
				message: 'You cannot attack here.',
				messageType: MessageType.ERROR
			};
		}

		if (currentRoom.contents.enemies.length === 0) {
			return {
				success: false,
				message: 'There are no enemies here to attack.',
				messageType: MessageType.ACTION
			};
		}

		// If there are enemies, combat should be initiated by the GameEngine
		return {
			success: false,
			message: 'You are already in combat! Use combat actions instead.',
			messageType: MessageType.ERROR
		};
	}

	/**
	 * Execute defend command
	 */
	executeDefend(gameState: GameState): CommandResult {
		// Defend actions are handled by the CombatSystem
		if (!gameState.combatState) {
			return {
				success: false,
				message: 'You are not in combat.',
				messageType: MessageType.ACTION
			};
		}

		return {
			success: false,
			message: 'Use the combat interface to defend.',
			messageType: MessageType.ERROR
		};
	}

	/**
	 * Execute flee command
	 */
	executeFlee(gameState: GameState): CommandResult {
		// Flee actions are handled by the CombatSystem
		if (!gameState.combatState) {
			return {
				success: false,
				message: 'You are not in combat.',
				messageType: MessageType.ACTION
			};
		}

		return {
			success: false,
			message: 'Use the combat interface to flee.',
			messageType: MessageType.ERROR
		};
	}
}