import type { Character } from '../models/Character';
import type {
	Room,
	EnvironmentalHazard,
	CharacterStatusEffect
} from '../models/Room';
import {
	HazardType,
	HazardSeverity,
	StatusEffectType
} from '../models/Room';
import { DiceRoller } from '../utils/DiceRoller';
import { RandomGenerator } from '../utils/RandomGenerator';

export interface HazardResult {
	success: boolean;
	message: string;
	damage?: number;
	statusEffects?: CharacterStatusEffect[];
}

/**
 * Manages environmental hazards like fire, poison, magical effects
 */
export class HazardSystem {
	private rng: RandomGenerator;

	constructor() {
		this.rng = new RandomGenerator();
	}

	/**
	 * Process all environmental hazards in a room for a character
	 */
	processRoomHazards(character: Character, room: Room): HazardResult[] {
		const results: HazardResult[] = [];

		if (room.hazards) {
			for (const hazard of room.hazards) {
				const result = this.processHazard(character, hazard);
				if (result) {
					results.push(result);
				}
			}
		}

		return results;
	}

	/**
	 * Process a single environmental hazard
	 */
	private processHazard(character: Character, hazard: EnvironmentalHazard): HazardResult | null {
		// Skip hazards that are only triggered by movement on initial room entry
		if (hazard.triggeredByMovement) {
			return null;
		}

		let damage = 0;
		const statusEffects: CharacterStatusEffect[] = [];
		let message = '';

		switch (hazard.type) {
			case HazardType.EXTREME_HEAT:
				if (hazard.damagePerTurn && hazard.damagePerTurn.includes('d')) {
					try {
						damage = DiceRoller.parseDiceRoll(hazard.damagePerTurn);
						character.hp.current = Math.max(0, character.hp.current - damage);
						message = `🔥 You take ${damage} heat damage from the ${hazard.name}!`;
					} catch {
						damage = 1;
						character.hp.current = Math.max(0, character.hp.current - 1);
						message = `🔥 You take 1 heat damage from the ${hazard.name}!`;
					}
				}
				break;

			case HazardType.POISON_GAS:
				const conModifier = Math.floor((character.stats.constitution - 10) / 2);
				const saveRoll = DiceRoller.rollD20() + conModifier;
				const saveDC = this.getHazardSaveDC(hazard.severity);

				if (saveRoll < saveDC) {
					statusEffects.push({
						type: StatusEffectType.CURSED,
						duration: 3,
						description: "Poisoned"
					});
					message = `☠️ You are poisoned by the ${hazard.name}! (Save: ${saveRoll} vs DC ${saveDC})`;
				} else {
					message = `💚 You resist the poison from the ${hazard.name}. (Save: ${saveRoll} vs DC ${saveDC})`;
				}
				break;

			case HazardType.EXTREME_COLD:
				statusEffects.push({
					type: StatusEffectType.SLOWED,
					duration: 2,
					description: "Chilled to the bone"
				});
				message = `🧊 The cold from the ${hazard.name} chills you to the bone!`;
				break;

			case HazardType.ARCANE_STORM:
				const magicEffect = this.rng.choose([
					"mana_drain",
					"stat_debuff",
					"confusion"
				]);

				if (magicEffect === "mana_drain" && character.mana) {
					const manaDrain = Math.min(2, character.mana.current);
					character.mana.current -= manaDrain;
					message = `✨ The ${hazard.name} drains ${manaDrain} mana from you!`;
				} else {
					message = `✨ You feel strange magic from the ${hazard.name}.`;
				}
				break;

			case HazardType.UNSTABLE_FLOOR:
				const dexModifier = Math.floor((character.stats.dexterity - 10) / 2);
				const dexSave = DiceRoller.rollD20() + dexModifier;

				if (dexSave < this.getHazardSaveDC(hazard.severity)) {
					try {
						damage = DiceRoller.parseDiceRoll("2d6");
						character.hp.current = Math.max(0, character.hp.current - damage);
						message = `💥 You take ${damage} falling damage from the ${hazard.name}!`;
					} catch {
						damage = 4;
						character.hp.current = Math.max(0, character.hp.current - damage);
						message = `💥 You take ${damage} falling damage from the ${hazard.name}!`;
					}
				} else {
					message = `💪 You dodge the ${hazard.name}! (Save: ${dexSave} vs DC ${this.getHazardSaveDC(hazard.severity)})`;
				}
				break;
		}

		// Apply status effects
		if (statusEffects.length > 0) {
			if (!character.statusEffects) {
				character.statusEffects = [];
			}
			character.statusEffects.push(...statusEffects);
		}

		// Handle hazard duration
		if (!hazard.isPermanent && hazard.duration !== undefined) {
			hazard.duration--;
			if (hazard.duration <= 0) {
				// Hazard should be removed by the calling system
			}
		}

		return {
			success: damage === 0,
			message,
			damage,
			statusEffects
		};
	}

