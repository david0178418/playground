import type { GameState, Message } from '../models/Room';
import { MessageType } from '../models/Room';
import type { Character, StatBlock } from '../models/Character';
import { CharacterClass } from '../models/Character';
import { CLASS_ABILITIES } from '../models/ClassAbilities';
import { CombatActionType, CombatStatus, ParticipantType } from '../models/Combat';
import { DungeonGenerator } from './DungeonGenerator';
import { CommandProcessor } from './CommandProcessor';
import { CombatSystem } from './CombatSystem';
import { MagicSystem } from './MagicSystem';
import { InteractionSystem } from './InteractionSystem';
import { RandomGenerator } from '../utils/RandomGenerator';

export class GameEngine {
	private dungeonGenerator: DungeonGenerator;
	private commandProcessor: CommandProcessor;
	private combatSystem: CombatSystem;
	private magicSystem: MagicSystem;
	private interactionSystem: InteractionSystem;
	private rng: RandomGenerator;

	constructor() {
		this.rng = new RandomGenerator();
		this.dungeonGenerator = new DungeonGenerator(this.rng);
		this.commandProcessor = new CommandProcessor();
		this.combatSystem = new CombatSystem();
		this.magicSystem = new MagicSystem();
		this.interactionSystem = new InteractionSystem();
	}

	getMagicSystem(): MagicSystem {
		return this.magicSystem;
	}

	async startNewGame(character?: Character): Promise<GameState> {
		// Use provided character or create default
		const gameCharacter = character || this.createDefaultCharacter();

		// Initialize class abilities
		this.initializeCharacterAbilities(gameCharacter);

		// Generate a new dungeon
		const dungeon = this.dungeonGenerator.generateDungeon();

		// Create initial game state
		const gameState: GameState = {
			character: gameCharacter,
			dungeon,
			currentRoomId: dungeon.entranceRoomId,
			messageLog: [],
			turnCount: 0
		};

		// Add welcome message and initial room description
		this.addMessage(gameState, `Welcome to the Dungeon Crawler, ${gameCharacter.name}!`, MessageType.SYSTEM);
		this.addMessage(gameState, "Type 'help' for available commands.", MessageType.SYSTEM);

		// Describe the initial room
		await this.lookAtCurrentRoom(gameState);

		return gameState;
	}

	async processCombatAction(
		action: CombatActionType,
		gameState: GameState,
		targetId?: string
	): Promise<GameState> {
		if (!gameState.combatState) {
			throw new Error('No active combat state');
		}

		const newState = { ...gameState };
		const combatState = newState.combatState;

		if (!combatState) {
			throw new Error('Combat state is undefined');
		}

		try {
			// Process player action
			const playerActions = this.combatSystem.processPlayerAction(
				combatState,
				action,
				targetId
			);

			// Add action messages to log
			for (const action of playerActions) {
				this.addMessage(newState, action.description, MessageType.COMBAT);
			}

			// Check if combat ended from player action
			const combatStatus = this.combatSystem.checkCombatEnd(combatState);
			if (combatStatus !== CombatStatus.ACTIVE) {
				return this.handleCombatEnd(newState, combatStatus);
			}

			// Advance to next turn after player action
			combatState.currentTurnIndex =
				(combatState.currentTurnIndex + 1) % combatState.turnOrder.length;

			if (combatState.currentTurnIndex === 0) {
				combatState.round++;
			}

			// Process all enemy turns until it's the player's turn again
			while (combatState.currentTurnIndex < combatState.turnOrder.length) {
				const currentParticipantId = combatState.turnOrder[combatState.currentTurnIndex];
				const currentParticipant = combatState.participants.find(p => p.id === currentParticipantId);

				// If it's the player's turn again, stop and return
				if (currentParticipant?.type === ParticipantType.PLAYER) {
					break;
				}

				// Process enemy turn
				if (currentParticipant?.type === ParticipantType.ENEMY && currentParticipant.isActive) {
					const enemyActions = this.combatSystem.executeEnemyAction(
						currentParticipant,
						CombatActionType.ATTACK,
						combatState
					);

					// Add enemy action messages to log
					for (const action of enemyActions) {
						this.addMessage(newState, action.description, MessageType.COMBAT);
					}
				}

				// Advance to next turn
				combatState.currentTurnIndex =
					(combatState.currentTurnIndex + 1) % combatState.turnOrder.length;

				if (combatState.currentTurnIndex === 0) {
					combatState.round++;
				}

				// Check if combat ended after enemy turn
				const enemyTurnStatus = this.combatSystem.checkCombatEnd(combatState);
				if (enemyTurnStatus !== CombatStatus.ACTIVE) {
					return this.handleCombatEnd(newState, enemyTurnStatus);
				}
			}

			return newState;
		} catch (error) {
			this.addMessage(newState, `Combat error: ${error instanceof Error ? error.message : 'Unknown error'}`, MessageType.ERROR);
			return newState;
		}
	}

