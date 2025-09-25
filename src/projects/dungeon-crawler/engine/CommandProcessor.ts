import type { Command } from '../models/Command';
import { ActionType, Direction } from '../models/Command';
import type { GameState } from '../models/Room';
import { MessageType } from '../models/Room';
import { InteractionSystem } from './InteractionSystem';
import { EnvironmentalSystem } from './EnvironmentalSystem';

export interface CommandResult {
	success: boolean;
	message?: string;
	messageType?: MessageType;
}

export class CommandProcessor {
	private interactionSystem: InteractionSystem;
	private environmentalSystem: EnvironmentalSystem;

	constructor() {
		this.interactionSystem = new InteractionSystem();
		this.environmentalSystem = new EnvironmentalSystem();
	}
	parseCommand(input: string): Command {
		const words = input.toLowerCase().trim().split(/\s+/);
		const verb = words[0] || '';
		const target = words.slice(1).join(' ');

		// Movement commands
		if (this.isDirectionCommand(verb)) {
			return {
				action: ActionType.MOVE,
				direction: this.parseDirection(verb)
			};
		}

		// Other commands
		switch (verb) {
			case 'look':
			case 'l':
				return { action: ActionType.LOOK };

			case 'search':
				return { action: ActionType.SEARCH };

			case 'inventory':
			case 'inv':
			case 'i':
				return { action: ActionType.INVENTORY };

			case 'get':
			case 'take':
				return { action: ActionType.GET, target };

			case 'drop':
				return { action: ActionType.DROP, target };

			case 'examine':
			case 'exam':
			case 'x':
				return { action: ActionType.EXAMINE, target };

			case 'equip':
			case 'wield':
				return { action: ActionType.EQUIP, target };

			case 'unequip':
			case 'unwield':
				return { action: ActionType.UNEQUIP, target };

			case 'use':
				return { action: ActionType.USE, target };

			case 'attack':
			case 'kill':
			case 'fight':
				return { action: ActionType.ATTACK, target };

			case 'defend':
			case 'block':
				return { action: ActionType.DEFEND };

			case 'flee':
			case 'run':
			case 'escape':
				return { action: ActionType.FLEE };

			case 'cast':
			case 'spell':
				return { action: ActionType.CAST, spellId: target };

			case 'pick':
			case 'lockpick':
				if (words[1] === 'lock' || words.includes('lock')) {
					return { action: ActionType.PICK_LOCK, target };
				}
				return { action: ActionType.GET, target };

			case 'detect':
				if (words[1] === 'traps' || words.includes('traps')) {
					return { action: ActionType.DETECT_TRAPS };
				}
				return { action: ActionType.SEARCH };

			case 'disarm':
				return { action: ActionType.DISARM_TRAP, target };

			case 'solve':
			case 'answer':
				return { action: ActionType.SOLVE_PUZZLE, answer: target };

			case 'activate':
			case 'use':
				if (words.includes('lever') || words.includes('switch') || words.includes('altar') || words.includes('fountain')) {
					return { action: ActionType.ACTIVATE, target };
				}
				return { action: ActionType.USE, target };

			case 'pull':
				return { action: ActionType.PULL, target };

			case 'push':
				return { action: ActionType.PUSH, target };

			case 'touch':
				return { action: ActionType.TOUCH, target };

			case 'wait':
				return { action: ActionType.WAIT };

			case 'rest':
			case 'sleep':
				return { action: ActionType.REST };

			case 'help':
			case '?':
				return { action: ActionType.HELP };

			default:
				throw new Error(`Unknown command: ${verb}. Type 'help' for available commands.`);
		}
	}

