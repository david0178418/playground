import type { GameState, Dungeon } from '../models/Room';
import type {
	SaveData,
	SaveMetadata,
	SaveSlot,
	SerializableGameState,
	SerializableDungeon,
	SaveOperation,
	LoadOperation
} from '../models/SaveData';
import {
	SAVE_SYSTEM_CONFIG,
	SaveResult,
	LoadResult
} from '../models/SaveData';

export class SaveSystem {
	private storageKeyPrefix: string;
	private maxSaveSlots: number;

	constructor() {
		this.storageKeyPrefix = SAVE_SYSTEM_CONFIG.STORAGE_KEY_PREFIX;
		this.maxSaveSlots = SAVE_SYSTEM_CONFIG.MAX_SAVE_SLOTS;
	}

	// Main save operation
	async saveGame(gameState: GameState, saveSlot: number, customName?: string): Promise<SaveOperation> {
		try {
			if (saveSlot < 0 || saveSlot >= this.maxSaveSlots) {
				return {
					result: SaveResult.ERROR_INVALID_DATA,
					message: `Invalid save slot: ${saveSlot}. Must be between 0 and ${this.maxSaveSlots - 1}.`
				};
			}

			// Check storage availability
			if (!this.isStorageAvailable()) {
				return {
					result: SaveResult.ERROR_STORAGE_FULL,
					message: 'Local storage is not available or full.'
				};
			}

			// Validate game state before saving
			if (gameState.combatState) {
				console.warn('Attempting to save game state with active combat - this may cause issues');
			}

			const saveData = this.createSaveData(gameState, saveSlot, customName);
			const storageKey = this.getSaveKey(saveSlot);

			// Serialize and store
			const serializedData = JSON.stringify(saveData);
			localStorage.setItem(storageKey, serializedData);

			// Update save slot metadata
			this.updateSaveSlotIndex();

			return {
				result: SaveResult.SUCCESS,
				message: `Game saved successfully to slot ${saveSlot}.`,
				saveData
			};

		} catch (error) {
			console.error('Save operation failed:', error);
			return {
				result: SaveResult.ERROR_UNKNOWN,
				message: `Failed to save game: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	// Main load operation
	async loadGame(saveSlot: number): Promise<LoadOperation> {
		try {
			if (saveSlot < 0 || saveSlot >= this.maxSaveSlots) {
				return {
					result: LoadResult.ERROR_NOT_FOUND,
					message: `Invalid save slot: ${saveSlot}.`
				};
			}

			const storageKey = this.getSaveKey(saveSlot);
			const savedData = localStorage.getItem(storageKey);

			if (!savedData) {
				return {
					result: LoadResult.ERROR_NOT_FOUND,
					message: `No save data found in slot ${saveSlot}.`
				};
			}

			// Parse and validate save data
			const saveData: SaveData = JSON.parse(savedData);
			const validationResult = this.validateSaveData(saveData);

			if (validationResult !== LoadResult.SUCCESS) {
				return {
					result: validationResult,
					message: this.getValidationErrorMessage(validationResult)
				};
			}

			// Convert back to GameState
			const gameState = this.deserializeGameState(saveData.gameState);

			return {
				result: LoadResult.SUCCESS,
				message: `Game loaded successfully from slot ${saveSlot}.`,
				gameState,
				saveData
			};

		} catch (error) {
			console.error('Load operation failed:', error);
			return {
				result: LoadResult.ERROR_CORRUPTED,
				message: `Failed to load game: ${error instanceof Error ? error.message : 'Corrupted save data'}`
			};
		}
	}

	// Get all save slots with metadata
	getSaveSlots(): SaveSlot[] {
		const slots: SaveSlot[] = [];

		for (let i = 0; i < this.maxSaveSlots; i++) {
			const storageKey = this.getSaveKey(i);
			const savedData = localStorage.getItem(storageKey);

			if (savedData) {
				try {
					const saveData: SaveData = JSON.parse(savedData);
					slots.push({
						id: i,
						isEmpty: false,
						saveData,
						metadata: saveData.metadata
					});
				} catch {
					// Corrupted save data
					slots.push({
						id: i,
						isEmpty: true
					});
				}
			} else {
				slots.push({
					id: i,
					isEmpty: true
				});
			}
		}

		return slots;
	}

	// Delete a save slot
	deleteSave(saveSlot: number): boolean {
		try {
			if (saveSlot < 0 || saveSlot >= this.maxSaveSlots) {
				return false;
			}

			const storageKey = this.getSaveKey(saveSlot);
			localStorage.removeItem(storageKey);
			this.updateSaveSlotIndex();
			return true;
		} catch {
			return false;
		}
	}

	// Auto-save functionality
	async autoSave(gameState: GameState): Promise<SaveOperation> {
		return this.saveGame(gameState, SAVE_SYSTEM_CONFIG.AUTO_SAVE_SLOT, 'Auto Save');
	}

	// Clear all save data (useful for debugging or version migrations)
	clearAllSaves(): boolean {
		try {
			for (let i = 0; i < this.maxSaveSlots; i++) {
				const storageKey = this.getSaveKey(i);
				localStorage.removeItem(storageKey);
			}
			return true;
		} catch {
			return false;
		}
	}

	// Check if auto-save exists
	hasAutoSave(): boolean {
		const autoSaveKey = this.getSaveKey(SAVE_SYSTEM_CONFIG.AUTO_SAVE_SLOT);
		return localStorage.getItem(autoSaveKey) !== null;
	}

	// Get the most recent save (by timestamp)
	getMostRecentSave(): { slotId: number; saveData: SaveData } | null {
		const saveSlots = this.getSaveSlots();
		let mostRecent: { slotId: number; saveData: SaveData } | null = null;
		let latestTimestamp = 0;

		for (const slot of saveSlots) {
			if (!slot.isEmpty && slot.saveData && slot.saveData.timestamp > latestTimestamp) {
				latestTimestamp = slot.saveData.timestamp;
				mostRecent = { slotId: slot.id, saveData: slot.saveData };
			}
		}

		return mostRecent;
	}

	// Load the most recent save
	async loadMostRecentSave(): Promise<LoadOperation> {
		const mostRecent = this.getMostRecentSave();
		if (mostRecent) {
			return await this.loadGame(mostRecent.slotId);
		} else {
			return {
				result: LoadResult.ERROR_NOT_FOUND,
				message: 'No saves found to load.'
			};
		}
	}

	// Private helper methods
	private createSaveData(gameState: GameState, saveSlot: number, customName?: string): SaveData {
		const currentTime = Date.now();
		const playTime = this.calculatePlayTime(gameState);

		const metadata: SaveMetadata = {
			characterName: customName || gameState.character.name,
			characterClass: gameState.character.class,
			level: gameState.character.level,
			currentRoom: gameState.currentRoomId,
			playTime,
			dungeonSeed: gameState.dungeon.seed,
			lastSaved: currentTime,
			saveSlot
		};

		return {
			id: `save_${saveSlot}_${currentTime}`,
			version: SAVE_SYSTEM_CONFIG.SAVE_VERSION,
			metadata,
			gameState: this.serializeGameState(gameState),
			timestamp: currentTime
		};
	}

	private serializeGameState(gameState: GameState): SerializableGameState {
		return {
			character: gameState.character,
			dungeon: this.serializeDungeon(gameState.dungeon),
			currentRoomId: gameState.currentRoomId,
			combatState: gameState.combatState,
			messageLog: gameState.messageLog,
			turnCount: gameState.turnCount,
			playTimeStart: Date.now() // Reset play time tracking
		};
	}

	private serializeDungeon(dungeon: Dungeon): SerializableDungeon {
		// Serialize rooms with proper Map handling
		const serializedRooms: [string, any][] = Array.from(dungeon.rooms.entries()).map(([roomId, room]) => [
			roomId,
			this.serializeRoom(room)
		]);

		return {
			id: dungeon.id,
			seed: dungeon.seed,
			rooms: serializedRooms,
			entranceRoomId: dungeon.entranceRoomId
		};
	}

	private deserializeGameState(serializedState: SerializableGameState): GameState {
		return {
			character: serializedState.character,
			dungeon: this.deserializeDungeon(serializedState.dungeon),
			currentRoomId: serializedState.currentRoomId,
			combatState: serializedState.combatState,
			messageLog: serializedState.messageLog,
			turnCount: serializedState.turnCount
		};
	}

	private deserializeDungeon(serializedDungeon: SerializableDungeon): Dungeon {
		// Deserialize rooms with proper Map reconstruction
		const deserializedRooms = new Map(
			serializedDungeon.rooms.map(([roomId, serializedRoom]) => [
				roomId,
				this.deserializeRoom(serializedRoom)
			])
		);

		return {
			id: serializedDungeon.id,
			seed: serializedDungeon.seed,
			rooms: deserializedRooms,
			entranceRoomId: serializedDungeon.entranceRoomId
		};
	}

	private serializeRoom(room: any): any {
		// Create a copy of the room and serialize its Maps
		const serializedRoom = { ...room };

		// Convert exits Map to array
		if (room.exits && room.exits instanceof Map) {
			serializedRoom.exits = Array.from(room.exits.entries());
		}

		// Convert lockedExits Map to array if it exists
		if (room.lockedExits && room.lockedExits instanceof Map) {
			serializedRoom.lockedExits = Array.from(room.lockedExits.entries());
		}

		return serializedRoom;
	}

	private deserializeRoom(serializedRoom: any): any {
		// Create a copy of the serialized room and reconstruct its Maps
		const room = { ...serializedRoom };

		try {
			// Convert exits array back to Map
			if (Array.isArray(serializedRoom.exits)) {
				room.exits = new Map(serializedRoom.exits);
			} else if (serializedRoom.exits && typeof serializedRoom.exits === 'object') {
				// Handle case where exits might be a plain object instead of array
				room.exits = new Map(Object.entries(serializedRoom.exits));
			} else {
				// Ensure exits is always a Map, even if empty
				room.exits = new Map();
			}
		} catch (error) {
			console.warn('Failed to deserialize room exits, creating empty Map:', error);
			room.exits = new Map();
		}

		try {
			// Convert lockedExits array back to Map if it exists
			if (Array.isArray(serializedRoom.lockedExits)) {
				room.lockedExits = new Map(serializedRoom.lockedExits);
			} else if (serializedRoom.lockedExits && typeof serializedRoom.lockedExits === 'object') {
				// Handle case where lockedExits might be a plain object instead of array
				room.lockedExits = new Map(Object.entries(serializedRoom.lockedExits));
			}
		} catch (error) {
			console.warn('Failed to deserialize room lockedExits:', error);
			// lockedExits is optional, so we can leave it undefined
		}

		return room;
	}

	private validateSaveData(saveData: SaveData): LoadResult {
		// Check save data structure
		if (!saveData || typeof saveData !== 'object') {
			return LoadResult.ERROR_CORRUPTED;
		}

		// Check version compatibility
		if (saveData.version !== SAVE_SYSTEM_CONFIG.SAVE_VERSION) {
			return LoadResult.ERROR_VERSION_MISMATCH;
		}

		// Check required fields
		if (!saveData.metadata || !saveData.gameState || !saveData.timestamp) {
			return LoadResult.ERROR_CORRUPTED;
		}

		return LoadResult.SUCCESS;
	}

	private calculatePlayTime(gameState: GameState): number {
		// Calculate total play time based on turn count and estimated time per turn
		// This is a rough estimation - in a real implementation, you'd track actual time
		const avgTimePerTurn = 30000; // 30 seconds per turn estimate
		return gameState.turnCount * avgTimePerTurn;
	}

	private getSaveKey(saveSlot: number): string {
		return `${this.storageKeyPrefix}${saveSlot}`;
	}

	private isStorageAvailable(): boolean {
		try {
			const test = 'test';
			localStorage.setItem(test, test);
			localStorage.removeItem(test);
			return true;
		} catch {
			return false;
		}
	}

	private updateSaveSlotIndex(): void {
		// Future feature: maintain an index of all saves for quick access
		// For now, this is a placeholder
	}

	private getValidationErrorMessage(result: LoadResult): string {
		switch (result) {
			case LoadResult.ERROR_CORRUPTED:
				return 'Save data is corrupted or invalid.';
			case LoadResult.ERROR_VERSION_MISMATCH:
				return 'Save data is from an incompatible version.';
			case LoadResult.ERROR_NOT_FOUND:
				return 'Save data not found.';
			default:
				return 'Unknown error occurred while validating save data.';
		}
	}
}