	private handleCombatEnd(gameState: GameState, status: CombatStatus): GameState {
		const newState = { ...gameState };

		switch (status) {
			case CombatStatus.VICTORY:
				this.addMessage(newState, "🎉 Victory! You have defeated all enemies!", MessageType.SYSTEM);
				this.handleCombatVictory(newState);
				break;

			case CombatStatus.DEFEAT:
				this.addMessage(newState, "💀 You have been defeated...", MessageType.SYSTEM);
				this.handleCombatDefeat(newState);
				break;

			case CombatStatus.FLED:
				this.addMessage(newState, "🏃 You successfully fled from combat.", MessageType.SYSTEM);
				break;
		}

		// Clear combat state
		newState.combatState = undefined;

		// Update room state
		const currentRoom = newState.dungeon.rooms.get(newState.currentRoomId);
		if (currentRoom && status === CombatStatus.VICTORY) {
			// Remove defeated enemies
			currentRoom.contents.enemies = [];
		}

		return newState;
	}

	private handleCombatVictory(gameState: GameState): void {
		// Award experience and loot
		const xpGained = 50; // Simplified XP system
		gameState.character.experience += xpGained;
		this.addMessage(gameState, `You gained ${xpGained} experience points!`, MessageType.SYSTEM);

		// Check for level up (simplified)
		const newLevel = Math.floor(gameState.character.experience / 100) + 1;
		if (newLevel > gameState.character.level) {
			gameState.character.level = newLevel;
			const hpIncrease = 5; // Simplified HP increase
			gameState.character.hp.max += hpIncrease;
			gameState.character.hp.current += hpIncrease;
			this.addMessage(gameState, `🎊 Level up! You are now level ${newLevel}! (+${hpIncrease} HP)`, MessageType.SYSTEM);
		}
	}

	private handleCombatDefeat(gameState: GameState): void {
		// For now, just reset to entrance with 1 HP
		gameState.character.hp.current = 1;
		gameState.currentRoomId = gameState.dungeon.entranceRoomId;
		this.addMessage(gameState, "You awaken back at the dungeon entrance, barely alive...", MessageType.SYSTEM);
	}

	private checkForCombat(gameState: GameState): void {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || currentRoom.contents.enemies.length === 0) return;

		// Initiate combat
		gameState.combatState = this.combatSystem.initiateCombat(
			gameState.character,
			currentRoom.contents.enemies
		);

		this.addMessage(gameState, "⚔️ Combat begins!", MessageType.COMBAT);

		// Describe enemies
		const enemyNames = currentRoom.contents.enemies.map(e => e.name);
		this.addMessage(gameState, `You face: ${enemyNames.join(', ')}`, MessageType.COMBAT);

