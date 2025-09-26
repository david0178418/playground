import type { GameState } from '../models/GameState';
import type { SaveOperation } from '../models/SaveData';
import { SaveSystem } from '../engine/SaveSystem';

export class AutoSaveService {
	private saveSystem: SaveSystem;
	private lastAutoSaveTurn: number = 0;
	private readonly AUTOSAVE_INTERVAL = 10;

	constructor(saveSystem: SaveSystem) {
		this.saveSystem = saveSystem;
	}

	shouldAutoSave(gameState: GameState): boolean {
		return gameState.turnCount - this.lastAutoSaveTurn >= this.AUTOSAVE_INTERVAL;
	}

	async performPeriodicAutoSave(gameState: GameState): Promise<void> {
		if (!this.shouldAutoSave(gameState)) {
			return;
		}

		this.lastAutoSaveTurn = gameState.turnCount;
		await this.triggerAutoSave(gameState, `periodic save after ${gameState.turnCount} turns`);
	}

	async autoSaveOnRoomMovement(gameState: GameState, commandResult: string): Promise<void> {
		if (commandResult.includes('You enter') || commandResult.includes('You go')) {
			await this.triggerAutoSave(gameState, 'room movement');
		}
	}

	async autoSaveOnCombatEvent(gameState: GameState, eventType: 'victory' | 'defeat'): Promise<void> {
		const reason = eventType === 'victory' ? 'combat victory' : 'combat defeat - player respawned';
		await this.triggerAutoSave(gameState, reason);
	}

	async autoSaveOnLevelUp(gameState: GameState, newLevel: number): Promise<void> {
		await this.triggerAutoSave(gameState, `level up to ${newLevel}`);
	}

	async directAutoSave(gameState: GameState): Promise<SaveOperation> {
		return await this.saveSystem.autoSave(gameState);
	}

	private async triggerAutoSave(gameState: GameState, reason: string): Promise<void> {
		try {
			const result = await this.saveSystem.autoSave(gameState);
			if (result.result === 'success') {
				console.log(`Auto-save successful: ${reason}`);
			} else {
				console.warn(`Auto-save failed: ${result.message}`);
			}
		} catch (error) {
			console.error(`Auto-save error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}