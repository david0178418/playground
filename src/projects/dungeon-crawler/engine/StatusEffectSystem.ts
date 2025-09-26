import type { Character } from '../models/Character';
import type { CharacterStatusEffect } from '../models/Room';
import { StatusEffectType } from '../models/Room';

export interface StatusEffectResult {
	success: boolean;
	message: string;
	effectsRemoved?: number;
}

/**
 * Manages character status effects (blessed, cursed, energized, etc.)
 */
export class StatusEffectSystem {

	/**
	 * Process all status effects on a character, updating durations and applying effects
	 */
	processStatusEffects(character: Character): StatusEffectResult | null {
		if (!character.statusEffects || character.statusEffects.length === 0) {
			return null;
		}

		const messages: string[] = [];
		let effectsProcessed = 0;

		// Process each effect and decrement duration
		character.statusEffects = character.statusEffects.filter(effect => {
			effectsProcessed++;
			effect.duration--;

			// Apply ongoing effects before checking expiration
			switch (effect.type) {
				case StatusEffectType.BLESSED:
					if (effect.duration === 0) {
						messages.push("🌟 Your blessing fades away.");
						return false;
					}
					break;
				case StatusEffectType.CURSED:
					if (effect.duration === 0) {
						messages.push("😈 The curse lifts from you.");
						return false;
					}
					break;
				case StatusEffectType.EXHAUSTED:
					if (effect.duration === 0) {
						messages.push("💪 You feel refreshed as your exhaustion fades.");
						return false;
					}
					break;
				case StatusEffectType.ENERGIZED:
					if (effect.duration === 0) {
						messages.push("⚡ Your energy boost wears off.");
					} else {
						// Restore mana while energized
						if (character.mana && character.mana.current < character.mana.max) {
							const manaRestore = Math.min(1, character.mana.max - character.mana.current);
							character.mana.current += manaRestore;
							if (manaRestore > 0) {
								messages.push(`⚡ Your energized state restores ${manaRestore} mana.`);
							}
						}
					}
					return effect.duration > 0;
				case StatusEffectType.BLINDED:
					if (effect.duration === 0) {
						messages.push("👁️ Your vision clears.");
						return false;
					}
					break;
				case StatusEffectType.SLOWED:
					if (effect.duration === 0) {
						messages.push("🏃 You can move at normal speed again.");
						return false;
					}
					break;
				case StatusEffectType.PROTECTED:
					if (effect.duration === 0) {
						messages.push("🛡️ Your protective ward dissipates.");
						return false;
					}
					break;
			}

			return effect.duration > 0;
		});

		if (messages.length === 0) {
			return null;
		}

		return {
			success: true,
			message: messages.join(' '),
			effectsRemoved: effectsProcessed - character.statusEffects.length
		};
	}

	/**
	 * Add a status effect to a character
	 */
	addStatusEffect(character: Character, effect: CharacterStatusEffect): void {
		if (!character.statusEffects) {
			character.statusEffects = [];
		}

		// Check if character already has this effect type
		const existingEffect = character.statusEffects.find(e => e.type === effect.type);
		if (existingEffect) {
			// Extend duration if new effect is longer, or refresh if same type
			if (effect.duration > existingEffect.duration) {
				existingEffect.duration = effect.duration;
			}
		} else {
			character.statusEffects.push({ ...effect });
		}
	}

	/**
	 * Remove a specific status effect from a character
	 */
	removeStatusEffect(character: Character, effectType: StatusEffectType): boolean {
		if (!character.statusEffects) {
			return false;
		}

		const initialLength = character.statusEffects.length;
		character.statusEffects = character.statusEffects.filter(e => e.type !== effectType);
		return character.statusEffects.length < initialLength;
	}

	/**
	 * Check if character has a specific status effect
	 */
	hasStatusEffect(character: Character, effectType: StatusEffectType): boolean {
		return character.statusEffects?.some(e => e.type === effectType) || false;
	}

	/**
	 * Get all active status effects on a character
	 */
	getActiveEffects(character: Character): CharacterStatusEffect[] {
		return character.statusEffects || [];
	}

	/**
	 * Clear all status effects from a character
	 */
	clearAllEffects(character: Character): number {
		const count = character.statusEffects?.length || 0;
		character.statusEffects = [];
		return count;
	}

	/**
	 * Get the total modifier for a stat based on active status effects
	 */
	getStatModifier(character: Character, statType: string): number {
		if (!character.statusEffects) {
			return 0;
		}

		let modifier = 0;
		for (const effect of character.statusEffects) {
			switch (effect.type) {
				case StatusEffectType.BLESSED:
					modifier += 2; // General bonus
					break;
				case StatusEffectType.CURSED:
					modifier -= 2; // General penalty
					break;
				case StatusEffectType.EXHAUSTED:
					if (statType === 'strength' || statType === 'dexterity') {
						modifier -= 3;
					}
					break;
				case StatusEffectType.ENERGIZED:
					if (statType === 'intelligence' || statType === 'charisma') {
						modifier += 2;
					}
					break;
			}
		}

		return modifier;
	}

	/**
	 * Check if character can perform an action based on status effects
	 */
	canPerformAction(character: Character, actionType: string): boolean {
		if (!character.statusEffects) {
			return true;
		}

		for (const effect of character.statusEffects) {
			switch (effect.type) {
				case StatusEffectType.BLINDED:
					if (actionType === 'ranged_attack' || actionType === 'cast_spell') {
						return false;
					}
					break;
				case StatusEffectType.SLOWED:
					if (actionType === 'movement') {
						return false; // Would need special handling for reduced movement
					}
					break;
				case StatusEffectType.EXHAUSTED:
					if (actionType === 'run' || actionType === 'sprint') {
						return false;
					}
					break;
			}
		}

		return true;
	}
}