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
import { HazardSystem } from './HazardSystem';
import { StatusEffectSystem } from './StatusEffectSystem';
import { SaveSystem } from './SaveSystem';
import { AutoSaveService } from '../services/AutoSaveService';
import { RandomGenerator } from '../utils/RandomGenerator';
import { getExperienceToNextLevel } from '../utils/gameUtils';
import type { SaveOperation, LoadOperation, SaveSlot } from '../models/SaveData';
import { LLMNarrator, type ModelId, type ModelConfig } from './LLMNarrator';

export class GameEngine {
	private dungeonGenerator: DungeonGenerator;
	private commandProcessor: CommandProcessor;
	private combatSystem: CombatSystem;
	private magicSystem: MagicSystem;
	private interactionSystem: InteractionSystem;
	private hazardSystem: HazardSystem;
	private statusEffectSystem: StatusEffectSystem;
	private saveSystem: SaveSystem;
	private autoSaveService: AutoSaveService;
	private rng: RandomGenerator;
	private llmNarrator: LLMNarrator;

	constructor() {
		this.rng = new RandomGenerator();
		this.dungeonGenerator = new DungeonGenerator(this.rng);
		this.combatSystem = new CombatSystem();
		this.magicSystem = new MagicSystem();
		this.interactionSystem = new InteractionSystem();
		this.hazardSystem = new HazardSystem();
		this.statusEffectSystem = new StatusEffectSystem();
		this.saveSystem = new SaveSystem();
		this.autoSaveService = new AutoSaveService(this.saveSystem);
		this.llmNarrator = new LLMNarrator();
		this.commandProcessor = new CommandProcessor(this.llmNarrator);
	}

	getMagicSystem(): MagicSystem {
		return this.magicSystem;
	}

	// Model management methods
	getCurrentModelId(): ModelId | null {
		return this.llmNarrator.getCurrentModelId();
	}

	getAvailableModels(): ModelConfig[] {
		return LLMNarrator.getAvailableModels();
	}

	async switchModel(modelId: ModelId): Promise<void> {
		await this.llmNarrator.switchModel(modelId);
	}

	// Save/Load System Methods
	async saveGame(gameState: GameState, saveSlot: number, customName?: string): Promise<SaveOperation> {
		const result = await this.saveSystem.saveGame(gameState, saveSlot, customName);

		// If save was successful, also trigger auto-save (unless this was auto-save)
		if (result.result === 'success' && saveSlot !== 0) {
			await this.saveSystem.autoSave(gameState);
		}

		return result;
	}

	async loadGame(saveSlot: number): Promise<LoadOperation> {
		return await this.saveSystem.loadGame(saveSlot);
	}

	async autoSave(gameState: GameState): Promise<SaveOperation> {
		return await this.autoSaveService.directAutoSave(gameState);
	}

	getSaveSlots(): SaveSlot[] {
		return this.saveSystem.getSaveSlots();
	}

	deleteSave(saveSlot: number): boolean {
		return this.saveSystem.deleteSave(saveSlot);
	}

	hasAutoSave(): boolean {
		return this.saveSystem.hasAutoSave();
	}

	clearAllSaves(): boolean {
		return this.saveSystem.clearAllSaves();
	}

	getMostRecentSave(): { slotId: number; saveData: any } | null {
		return this.saveSystem.getMostRecentSave();
	}

