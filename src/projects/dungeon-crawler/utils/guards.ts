/**
 * Type guard utilities for runtime type checking and safe property access
 */

import type { CombatState } from '../models/Combat';
import type { Character } from '../models/Character';
import type { Enemy } from '../models/Enemy';
import type { GameState } from '../models/Room';

/**
 * Type guard to check if a value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

/**
 * Type guard to check if combat state exists and is valid
 */
export function isInCombat(gameState: GameState): gameState is GameState & { combatState: CombatState } {
	return isDefined(gameState.combatState) && gameState.combatState.participants.length > 0;
}

/**
 * Type guard to check if character has mana
 */
export function hasMana(character: Character): character is Character & { mana: NonNullable<Character['mana']> } {
	return isDefined(character.mana);
}

/**
 * Type guard to check if character has status effects
 */
export function hasStatusEffects(character: Character): character is Character & { statusEffects: NonNullable<Character['statusEffects']> } {
	return isDefined(character.statusEffects) && character.statusEffects.length > 0;
}

/**
 * Type guard to check if array has items at specific index
 */
export function hasItemAtIndex<T>(array: T[], index: number): array is T[] & { [K in typeof index]: T } {
	return array.length > index && isDefined(array[index]);
}

/**
 * Type guard to check if enemy participant exists and is valid
 */
export function isValidEnemyParticipant(participant: any): participant is { enemy: Enemy } {
	return isDefined(participant) && isDefined(participant.enemy) && isDefined(participant.enemy.hp);
}

/**
 * Type guard to check if character participant exists and is valid
 */
export function isValidCharacterParticipant(participant: any): participant is { character: Character } {
	return isDefined(participant) && isDefined(participant.character) && isDefined(participant.character.hp);
}

/**
 * Safe property access with fallback
 */
export function safeGet<T extends Record<string, any>, K extends keyof T>(obj: T | null | undefined, key: K, fallback: T[K]): T[K] {
	if (isDefined(obj) && key in obj) {
		const value = obj[key];
		return isDefined(value) ? value : fallback;
	}
	return fallback;
}

/**
 * Safe array access with fallback
 */
export function safeArrayGet<T>(array: T[] | null | undefined, index: number, fallback: T): T {
	if (isDefined(array) && array.length > index) {
		const value = array[index];
		return isDefined(value) ? value : fallback;
	}
	return fallback;
}

/**
 * Type guard for Maps to check if key exists
 */
export function hasMapKey<K, V>(map: Map<K, V> | null | undefined, key: K): map is Map<K, V> {
	return isDefined(map) && map.has(key);
}