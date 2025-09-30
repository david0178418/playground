import type { GameState } from '../../models/Room';
import { MessageType } from '../../models/Room';
import { ItemType } from '../../models/Character';
import type { CommandResult } from '../CommandProcessor';
import { InteractionSystem } from '../InteractionSystem';
import { InteractiveElementSystem } from '../InteractiveElementSystem';

/**
 * Handles room interaction commands (traps, puzzles, environmental elements)
 */
export class InteractionProcessor {
	private interactionSystem: InteractionSystem;
	private interactiveElementSystem: InteractiveElementSystem;

	constructor() {
		this.interactionSystem = new InteractionSystem();
		this.interactiveElementSystem = new InteractiveElementSystem();
	}

	/**
	 * Look around the current room
	 */
	executeLook(gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return {
				success: false,
				message: 'You cannot see anything here.',
				messageType: MessageType.ERROR
			};
		}

		let description = currentRoom.description.generatedDescription || currentRoom.description.template;

		// Add room details
		const exits = Array.from(currentRoom.exits.keys()).map(d => d.toLowerCase()).join(', ');
		const exitInfo = exits ? `Exits: ${exits}.` : 'There are no visible exits.';

		let details = `${description}\n\n${exitInfo}`;

		// Add enemy information
		if (currentRoom.contents.enemies.length > 0) {
			const enemyNames = currentRoom.contents.enemies.map(e => e.name).join(', ');
			details += `\n\nEnemies: ${enemyNames}.`;
		}

		// Add item information
		if (currentRoom.contents.items.length > 0) {
			const itemNames = currentRoom.contents.items.map(i => i.name).join(', ');
			details += `\n\nItems: ${itemNames}.`;
		}

		// Add feature information
		if (currentRoom.contents.features.length > 0) {
			const featureNames = currentRoom.contents.features.map(f => f.name).join(', ');
			details += `\n\nFeatures: ${featureNames}.`;
		}

		// Add hazards information
		if (currentRoom.hazards && currentRoom.hazards.length > 0) {
			const hazardNames = currentRoom.hazards.map(h => h.name).join(', ');
			details += `\n\nHazards: ${hazardNames}.`;
		}

		// Add interactive elements information
		if (currentRoom.interactiveElements && currentRoom.interactiveElements.length > 0) {
			const elementNames = currentRoom.interactiveElements.map(e => e.name).join(', ');
			details += `\n\nInteractive: ${elementNames}.`;
		}