		// Process enemy turns until it's the player's turn
		this.processEnemyTurnsUntilPlayer(gameState);
	}

	private checkForTraps(gameState: GameState): void {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom || !currentRoom.traps) return;

		const trapResults = this.interactionSystem.checkTrapTriggers(gameState.character, currentRoom);

		for (const result of trapResults) {
			this.addMessage(gameState, result.message, MessageType.ERROR);

			if (result.damage) {
				this.addMessage(gameState, `You take ${result.damage} damage!`, MessageType.ERROR);
			}

			if (result.effectApplied) {
				this.addMessage(gameState, `You are ${result.effectApplied}!`, MessageType.ERROR);
			}
		}
	}

	async castSpell(
		spellId: string,
		gameState: GameState,
		targetIds?: string[]
	): Promise<GameState> {
		const newState = { ...gameState };

		try {
			// Get spell targets (for now, just damage all enemies in combat)
			let targets: (Character | any)[] = [];

			if (newState.combatState) {
				// In combat, target enemies
				const activeEnemies = newState.combatState.participants
					.filter(p => p.type === ParticipantType.ENEMY && p.isActive)
					.map(p => p.enemy!)
					.filter(Boolean);
				targets = activeEnemies;
			}

			// Cast the spell
			const result = this.magicSystem.castSpell(
				newState.character,
				spellId,
				targets,
				targetIds
			);

			if (result.success) {
				this.addMessage(newState, result.message, MessageType.COMBAT);

				// Apply damage to enemies if in combat
				if (newState.combatState && result.damage && result.damage > 0) {
					newState.combatState.participants.forEach(participant => {
						if (participant.type === ParticipantType.ENEMY && participant.enemy) {
							if (participant.enemy.hp.current <= 0) {
								participant.isActive = false;
							}
						}
					});
				}
			} else {
				this.addMessage(newState, result.message, MessageType.ERROR);
			}

			return newState;
		} catch (error) {
			this.addMessage(newState, `Spell casting failed: ${error instanceof Error ? error.message : 'Unknown error'}`, MessageType.ERROR);
			return newState;
		}
	}

	private processEnemyTurnsUntilPlayer(gameState: GameState): void {
		const combatState = gameState.combatState;
		if (!combatState) return;

		// Process enemy turns until it's the player's turn
		while (true) {
			const currentParticipantId = combatState.turnOrder[combatState.currentTurnIndex];
			const currentParticipant = combatState.participants.find(p => p.id === currentParticipantId);

			// If it's the player's turn, stop
			if (currentParticipant?.type === ParticipantType.PLAYER) {
				break;
			}

			// Process enemy turn
			if (currentParticipant?.type === ParticipantType.ENEMY && currentParticipant.isActive) {
				const enemyActions = this.combatSystem.executeEnemyAction(
					currentParticipant,
					CombatActionType.ATTACK,
					combatState
				);

				// Add enemy action messages to log
				for (const action of enemyActions) {
					this.addMessage(gameState, action.description, MessageType.COMBAT);
				}
			}

			// Advance to next turn
			combatState.currentTurnIndex =
				(combatState.currentTurnIndex + 1) % combatState.turnOrder.length;

			if (combatState.currentTurnIndex === 0) {
				combatState.round++;
			}

			// Check if combat ended after enemy turn
			const combatStatus = this.combatSystem.checkCombatEnd(combatState);
			if (combatStatus !== CombatStatus.ACTIVE) {
				this.handleCombatEnd(gameState, combatStatus);
				return;
			}
		}
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

				// Check for traps and combat after successful actions
				this.checkForTraps(newState);
				this.checkForCombat(newState);
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
			experience: 0,
			classAbilities: []
		};
	}

	private initializeCharacterAbilities(character: Character): void {
		// Get all abilities for the character's class and level
		const availableAbilities = CLASS_ABILITIES[character.class] || [];
		character.classAbilities = availableAbilities
			.filter(ability => character.level >= ability.levelRequired)
			.map(ability => ability.id);

		// Initialize mana for spellcasters
		if (character.class === CharacterClass.WIZARD || character.class === CharacterClass.CLERIC) {
			const primaryStat = character.class === CharacterClass.WIZARD
				? character.stats.intelligence
				: character.stats.wisdom;
			const statModifier = Math.floor((primaryStat - 10) / 2);
			const maxMana = Math.max(1, 1 + statModifier + character.level);

			character.mana = {
				current: maxMana,
				max: maxMana
			};
		}
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

		// Add details about exits and locked doors
		const exits = Array.from(currentRoom.exits.keys());
		if (exits.length > 0) {
			const exitInfo = exits.map(exit => {
				const lock = currentRoom.lockedExits?.get(exit);
				if (lock && !lock.unlocked) {
					return `${exit} (locked)`;
				}
				return exit;
			});
			description += `\n\nExits: ${exitInfo.join(', ')}`;
		}

		// Add details about detected traps
		if (currentRoom.traps && currentRoom.traps.some(t => t.detected && !t.disarmed)) {
			const detectedTraps = currentRoom.traps
				.filter(t => t.detected && !t.disarmed)
				.map(t => t.name);
			description += `\n\n⚠️ Traps: ${detectedTraps.join(', ')}`;
		}

		// Add details about puzzles
		if (currentRoom.puzzles && currentRoom.puzzles.some(p => !p.solved)) {
			const unsolvedPuzzles = currentRoom.puzzles
				.filter(p => !p.solved)
				.map(p => p.name);
			description += `\n\n🧩 Puzzles: ${unsolvedPuzzles.join(', ')}`;
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