	async executeCommand(command: Command, gameState: GameState): Promise<CommandResult> {
		switch (command.action) {
			case ActionType.MOVE:
				return this.executeMove(command.direction!, gameState);

			case ActionType.LOOK:
				return this.executeLook(gameState);

			case ActionType.SEARCH:
				return this.executeSearch(gameState);

			case ActionType.INVENTORY:
				return this.executeInventory(gameState);

			case ActionType.GET:
				return this.executeGet(command.target!, gameState);

			case ActionType.EXAMINE:
				return this.executeExamine(command.target!, gameState);

			case ActionType.HELP:
				return this.executeHelp();

			case ActionType.REST:
				return this.executeRest(gameState);

			case ActionType.EQUIP:
				return this.executeEquip(command.target!, gameState);

			case ActionType.UNEQUIP:
				return this.executeUnequip(command.target!, gameState);

			case ActionType.USE:
				return this.executeUse(command.target!, gameState);

			case ActionType.DROP:
				return this.executeDrop(command.target!, gameState);

			case ActionType.CAST:
				return this.executeCast(command.spellId!, gameState);

			case ActionType.PICK_LOCK:
				return this.executePickLock(command.target, gameState);

			case ActionType.DETECT_TRAPS:
				return this.executeDetectTraps(gameState);

			case ActionType.DISARM_TRAP:
				return this.executeDisarmTrap(command.target, gameState);

			case ActionType.SOLVE_PUZZLE:
				return this.executeSolvePuzzle(command.answer, gameState);

			case ActionType.ACTIVATE:
				return this.executeActivate(command.target, gameState);

			case ActionType.PULL:
				return this.executePull(command.target, gameState);

			case ActionType.PUSH:
				return this.executePush(command.target, gameState);

			case ActionType.TOUCH:
				return this.executeTouch(command.target, gameState);

			case ActionType.WAIT:
				return this.executeWait(gameState);

			default:
				return {
					success: false,
					message: `Command '${command.action}' is not yet implemented.`
				};
		}
	}

	private isDirectionCommand(word: string): boolean {
		const directionWords = ['north', 'n', 'south', 's', 'east', 'e', 'west', 'w'];
		return directionWords.includes(word);
	}

	private parseDirection(word: string): Direction {
		switch (word) {
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
			default:
				throw new Error(`Invalid direction: ${word}`);
		}
	}

	private executeMove(direction: Direction, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return { success: false, message: "You are in an unknown location." };
		}

		const targetRoomId = currentRoom.exits.get(direction);
		if (!targetRoomId) {
			return { success: false, message: `You cannot go ${direction}.` };
		}

		const targetRoom = gameState.dungeon.rooms.get(targetRoomId);
		if (!targetRoom) {
			return { success: false, message: "The path leads nowhere." };
		}

		// Check for combat
		if (currentRoom.contents.enemies.length > 0) {
			return { success: false, message: "You cannot leave while enemies are present!" };
		}

		// Move to the new room
		gameState.currentRoomId = targetRoomId;

		// Describe the new room
		let description = this.getBasicRoomDescription(targetRoom);

		// Add details about exits
		const exits = Array.from(targetRoom.exits.keys());
		if (exits.length > 0) {
			description += `\n\nExits: ${exits.join(', ')}`;
		}

		// Add details about items
		if (targetRoom.contents.items.length > 0) {
			const itemNames = targetRoom.contents.items.map(item => item.name);
			description += `\n\nYou see: ${itemNames.join(', ')}`;
		}

		// Add details about enemies
		if (targetRoom.contents.enemies.length > 0) {
			const enemyNames = targetRoom.contents.enemies.map(enemy => enemy.name);
			description += `\n\nEnemies: ${enemyNames.join(', ')}`;
		}

		targetRoom.visited = true;