		return {
			success: true,
			message: details,
			messageType: MessageType.DESCRIPTION
		};
	}

	/**
	 * Search the current room
	 */
	executeSearch(gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return {
				success: false,
				message: 'There is nothing to search here.',
				messageType: MessageType.ERROR
			};
		}

		// Search features for hidden items
		let foundItems = false;
		let searchResults = 'You search the room carefully.';

		for (const feature of currentRoom.contents.features) {
			if (feature.searchable && !feature.searched && feature.hidden_items) {
				feature.searched = true;
				foundItems = true;

				// Add hidden items to room
				for (const hiddenItem of feature.hidden_items) {
					currentRoom.contents.items.push(hiddenItem);
				}

				const itemNames = feature.hidden_items.map(i => i.name).join(', ');
				searchResults += `\n\nYou find hidden items in the ${feature.name}: ${itemNames}.`;
			}
		}

		// Mark room as searched
		currentRoom.contents.searched = true;

		if (!foundItems) {
			searchResults += '\n\nYou don\'t find anything new.';
		}

		return {
			success: true,
			message: searchResults,
			messageType: MessageType.ACTION
		};
	}

	/**
	 * Examine a target
	 */
	executeExamine(target: string, gameState: GameState): CommandResult {
		if (!target) {
			return {
				success: false,
				message: 'What do you want to examine?',
				messageType: MessageType.ERROR
			};
		}

		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return {
				success: false,
				message: 'There is nothing to examine here.',
				messageType: MessageType.ERROR
			};
		}

		const lowerTarget = target.toLowerCase();

		// Check items in room
		const roomItem = currentRoom.contents.items.find(item =>
			item.name.toLowerCase().includes(lowerTarget)
		);
		if (roomItem) {
			return {
				success: true,
				message: roomItem.description || `It's a ${roomItem.name}.`,
				messageType: MessageType.DESCRIPTION
			};
		}

		// Check inventory items
		const inventoryItem = gameState.character.inventory.find(item =>
			item.name.toLowerCase().includes(lowerTarget)
		);
		if (inventoryItem) {
			return {
				success: true,
				message: inventoryItem.description || `It's your ${inventoryItem.name}.`,
				messageType: MessageType.DESCRIPTION
			};
		}

		// Check features
		const feature = currentRoom.contents.features.find(f =>
			f.name.toLowerCase().includes(lowerTarget)
		);
		if (feature) {
			return {
				success: true,
				message: feature.description,
				messageType: MessageType.DESCRIPTION
			};
		}

		// Check enemies
		const enemy = currentRoom.contents.enemies.find(e =>
			e.name.toLowerCase().includes(lowerTarget)
		);
		if (enemy) {
			const healthStatus = enemy.hp.current === enemy.hp.max ? 'uninjured' :
				enemy.hp.current > enemy.hp.max * 0.5 ? 'lightly wounded' :
				enemy.hp.current > enemy.hp.max * 0.25 ? 'wounded' : 'heavily wounded';

			return {
				success: true,
				message: `${enemy.description || `It's a ${enemy.name}.`} The ${enemy.name} appears ${healthStatus}.`,
				messageType: MessageType.DESCRIPTION
			};
		}

		return {
			success: false,
			message: `You don't see a ${target} here.`,
			messageType: MessageType.ACTION
		};
	}

	/**
	 * Use an item
	 */
	executeUse(target: string, gameState: GameState): CommandResult {
		if (!target) {
			return {
				success: false,
				message: 'What do you want to use?',
				messageType: MessageType.ERROR
			};
		}

		// Check inventory for usable items
		const item = gameState.character.inventory.find(item =>
			item.name.toLowerCase().includes(target.toLowerCase())
		);

		if (!item) {
			return {
				success: false,
				message: `You don't have a ${target}.`,
				messageType: MessageType.ACTION
			};
		}

		// Handle different item types
		return this.handleItemUse(item, gameState);
	}

	/**
	 * Pick a lock
	 */
	executePickLock(target: string, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || !currentRoom.lockedExits) {
			return {
				success: false,
				message: 'There are no locks to pick here.',
				messageType: MessageType.ACTION
			};
		}

		// Find a lock that matches the target
		const locks = Array.from(currentRoom.lockedExits.values());
		const lock = locks.find(l => l.type.toLowerCase().includes(target.toLowerCase()));

		if (!lock) {
			return {
				success: false,
				message: `You don't see a ${target} lock here.`,
				messageType: MessageType.ACTION
			};
		}

		const result = this.interactionSystem.attemptLockPicking(gameState.character, lock);
		return {
			success: result.success,
			message: result.message,
			messageType: result.success ? MessageType.ACTION : MessageType.ERROR
		};
	}

	/**
	 * Detect traps
	 */
	executeDetectTraps(gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || !currentRoom.traps) {
			return {
				success: true,
				message: 'You carefully search but find no traps.',
				messageType: MessageType.ACTION
			};
		}

		let foundTraps = false;
		let message = 'You carefully search for traps.';
		const results: string[] = [];

		for (const trap of currentRoom.traps) {
			if (!trap.detected) {
				const result = this.interactionSystem.attemptTrapDetection(gameState.character, trap);
				results.push(result.message);
				if (result.success) foundTraps = true;
			}
		}

		if (results.length > 0) {
			message += '\n' + results.join('\n');
		}

		if (!foundTraps && results.length === 0) {
			message += ' You find no traps.';
		}

		return {
			success: true,
			message,
			messageType: MessageType.ACTION
		};
	}

	/**
	 * Disarm a trap
	 */
	executeDisarmTrap(target: string, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || !currentRoom.traps) {
			return {
				success: false,
				message: 'There are no traps here to disarm.',
				messageType: MessageType.ACTION
			};
		}

		const trap = currentRoom.traps.find(t =>
			t.name.toLowerCase().includes(target.toLowerCase())
		);

		if (!trap) {
			return {
				success: false,
				message: `You don't see a ${target} trap here.`,
				messageType: MessageType.ACTION
			};
		}

		const result = this.interactionSystem.attemptTrapDisarming(gameState.character, trap);
		return {
			success: result.success,
			message: result.message,
			messageType: result.success ? MessageType.ACTION : MessageType.ERROR
		};
	}

	/**
	 * Solve a puzzle
	 */
	executeSolvePuzzle(answer: string, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || !currentRoom.puzzles || currentRoom.puzzles.length === 0) {
			return {
				success: false,
				message: 'There are no puzzles here to solve.',
				messageType: MessageType.ACTION
			};
		}

		// Find first unsolved puzzle
		const puzzle = currentRoom.puzzles.find(p => !p.solved);
		if (!puzzle) {
			return {
				success: false,
				message: 'All puzzles here have been solved.',
				messageType: MessageType.ACTION
			};
		}

		const result = this.interactionSystem.attemptPuzzle(gameState.character, puzzle, answer);
		return {
			success: result.success,
			message: result.message,
			messageType: result.success ? MessageType.ACTION : MessageType.ERROR
		};
	}

	/**
	 * Activate an interactive element
	 */
	executeActivate(target: string, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || !currentRoom.interactiveElements) {
			return {
				success: false,
				message: 'There are no interactive elements here.',
				messageType: MessageType.ACTION
			};
		}

		const element = currentRoom.interactiveElements.find(e =>
			e.name.toLowerCase().includes(target.toLowerCase())
		);

		if (!element) {
			return {
				success: false,
				message: `You don't see a ${target} to activate here.`,
				messageType: MessageType.ACTION
			};
		}

		const result = this.interactiveElementSystem.activateInteractiveElement(gameState.character, element, gameState);
		return {
			success: result.success,
			message: result.message,
			messageType: result.success ? MessageType.ACTION : MessageType.ERROR
		};
	}

	/**
	 * Pull something
	 */
	executePull(target: string, gameState: GameState): CommandResult {
		return this.genericElementInteraction(target, gameState, 'pull');
	}

	/**
	 * Push something
	 */
	executePush(target: string, gameState: GameState): CommandResult {
		return this.genericElementInteraction(target, gameState, 'push');
	}

	/**
	 * Touch something
	 */
	executeTouch(target: string, gameState: GameState): CommandResult {
		return this.genericElementInteraction(target, gameState, 'touch');
	}

	/**
	 * Generic interaction with interactive elements or features
	 */
	private genericElementInteraction(target: string, gameState: GameState, action: string): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return {
				success: false,
				message: `Cannot ${action} anything here.`,
				messageType: MessageType.ERROR
			};
		}

		// Check interactive elements
		if (currentRoom.interactiveElements) {
			const element = currentRoom.interactiveElements.find(e =>
				e.name.toLowerCase().includes(target.toLowerCase())
			);

			if (element) {
				const result = this.interactiveElementSystem.activateInteractiveElement(gameState.character, element, gameState);
				return {
					success: result.success,
					message: `You ${action} the ${element.name}. ${result.message}`,
					messageType: result.success ? MessageType.ACTION : MessageType.ERROR
				};
			}
		}

		// Check features
		const feature = currentRoom.contents.features.find(f =>
			f.name.toLowerCase().includes(target.toLowerCase())
		);

		if (feature) {
			return {
				success: true,
				message: `You ${action} the ${feature.name}. ${feature.description}`,
				messageType: MessageType.ACTION
			};
		}

		return {
			success: false,
			message: `You don't see a ${target} to ${action} here.`,
			messageType: MessageType.ACTION
		};
	}

	/**
	 * Wait/pass turn
	 */
	executeWait(gameState: GameState): CommandResult {
		gameState.turnCount++;
		return {
			success: true,
			message: 'You wait for a moment.',
			messageType: MessageType.ACTION
		};
	}

	/**
	 * Rest to recover HP/Mana
	 */
	executeRest(gameState: GameState): CommandResult {
		if (gameState.combatState) {
			return {
				success: false,
				message: 'You cannot rest during combat!',
				messageType: MessageType.ERROR
			};
		}

		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (currentRoom && currentRoom.contents.enemies && currentRoom.contents.enemies.length > 0) {
			return {
				success: false,
				message: 'You cannot rest with enemies nearby!',
				messageType: MessageType.ERROR
			};
		}

		// Restore some HP
		const character = gameState.character;
		const healAmount = Math.floor(character.hp.max * 0.25);
		const actualHeal = Math.min(healAmount, character.hp.max - character.hp.current);

		character.hp.current += actualHeal;

		// Restore some mana if character has it
		let manaMessage = '';
		if (character.mana) {
			const manaRestore = Math.floor(character.mana.max * 0.25);
			const actualManaRestore = Math.min(manaRestore, character.mana.max - character.mana.current);
			character.mana.current += actualManaRestore;
			manaMessage = ` You also restore ${actualManaRestore} mana.`;
		}

		gameState.turnCount++;

		return {
			success: true,
			message: `You rest and recover ${actualHeal} health.${manaMessage}`,
			messageType: MessageType.ACTION
		};
	}

	/**
	 * Show help
	 */
	executeHelp(): CommandResult {
		const helpText = `Available Commands:

Movement: north, south, east, west (or n, s, e, w)
Actions: look, search, examine [target], get [item], drop [item]
Inventory: inventory, equip [item], unequip [item], use [item]
Combat: attack [target], defend, flee, cast [spell]
Interaction: activate [target], pull [target], push [target], touch [target]
Locks & Traps: pick lock [direction], detect traps, disarm trap [target]
Other: rest, wait, help

You can also use the mouse to click on UI elements and buttons for common actions.`;

		return {
			success: true,
			message: helpText,
			messageType: MessageType.SYSTEM
		};
	}

	/**
	 * Handle using different types of items
	 */
	private handleItemUse(item: any, _gameState: GameState): CommandResult {
		// This would need to be expanded based on item types and effects
		// For now, just a basic response
		switch (item.baseType) {
			case ItemType.POTION:
				// Handle consumable items like potions
				return {
					success: true,
					message: `You use the ${item.name}.`,
					messageType: MessageType.ACTION
				};

			case ItemType.TREASURE:
				// Handle tools like lockpicks, keys, etc.
				return {
					success: true,
					message: `You use the ${item.name}.`,
					messageType: MessageType.ACTION
				};

			default:
				return {
					success: false,
					message: `You can't use the ${item.name} like that.`,
					messageType: MessageType.ACTION
				};
		}
	}
}