	/**
	 * Generate hazards for room types
	 */
	generateHazard(roomType: string, roomDepth: number, rng: RandomGenerator): EnvironmentalHazard | null {
		const hazardTypes = this.getHazardTypesForRoom(roomType);
		if (hazardTypes.length === 0) return null;

		const hazardType = rng.choose(hazardTypes);
		const severity = this.getHazardSeverityForDepth(roomDepth);

		return this.createHazard(hazardType, severity);
	}

	private getHazardSaveDC(severity: HazardSeverity): number {
		switch (severity) {
			case HazardSeverity.MINOR: return 10;
			case HazardSeverity.MODERATE: return 13;
			case HazardSeverity.SEVERE: return 16;
			case HazardSeverity.EXTREME: return 20;
		}
	}

	private getHazardTypesForRoom(roomType: string): HazardType[] {
		// Basic room type mapping
		switch (roomType) {
			case 'treasury':
				return [HazardType.ARCANE_STORM];
			case 'forge':
				return [HazardType.EXTREME_HEAT];
			case 'crypt':
				return [HazardType.POISON_GAS, HazardType.EXTREME_COLD];
			case 'trap_room':
				return [HazardType.UNSTABLE_FLOOR, HazardType.EXTREME_HEAT];
			default:
				return [HazardType.EXTREME_HEAT, HazardType.POISON_GAS];
		}
	}

	private getHazardSeverityForDepth(depth: number): HazardSeverity {
		if (depth <= 2) return HazardSeverity.MINOR;
		if (depth <= 4) return HazardSeverity.MODERATE;
		if (depth <= 6) return HazardSeverity.SEVERE;
		return HazardSeverity.EXTREME;
	}

	private createHazard(type: HazardType, severity: HazardSeverity): EnvironmentalHazard {
		const hazardData = this.getHazardData(type, severity);

		return {
			id: `hazard_${Date.now()}_${Math.random()}`,
			name: hazardData.name,
			type,
			severity,
			description: hazardData.description,
			damagePerTurn: hazardData.damagePerTurn,
			triggeredByMovement: false,
			isPermanent: hazardData.isPermanent,
			duration: hazardData.duration
		};
	}

	private getHazardData(type: HazardType, severity: HazardSeverity) {
		const severityMultiplier = {
			[HazardSeverity.MINOR]: 1,
			[HazardSeverity.MODERATE]: 1.5,
			[HazardSeverity.SEVERE]: 2,
			[HazardSeverity.EXTREME]: 3
		}[severity];

		const baseDamage = Math.floor(2 * severityMultiplier);

		switch (type) {
			case HazardType.EXTREME_HEAT:
				return {
					name: `${severity} Heat`,
					description: `Extreme heat radiates from the environment`,
					damagePerTurn: `${baseDamage}d4`,
					isPermanent: true,
					duration: undefined
				};

			case HazardType.POISON_GAS:
				return {
					name: `${severity} Poison Gas`,
					description: `Toxic vapors seep from cracks in the ground`,
					damagePerTurn: `${Math.max(1, baseDamage - 1)}d4`,
					isPermanent: false,
					duration: 5 + Math.floor(severityMultiplier * 2)
				};

			case HazardType.EXTREME_COLD:
				return {
					name: `${severity} Cold`,
					description: `An unnatural chill permeates the area`,
					damagePerTurn: `${baseDamage}d3`,
					isPermanent: true,
					duration: undefined
				};

			case HazardType.ARCANE_STORM:
				return {
					name: `${severity} Arcane Storm`,
					description: `Chaotic magical energy crackles in the air`,
					damagePerTurn: `${baseDamage}d6`,
					isPermanent: false,
					duration: 3 + Math.floor(severityMultiplier * 3)
				};

			case HazardType.UNSTABLE_FLOOR:
				return {
					name: `${severity} Unstable Floor`,
					description: `The ground shifts dangerously underfoot`,
					damagePerTurn: `${baseDamage + 1}d6`,
					isPermanent: false,
					duration: 2
				};

			default:
				return {
					name: 'Unknown Hazard',
					description: 'Something dangerous lurks here',
					damagePerTurn: '1d4',
					isPermanent: false,
					duration: 3
				};
		}
	}
}