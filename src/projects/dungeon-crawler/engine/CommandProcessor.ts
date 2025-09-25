import type { Command } from '../models/Command';
import { ActionType, Direction } from '../models/Command';
import type { GameState } from '../models/Room';
import { MessageType } from '../models/Room';

export interface CommandResult {
	success: boolean;
	message?: string;
	messageType?: MessageType;
}

export class CommandProcessor {
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
Other: rest, help

Examples:
- go north
- look
- get sword
- attack goblin
- inventory`;

		return { success: true, message: helpText };
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

	private getBasicRoomDescription(room: any): string {
		switch (room.roomType) {
			case 'entrance':
				return "You stand at the entrance to the dungeon. Ancient stone walls stretch into darkness ahead.";
			case 'corridor':
				return "You are in a narrow stone corridor. Torchlight flickers against the damp walls.";
			case 'chamber':
				return "You enter a large chamber with high vaulted ceilings. Shadows dance in the corners.";
			case 'armory':
				return "This appears to be an old armory. Weapon racks line the walls, though most are empty.";
			case 'library':
				return "You are in what was once a library. Dusty tomes and scrolls are scattered about.";
			case 'throne_room':
				return "A grand throne room stretches before you. An ornate throne sits upon a raised dais.";
			case 'treasure_room':
				return "This room glitters with the promise of treasure. Gold coins are scattered on the floor.";
			default:
				return "You are in a stone room. The walls are rough-hewn and ancient.";
		}
	}
}