		return {
			success: true,
			message: `You go ${direction}.\n\n${description}`,
			messageType: MessageType.DESCRIPTION
		};
	}

	private executeLook(gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return { success: false, message: "You are in an unknown location." };
		}

		let description = this.getBasicRoomDescription(currentRoom);

		// Add details about exits
		const exits = Array.from(currentRoom.exits.keys());
		if (exits.length > 0) {
			description += `\n\nExits: ${exits.join(', ')}`;
		}

		// Add details about items
		if (currentRoom.contents.items.length > 0) {
			const itemNames = currentRoom.contents.items.map(item => item.name);
			description += `\n\nYou see: ${itemNames.join(', ')}`;
		}

		// Add details about enemies
		if (currentRoom.contents.enemies.length > 0) {
			const enemyNames = currentRoom.contents.enemies.map(enemy => enemy.name);
			description += `\n\nEnemies: ${enemyNames.join(', ')}`;
		}

		return {
			success: true,
			message: description,
			messageType: MessageType.DESCRIPTION
		};
	}

	private executeSearch(gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return { success: false, message: "You are in an unknown location." };
		}

		if (currentRoom.contents.searched) {
			return { success: true, message: "You have already thoroughly searched this room." };
		}

		currentRoom.contents.searched = true;
		return { success: true, message: "You search the room thoroughly but find nothing of interest." };
	}

	private executeInventory(gameState: GameState): CommandResult {
		const { inventory } = gameState.character;

		if (inventory.length === 0) {
			return { success: true, message: "Your inventory is empty." };
		}

		const itemNames = inventory.map(item => item.name);
		return {
			success: true,
			message: `Inventory:\n${itemNames.join('\n')}`
		};
	}

	private executeGet(targetName: string, gameState: GameState): CommandResult {
		if (!targetName) {
			return { success: false, message: "Get what?" };
		}

		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return { success: false, message: "You are in an unknown location." };
		}

		const item = currentRoom.contents.items.find(
			item => item.name.toLowerCase().includes(targetName.toLowerCase())
		);

		if (!item) {
			return { success: false, message: `There is no ${targetName} here.` };
		}

		// Remove item from room and add to inventory
		currentRoom.contents.items = currentRoom.contents.items.filter(i => i !== item);
		gameState.character.inventory.push(item);

		return { success: true, message: `You take the ${item.name}.` };
	}

	private executeExamine(targetName: string, _gameState: GameState): CommandResult {
		if (!targetName) {
			return { success: false, message: "Examine what?" };
		}

		// For now, just provide basic examination
		return { success: true, message: `You examine the ${targetName}. Nothing special stands out.` };
	}

	private executeHelp(): CommandResult {
		const helpText = `Available commands:
Movement: north (n), south (s), east (e), west (w)
Looking: look (l), search, examine <item>
Items: get <item>, drop <item>, inventory (i), equip <item>, use <item>
Combat: attack <enemy>, defend, flee
Magic: cast <spell>
Interaction: pick lock <direction>, detect traps, disarm <trap>, solve <answer>
Environment: activate <element>, pull <lever>, push <button>, touch <object>, wait
Other: rest, help

Examples:
- go north
- look
- get sword
- attack goblin
- cast fireball
- pick lock north
- detect traps
- disarm poison dart
- solve echo
- activate lever
- pull lever
- push button
- touch altar
- wait
- inventory`;

		return { success: true, message: helpText };
	}

	private executeEquip(targetName: string, gameState: GameState): CommandResult {
		if (!targetName) {
			return { success: false, message: "Equip what?" };
		}

		const character = gameState.character;
		const item = character.inventory.find(
			item => item.name.toLowerCase().includes(targetName.toLowerCase())
		);

		if (!item) {
			return { success: false, message: `You don't have a ${targetName} in your inventory.` };
		}

		// Check if item can be equipped
		switch (item.baseType) {
			case 'weapon':
				if (character.equipment.weapon) {
					character.inventory.push(character.equipment.weapon);
				}
				character.equipment.weapon = item;
				break;
			case 'armor':
				if (character.equipment.armor) {
					character.inventory.push(character.equipment.armor);
				}
				character.equipment.armor = item;
				break;
			case 'shield':
				if (character.equipment.shield) {
					character.inventory.push(character.equipment.shield);
				}
				character.equipment.shield = item;
				break;
			default:
				return { success: false, message: `You can't equip ${item.name}.` };
		}

		// Remove from inventory
		character.inventory = character.inventory.filter(i => i !== item);

		// Recalculate stats (simplified)
		this.recalculateCharacterStats(character);

		return { success: true, message: `You equip the ${item.name}.` };
	}

	private executeUnequip(targetName: string, gameState: GameState): CommandResult {
		if (!targetName) {
			return { success: false, message: "Unequip what?" };
		}

		const character = gameState.character;
		const equipment = character.equipment;

		let item;
		if (equipment.weapon?.name.toLowerCase().includes(targetName.toLowerCase())) {
			item = equipment.weapon;
			equipment.weapon = undefined;
		} else if (equipment.armor?.name.toLowerCase().includes(targetName.toLowerCase())) {
			item = equipment.armor;
			equipment.armor = undefined;
		} else if (equipment.shield?.name.toLowerCase().includes(targetName.toLowerCase())) {
			item = equipment.shield;
			equipment.shield = undefined;
		}

		if (!item) {
			return { success: false, message: `You don't have ${targetName} equipped.` };
		}

		character.inventory.push(item);
		this.recalculateCharacterStats(character);

		return { success: true, message: `You unequip the ${item.name}.` };
	}

	private executeUse(targetName: string, gameState: GameState): CommandResult {
		if (!targetName) {
			return { success: false, message: "Use what?" };
		}

		const character = gameState.character;
		const item = character.inventory.find(
			item => item.name.toLowerCase().includes(targetName.toLowerCase())
		);

		if (!item) {
			return { success: false, message: `You don't have a ${targetName}.` };
		}

		// Handle consumable items
		if (item.baseType === 'potion') {
			const healingProperty = item.properties.find(p => p.type === 'healing');
			if (healingProperty) {
				const healing = healingProperty.value;
				const oldHp = character.hp.current;
				character.hp.current = Math.min(character.hp.max, character.hp.current + healing);
				const actualHealing = character.hp.current - oldHp;

				// Remove item from inventory
				character.inventory = character.inventory.filter(i => i !== item);

				return {
					success: true,
					message: `You drink the ${item.name} and recover ${actualHealing} hit points.`
				};
			}
		}

		return { success: false, message: `You can't use the ${item.name}.` };
	}

	private executeDrop(targetName: string, gameState: GameState): CommandResult {
		if (!targetName) {
			return { success: false, message: "Drop what?" };
		}

		const character = gameState.character;
		const item = character.inventory.find(
			item => item.name.toLowerCase().includes(targetName.toLowerCase())
		);

		if (!item) {
			return { success: false, message: `You don't have a ${targetName}.` };
		}

		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return { success: false, message: "You are in an unknown location." };
		}

		// Remove from inventory and add to room
		character.inventory = character.inventory.filter(i => i !== item);
		currentRoom.contents.items.push(item);

		return { success: true, message: `You drop the ${item.name}.` };
	}

	private recalculateCharacterStats(_character: any): void {
		// This is a simplified stat recalculation
		// In a full implementation, this would handle all stat bonuses from equipment
		// For now, we'll just ensure the character object is updated
	}

	private executeRest(gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return { success: false, message: "You are in an unknown location." };
		}

		if (currentRoom.contents.enemies.length > 0) {
			return { success: false, message: "You cannot rest while enemies are present!" };
		}

		// Restore some HP
		const character = gameState.character;
		const healAmount = Math.floor(character.hp.max * 0.25);
		const actualHeal = Math.min(healAmount, character.hp.max - character.hp.current);

		character.hp.current += actualHeal;

		if (actualHeal > 0) {
			return { success: true, message: `You rest and recover ${actualHeal} hit points.` };
		} else {
			return { success: true, message: "You rest, but you are already at full health." };
		}
	}

	private executeCast(spellId: string, _gameState: GameState): CommandResult {
		if (!spellId) {
			return { success: false, message: "Cast what spell? Use the spellbook interface to cast spells." };
		}

		// Text-based spell casting is handled through the UI
		// This provides a helpful message to use the spellbook
		return {
			success: false,
			message: "Use the 'Spell Book' button to cast spells with a visual interface. Type 'help' for other commands."
		};
	}

	private executePickLock(direction: string | undefined, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return { success: false, message: "You are in an unknown location." };
		}

		if (!direction) {
			return { success: false, message: "Pick lock in which direction? (north, south, east, west)" };
		}

		const dir = this.parseDirectionFromString(direction);
		if (!dir) {
			return { success: false, message: "Invalid direction. Try north, south, east, west." };
		}

		const lock = currentRoom.lockedExits?.get(dir);
		if (!lock) {
			return { success: false, message: `There is no locked door to the ${dir}.` };
		}

		const result = this.interactionSystem.attemptLockPicking(gameState.character, lock);
		return { success: result.success, message: result.message };
	}

	private executeDetectTraps(gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || !currentRoom.traps || currentRoom.traps.length === 0) {
			return { success: true, message: "You carefully search for traps but find none." };
		}

		const messages: string[] = [];
		let foundAny = false;

		for (const trap of currentRoom.traps) {
			if (!trap.detected) {
				const result = this.interactionSystem.attemptTrapDetection(gameState.character, trap);
				messages.push(result.message);
				if (result.success) foundAny = true;
			}
		}

		if (messages.length === 0) {
			return { success: true, message: "You've already detected all the traps in this area." };
		}

		return {
			success: foundAny,
			message: messages.join(' ')
		};
	}

	private executeDisarmTrap(trapName: string | undefined, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || !currentRoom.traps || currentRoom.traps.length === 0) {
			return { success: false, message: "There are no traps here to disarm." };
		}

		if (!trapName) {
			const detectedTraps = currentRoom.traps.filter(t => t.detected && !t.disarmed);
			if (detectedTraps.length === 0) {
				return { success: false, message: "There are no detected traps to disarm." };
			}
			if (detectedTraps.length === 1) {
				const trap = detectedTraps[0];
				if (trap) {
					const result = this.interactionSystem.attemptTrapDisarming(gameState.character, trap);
					return { success: result.success, message: result.message };
				}
				return { success: false, message: "No trap found to disarm." };
			}
			return { success: false, message: `Which trap? Available: ${detectedTraps.map(t => t.name).join(', ')}` };
		}

		const trap = currentRoom.traps.find(t => t.name.toLowerCase().includes(trapName.toLowerCase()) && t.detected);
		if (!trap) {
			return { success: false, message: "You don't see that trap, or it hasn't been detected yet." };
		}

		const result = this.interactionSystem.attemptTrapDisarming(gameState.character, trap);
		return { success: result.success, message: result.message };
	}

	private executeSolvePuzzle(answer: string | undefined, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || !currentRoom.puzzles || currentRoom.puzzles.length === 0) {
			return { success: false, message: "There are no puzzles here to solve." };
		}

		if (!answer) {
			return { success: false, message: "What's your answer to the puzzle?" };
		}

		const unsolvedPuzzles = currentRoom.puzzles.filter(p => !p.solved);
		if (unsolvedPuzzles.length === 0) {
			return { success: false, message: "All puzzles in this room have been solved." };
		}

		// If there's only one puzzle, use it. Otherwise, use the first unsolved one.
		const puzzle = unsolvedPuzzles[0];
		if (puzzle) {
			const result = this.interactionSystem.attemptPuzzle(gameState.character, puzzle, answer);

			// Add any items to character inventory
			if (result.success && result.itemsFound) {
				for (const item of result.itemsFound) {
					gameState.character.inventory.push(item);
				}
			}

			return { success: result.success, message: result.message };
		}

		return { success: false, message: "No puzzle found to solve." };
	}

	private parseDirectionFromString(dirStr: string): Direction | undefined {
		const lower = dirStr.toLowerCase();
		if (lower.includes('north') || lower === 'n') return Direction.NORTH;
		if (lower.includes('south') || lower === 's') return Direction.SOUTH;
		if (lower.includes('east') || lower === 'e') return Direction.EAST;
		if (lower.includes('west') || lower === 'w') return Direction.WEST;
		return undefined;
	}

	private executeActivate(targetName: string | undefined, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || !currentRoom.interactiveElements || currentRoom.interactiveElements.length === 0) {
			return { success: false, message: "There's nothing here to activate." };
		}

		if (!targetName) {
			const availableElements = currentRoom.interactiveElements.map(e => e.name);
			return { success: false, message: `Activate what? Available: ${availableElements.join(', ')}` };
		}

		const element = currentRoom.interactiveElements.find(
			e => e.name.toLowerCase().includes(targetName.toLowerCase()) || e.type.toLowerCase().includes(targetName.toLowerCase())
		);

		if (!element) {
			return { success: false, message: `There's no ${targetName} here to activate.` };
		}

		const result = this.environmentalSystem.activateInteractiveElement(element, gameState);
		return { success: result.success, message: result.message };
	}

	private executePull(targetName: string | undefined, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || !currentRoom.interactiveElements) {
			return { success: false, message: "There's nothing here to pull." };
		}

		if (!targetName) {
			return { success: false, message: "Pull what?" };
		}

		const element = currentRoom.interactiveElements.find(
			e => e.name.toLowerCase().includes(targetName.toLowerCase()) &&
				 (e.type === 'lever' || e.type === 'switch' || targetName.toLowerCase().includes('lever'))
		);

		if (!element) {
			return { success: false, message: `There's no ${targetName} here to pull.` };
		}

		const result = this.environmentalSystem.activateInteractiveElement(element, gameState);
		return { success: result.success, message: result.message };
	}

	private executePush(targetName: string | undefined, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || !currentRoom.interactiveElements) {
			return { success: false, message: "There's nothing here to push." };
		}

		if (!targetName) {
			return { success: false, message: "Push what?" };
		}

		const element = currentRoom.interactiveElements.find(
			e => e.name.toLowerCase().includes(targetName.toLowerCase()) &&
				 (e.type === 'pressure_plate' || e.type === 'switch' || targetName.toLowerCase().includes('button'))
		);

		if (!element) {
			return { success: false, message: `There's no ${targetName} here to push.` };
		}

		const result = this.environmentalSystem.activateInteractiveElement(element, gameState);
		return { success: result.success, message: result.message };
	}

	private executeTouch(targetName: string | undefined, gameState: GameState): CommandResult {
		if (!targetName) {
			return { success: false, message: "Touch what?" };
		}

		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return { success: false, message: "You are in an unknown location." };
		}

		// Check for interactive elements first
		if (currentRoom.interactiveElements) {
			const element = currentRoom.interactiveElements.find(
				e => e.name.toLowerCase().includes(targetName.toLowerCase())
			);
			if (element) {
				const result = this.environmentalSystem.activateInteractiveElement(element, gameState);
				return { success: result.success, message: result.message };
			}
		}

		// Generic touch response
		return { success: true, message: `You touch the ${targetName}. It feels cold and rough to the touch.` };
	}

	private executeWait(gameState: GameState): CommandResult {
		// Process environmental effects for this turn
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (currentRoom && currentRoom.hazards && currentRoom.hazards.length > 0) {
			const results = this.environmentalSystem.processEnvironmentalEffects(currentRoom, gameState.character);
			if (results.length > 0) {
				return {
					success: true,
					message: `You wait and observe your surroundings.\n${results.join(' ')}`,
					messageType: MessageType.SYSTEM
				};
			}
		}

		// Increment turn counter
		gameState.turnCount++;

		return { success: true, message: "You wait and observe your surroundings." };
	}

	private getBasicRoomDescription(room: any): string {
		let description = '';

		switch (room.roomType) {
			case 'entrance':
				description = "You stand at the entrance to the dungeon. Ancient stone walls stretch into darkness ahead.";
				break;
			case 'corridor':
				description = "You are in a narrow stone corridor. Torchlight flickers against the damp walls.";
				break;
			case 'chamber':
				description = "You enter a large chamber with high vaulted ceilings. Shadows dance in the corners.";
				break;
			case 'armory':
				description = "This appears to be an old armory. Weapon racks line the walls, though most are empty.";
				break;
			case 'library':
				description = "You are in what was once a library. Dusty tomes and scrolls are scattered about.";
				break;
			case 'throne_room':
				description = "A grand throne room stretches before you. An ornate throne sits upon a raised dais.";
				break;
			case 'treasure_room':
				description = "This room glitters with the promise of treasure. Gold coins are scattered on the floor.";
				break;
			default:
				description = "You are in a stone room. The walls are rough-hewn and ancient.";
		}

		// Add environmental hazard descriptions
		if (room.hazards && room.hazards.length > 0) {
			const hazardDescriptions = room.hazards.map((hazard: any) => {
				switch (hazard.type) {
					case 'poison_gas':
						return 'A sickly green mist hangs in the air.';
					case 'extreme_cold':
						return 'Your breath mists in the frigid air.';
					case 'magical_darkness':
						return 'Unnatural shadows seem to writhe and move.';
					case 'unstable_floor':
						return 'The floor creaks ominously underfoot.';
					default:
						return hazard.description;
				}
			});
			description += ` ${hazardDescriptions.join(' ')}`;
		}

		// Add interactive element descriptions
		if (room.interactiveElements && room.interactiveElements.length > 0) {
			const elementDescriptions = room.interactiveElements.map((element: any) => {
				if (element.type === 'lever') {
					return element.activated ? 'A lever sits in the pulled position.' : 'A lever protrudes from the wall.';
				} else if (element.type === 'altar') {
					return 'An ancient altar stands in the center of the room.';
				} else if (element.type === 'fountain') {
					return 'A stone fountain bubbles quietly.';
				}
				return element.description;
			});
			description += ` ${elementDescriptions.join(' ')}`;
		}

		return description;
	}
}