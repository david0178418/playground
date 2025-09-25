import type { GameState, Message } from '../models/Room';
import { MessageType } from '../models/Room';
import type { Character, StatBlock } from '../models/Character';
import { CharacterClass } from '../models/Character';
import { DungeonGenerator } from './DungeonGenerator';
import { CommandProcessor } from './CommandProcessor';
import { RandomGenerator } from '../utils/RandomGenerator';

export class GameEngine {
	private dungeonGenerator: DungeonGenerator;
	private commandProcessor: CommandProcessor;
	private rng: RandomGenerator;

	constructor() {
		this.rng = new RandomGenerator();
		this.dungeonGenerator = new DungeonGenerator(this.rng);
		this.commandProcessor = new CommandProcessor();
	}

	async startNewGame(): Promise<GameState> {
		// Create a new character
		const character = this.createDefaultCharacter();

		// Generate a new dungeon
		const dungeon = this.dungeonGenerator.generateDungeon();

		// Create initial game state
		const gameState: GameState = {
			character,
			dungeon,
			currentRoomId: dungeon.entranceRoomId,
			messageLog: [],
			turnCount: 0
		};

		// Add welcome message and initial room description
		this.addMessage(gameState, "Welcome to the Dungeon Crawler!", MessageType.SYSTEM);
		this.addMessage(gameState, "Type 'help' for available commands.", MessageType.SYSTEM);

		// Describe the initial room
		await this.lookAtCurrentRoom(gameState);

		return gameState;
	}

	async processCommand(commandText: string, gameState: GameState): Promise<GameState> {
		try {
			const command = this.commandProcessor.parseCommand(commandText);
			const newState = { ...gameState };

			const result = await this.commandProcessor.executeCommand(command, newState);

			if (result.success) {
				newState.turnCount++;
				if (result.message) {
					this.addMessage(newState, result.message, result.messageType || MessageType.ACTION);
				}
			} else {
				this.addMessage(newState, result.message || "Command failed.", MessageType.ERROR);
			}

			return newState;
		} catch (error) {
			const newState = { ...gameState };
			this.addMessage(newState, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, MessageType.ERROR);
			return newState;
		}
	}

	private createDefaultCharacter(): Character {
		const stats: StatBlock = {
			strength: 14,
			dexterity: 13,
			constitution: 15,
			intelligence: 12,
			wisdom: 14,
			charisma: 10
		};

		const hp = this.calculateHitPoints(stats.constitution, 1);

		return {
			name: "Adventurer",
			class: CharacterClass.FIGHTER,
			level: 1,
			stats,
			hp: { current: hp, max: hp },
			equipment: {},
			inventory: [],
			experience: 0
		};
	}

	private calculateHitPoints(constitution: number, level: number): number {
		const conModifier = Math.floor((constitution - 10) / 2);
		// Fighter gets d10 hit die, starting HP is max + con modifier
		const baseHP = 10 + conModifier;
		// Additional levels get average of hit die + con modifier
		const additionalHP = (level - 1) * (5 + conModifier);
		return Math.max(1, baseHP + additionalHP);
	}

	private async lookAtCurrentRoom(gameState: GameState): Promise<void> {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			this.addMessage(gameState, "You are in an unknown location.", MessageType.ERROR);
			return;
		}

		// Basic room description
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

		currentRoom.visited = true;
		this.addMessage(gameState, description, MessageType.DESCRIPTION);
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

	private addMessage(gameState: GameState, text: string, type: MessageType): void {
		const message: Message = {
			id: `${Date.now()}-${Math.random()}`,
			text,
			timestamp: Date.now(),
			type
		};
		gameState.messageLog.push(message);

		// Keep only last 100 messages
		if (gameState.messageLog.length > 100) {
			gameState.messageLog = gameState.messageLog.slice(-100);
		}
	}
}