	async loadMostRecentSave(): Promise<LoadOperation> {
		return await this.saveSystem.loadMostRecentSave();
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

		const newState = this.createGameStateCopy(gameState);
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
				this.handleCombatEnd(newState, combatStatus);
				return newState;
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
					// Get AI decision and execute individual enemy action
					const enemyActions = this.combatSystem.processSingleEnemyTurn(currentParticipant, combatState);

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
					this.handleCombatEnd(newState, enemyTurnStatus);
					return newState;
				}
			}

			// Auto-save after combat turn (if combat is still active)
			if (newState.combatState) {
				this.autoSave(newState);
			}

			return newState;
		} catch (error) {
			this.addMessage(newState, `Combat error: ${error instanceof Error ? error.message : 'Unknown error'}`, MessageType.ERROR);
			return newState;
		}
	}

	private handleCombatEnd(gameState: GameState, status: CombatStatus): void {
		switch (status) {
			case CombatStatus.VICTORY:
				this.addMessage(gameState, "🎉 Victory! You have defeated all enemies!", MessageType.SYSTEM);
				this.handleCombatVictory(gameState);
				break;

			case CombatStatus.DEFEAT:
				this.addMessage(gameState, "💀 You have been defeated...", MessageType.SYSTEM);
				this.handleCombatDefeat(gameState);
				break;

			case CombatStatus.FLED:
				this.addMessage(gameState, "🏃 You successfully fled from combat.", MessageType.SYSTEM);
				break;
		}

		// Clear combat state
		gameState.combatState = undefined;

		// Update room state
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (currentRoom && status === CombatStatus.VICTORY) {
			// Remove defeated enemies
			currentRoom.contents.enemies = [];
		}

		// Auto-save after combat resolution (when combat state is properly cleared)
		if (status === CombatStatus.VICTORY) {
			this.autoSaveService.autoSaveOnCombatEvent(gameState, 'victory');
		} else if (status === CombatStatus.DEFEAT) {
			this.autoSaveService.autoSaveOnCombatEvent(gameState, 'defeat');
		}
	}

	private handleCombatVictory(gameState: GameState): void {
		// Award experience and loot
		const xpGained = 50; // Simplified XP system
		gameState.character.experience += xpGained;
		const xpToNext = getExperienceToNextLevel(gameState.character.experience, gameState.character.level);
		this.addMessage(gameState, `You gained ${xpGained} experience points! (${xpToNext} XP to next level)`, MessageType.SYSTEM);

		// Check for level up (simplified)
		const newLevel = Math.floor(gameState.character.experience / 100) + 1;
		if (newLevel > gameState.character.level) {
			gameState.character.level = newLevel;
			const hpIncrease = 5; // Simplified HP increase
			gameState.character.hp.max += hpIncrease;
			gameState.character.hp.current += hpIncrease;
			this.addMessage(gameState, `🎊 Level up! You are now level ${newLevel}! (+${hpIncrease} HP)`, MessageType.SYSTEM);

			// Auto-save after level up
			this.autoSaveService.autoSaveOnLevelUp(gameState, newLevel);
		}

		// Note: Auto-save will happen in handleCombatEnd after combat state is cleared
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
		const newState = this.createGameStateCopy(gameState);

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
				return;
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
			const newState = this.createGameStateCopy(gameState);

			const result = await this.commandProcessor.executeCommand(command, newState);

			if (result.success) {
				newState.turnCount++;
				if (result.message) {
					this.addMessage(newState, result.message, result.messageType || MessageType.ACTION);
				}

				// Process environmental effects at the end of each turn
				this.processEnvironmentalEffects(newState);

				// Check for traps and combat after successful actions
				this.checkForTraps(newState);
				this.checkForCombat(newState);

				// Periodic auto-save
				this.autoSaveService.performPeriodicAutoSave(newState);

				// Auto-save on room movement
				if (result.message) {
					this.autoSaveService.autoSaveOnRoomMovement(newState, result.message);
				}
			} else {
				this.addMessage(newState, result.message || "Command failed.", MessageType.ERROR);
			}

			return newState;
		} catch (error) {
			const newState = this.createGameStateCopy(gameState);
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

		// Generate LLM-based room description
		let description: string;
		try {
			description = await this.llmNarrator.describeRoom(currentRoom, gameState);
		} catch (error) {
			console.error('LLM description failed:', error);
			description = "You find yourself in a mysterious location, though the details are unclear.";
		}

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

	private processEnvironmentalEffects(gameState: GameState): void {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) return;

		// Process environmental hazards
		if (currentRoom.hazards && currentRoom.hazards.length > 0) {
			const hazardResults = this.hazardSystem.processRoomHazards(gameState.character, currentRoom);
			const results = hazardResults.map(r => ({
				success: r.success,
				message: r.message,
				damage: r.damage,
				statusEffects: r.statusEffects
			}));
			for (const result of results) {
				this.addMessage(gameState, result.message, MessageType.SYSTEM);
			}
		}

		// Process character status effects
		if (gameState.character.statusEffects) {
			const statusResult = this.statusEffectSystem.processStatusEffects(gameState.character);
			if (statusResult) {
				this.addMessage(gameState, statusResult.message, MessageType.SYSTEM);
			}
		}
	}


	private createGameStateCopy(gameState: GameState): GameState {
		return {
			...gameState,
			messageLog: [...gameState.messageLog],
			character: {
				...gameState.character,
				hp: { ...gameState.character.hp },
				mana: gameState.character.mana ? { ...gameState.character.mana } : undefined,
				stats: { ...gameState.character.stats },
				equipment: {
					...gameState.character.equipment,
					weapon: gameState.character.equipment.weapon ? { ...gameState.character.equipment.weapon } : undefined,
					armor: gameState.character.equipment.armor ? { ...gameState.character.equipment.armor } : undefined,
					shield: gameState.character.equipment.shield ? { ...gameState.character.equipment.shield } : undefined,
				},
				inventory: [...gameState.character.inventory],
				statusEffects: gameState.character.statusEffects ? [...gameState.character.statusEffects] : []
			},
			dungeon: {
				...gameState.dungeon,
				rooms: new Map(Array.from(gameState.dungeon.rooms, ([key, room]) => [
					key,
					{
						...room,
						contents: {
							...room.contents,
							enemies: [...room.contents.enemies],
							items: [...room.contents.items],
							features: [...room.contents.features]
						},
						exits: new Map(room.exits),
						lockedExits: room.lockedExits ? new Map(room.lockedExits) : undefined,
						traps: room.traps ? [...room.traps] : undefined,
						puzzles: room.puzzles ? [...room.puzzles] : undefined,
						hazards: room.hazards ? [...room.hazards] : undefined,
						interactiveElements: room.interactiveElements ? [...room.interactiveElements] : undefined
					}
				]))
			},
			combatState: gameState.combatState ? {
				...gameState.combatState,
				participants: gameState.combatState.participants.map(p => ({
					...p,
					character: p.character ? { ...p.character } : undefined,
					enemy: p.enemy ? { ...p.enemy } : undefined
				})),
				turnOrder: [...gameState.combatState.turnOrder]
			} : undefined
		};
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