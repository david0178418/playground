import type { Character } from '../models/Character';
import type {
	Room,
	EnvironmentalHazard,
	InteractiveElement,
	CharacterStatusEffect,
	InteractiveEffect
} from '../models/Room';
import {
	HazardType,
	HazardSeverity,
	EnvironmentalEffect,
	InteractiveType,
	EffectTargetType,
	StatusEffectType,
	ModificationType
} from '../models/Room';
import { DiceRoller } from '../utils/DiceRoller';
import { RandomGenerator } from '../utils/RandomGenerator';

export interface EnvironmentalResult {
	success: boolean;
	message: string;
	damage?: number;
	healing?: number;
	statusEffects?: CharacterStatusEffect[];
	itemsSpawned?: any[];
	roomModified?: boolean;
}

export class EnvironmentalSystem {
	private rng: RandomGenerator;

	constructor() {
		this.rng = new RandomGenerator();
	}

	// Process environmental hazards each turn
	processEnvironmentalEffects(character: Character, room: Room): EnvironmentalResult[] {
		const results: EnvironmentalResult[] = [];

		// Process hazards
		if (room.hazards) {
			for (const hazard of room.hazards) {
				const result = this.processHazard(character, hazard);
				if (result) {
					results.push(result);
				}
			}
		}

		// Process ongoing status effects
		const statusResult = this.processStatusEffects(character);
		if (statusResult) {
			results.push(statusResult);
		}

		return results;
	}

	private processHazard(character: Character, hazard: EnvironmentalHazard): EnvironmentalResult | null {
		// Skip if hazard only triggers on movement and character didn't move
		if (hazard.triggeredByMovement) {
			return null;
		}

		let message = `${hazard.name}: ${hazard.description}`;
		let damage = 0;
		const statusEffects: CharacterStatusEffect[] = [];

		// Apply hazard effects based on type
		switch (hazard.type) {
			case HazardType.POISON_GAS:
				if (hazard.damagePerTurn && hazard.damagePerTurn.includes('d')) {
					try {
						damage = DiceRoller.parseDiceRoll(hazard.damagePerTurn);
						character.hp.current = Math.max(0, character.hp.current - damage);
						message += ` You take ${damage} poison damage!`;
					} catch (error) {
						// Fallback to 1 damage if dice parsing fails
						character.hp.current = Math.max(0, character.hp.current - 1);
						message += ` You take 1 poison damage!`;
					}
				}
				break;

			case HazardType.EXTREME_COLD:
				// Constitution save to avoid exhaustion
				const conModifier = Math.floor((character.stats.constitution - 10) / 2);
				const saveRoll = DiceRoller.rollD20() + conModifier;
				const saveDC = this.getHazardSaveDC(hazard.severity);

				if (saveRoll < saveDC) {
					statusEffects.push({
						type: StatusEffectType.EXHAUSTED,
						duration: 10,
						modifier: -2,
						description: "Exhausted by extreme cold"
					});
					message += " You feel exhausted from the freezing temperature!";
				} else {
					message += " You steel yourself against the cold.";
				}
				break;

			case HazardType.MAGICAL_DARKNESS:
				statusEffects.push({
					type: StatusEffectType.BLINDED,
					duration: 1,
					modifier: -4,
					description: "Blinded by magical darkness"
				});
				message += " The magical darkness impairs your vision!";
				break;

			case HazardType.ARCANE_STORM:
				// Random magical effect
				const magicEffect = this.rng.choose([
					"mana_drain",
					"spell_disruption",
					"wild_magic"
				]);

				if (magicEffect === "mana_drain" && character.mana) {
					const manaDrain = Math.min(2, character.mana.current);
					character.mana.current -= manaDrain;
					message += ` The arcane storm drains ${manaDrain} mana!`;
				}
				break;

			case HazardType.UNSTABLE_FLOOR:
				// Dexterity save to avoid fall damage
				const dexModifier = Math.floor((character.stats.dexterity - 10) / 2);
				const dexSave = DiceRoller.rollD20() + dexModifier;

				if (dexSave < this.getHazardSaveDC(hazard.severity)) {
					try {
						damage = DiceRoller.parseDiceRoll("2d6");
						character.hp.current = Math.max(0, character.hp.current - damage);
						message += ` You fall through unstable flooring and take ${damage} damage!`;
					} catch (error) {
						damage = 7; // Fallback average damage
						character.hp.current = Math.max(0, character.hp.current - damage);
						message += ` You fall through unstable flooring and take ${damage} damage!`;
					}
				} else {
					message += " You nimbly avoid the unstable floor.";
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

		// Reduce hazard duration if temporary
		if (!hazard.isPermanent && hazard.duration !== undefined) {
			hazard.duration--;
		}

		return {
			success: damage === 0 && statusEffects.length === 0,
			message,
			damage: damage > 0 ? damage : undefined,
			statusEffects: statusEffects.length > 0 ? statusEffects : undefined
		};
	}

	processStatusEffects(character: Character): EnvironmentalResult | null {
		if (!character.statusEffects || character.statusEffects.length === 0) {
			return null;
		}

		const messages: string[] = [];
		let totalDamage = 0;
		let totalHealing = 0;

		// Process each status effect
		character.statusEffects = character.statusEffects.filter(effect => {
			effect.duration--;

			// Apply effect
			switch (effect.type) {
				case StatusEffectType.BLESSED:
					if (effect.duration === 0) {
						messages.push("🌟 Your blessing fades away.");
					}
					break;
				case StatusEffectType.CURSED:
					if (effect.duration === 0) {
						messages.push("😈 The curse lifts from you.");
					}
					break;
				case StatusEffectType.EXHAUSTED:
					if (effect.duration === 0) {
						messages.push("💪 You feel refreshed as your exhaustion fades.");
					}
					break;
				case StatusEffectType.ENERGIZED:
					if (effect.duration === 0) {
						messages.push("⚡ Your energy boost wears off.");
					} else {
						// Restore some mana
						if (character.mana && character.mana.current < character.mana.max) {
							const manaRestore = Math.min(1, character.mana.max - character.mana.current);
							character.mana.current += manaRestore;
							if (manaRestore > 0) {
								messages.push(`⚡ Your energized state restores ${manaRestore} mana.`);
							}
						}
					}
					break;
			}

			// Return true to keep the effect if duration > 0
			return effect.duration > 0;
		});

		if (messages.length === 0) {
			return null;
		}

		return {
			success: true,
			message: messages.join(' '),
			damage: totalDamage > 0 ? totalDamage : undefined,
			healing: totalHealing > 0 ? totalHealing : undefined
		};
	}

	// Activate interactive element
	activateInteractiveElement(
		character: Character,
		element: InteractiveElement,
		gameState: any
	): EnvironmentalResult {
		// Check if element can be used
		const canUse = this.canUseInteractiveElement(character, element, gameState.turnCount);
		if (!canUse.success) {
			return canUse;
		}

		// Mark as activated/used
		element.activated = true;
		if (element.usesRemaining !== undefined) {
			element.usesRemaining--;
		}
		if (element.cooldownTurns !== undefined) {
			element.lastUsedTurn = gameState.turnCount;
		}

		// Apply effect
		return this.applyInteractiveEffect(character, element.effect, gameState);
	}

	private canUseInteractiveElement(
		character: Character,
		element: InteractiveElement,
		currentTurn: number
	): EnvironmentalResult {
		// Check uses remaining
		if (element.usesRemaining !== undefined && element.usesRemaining <= 0) {
			return {
				success: false,
				message: `The ${element.name} has no uses remaining.`
			};
		}

		// Check cooldown
		if (element.cooldownTurns && element.lastUsedTurn !== undefined) {
			const turnsSinceUse = currentTurn - element.lastUsedTurn;
			if (turnsSinceUse < element.cooldownTurns) {
				const remaining = element.cooldownTurns - turnsSinceUse;
				return {
					success: false,
					message: `The ${element.name} cannot be used for ${remaining} more turns.`
				};
			}
		}

		// Check required item
		if (element.requiresItem) {
			const hasItem = character.inventory.some(item => item.id === element.requiresItem);
			if (!hasItem) {
				return {
					success: false,
					message: `You need a specific item to use the ${element.name}.`
				};
			}
		}

		// Check skill requirement
		if (element.skillRequired && element.difficultyClass) {
			const skillRoll = this.makeSkillCheck(character, element.skillRequired, element.difficultyClass);
			if (!skillRoll.success) {
				return {
					success: false,
					message: `You failed to properly use the ${element.name}. ${skillRoll.message}`
				};
			}
		}

		return { success: true, message: "" };
	}

	private applyInteractiveEffect(
		character: Character,
		effect: InteractiveEffect,
		gameState: any
	): EnvironmentalResult {
		let message = effect.description;
		let healing = 0;
		let damage = 0;
		const statusEffects: CharacterStatusEffect[] = [];
		const itemsSpawned: any[] = [];
		let roomModified = false;

		switch (effect.type) {
			case EffectTargetType.CHARACTER:
				if (effect.characterEffect) {
					if (!character.statusEffects) {
						character.statusEffects = [];
					}
					character.statusEffects.push(effect.characterEffect);
					statusEffects.push(effect.characterEffect);
				}

				if (effect.healAmount && effect.healAmount.includes('d')) {
					try {
						healing = DiceRoller.parseDiceRoll(effect.healAmount);
						character.hp.current = Math.min(character.hp.max, character.hp.current + healing);
						message += ` You recover ${healing} hit points.`;
					} catch (error) {
						healing = 3; // Fallback healing
						character.hp.current = Math.min(character.hp.max, character.hp.current + healing);
						message += ` You recover ${healing} hit points.`;
					}
				}

				if (effect.damageAmount && effect.damageAmount.includes('d')) {
					try {
						damage = DiceRoller.parseDiceRoll(effect.damageAmount);
						character.hp.current = Math.max(0, character.hp.current - damage);
						message += ` You take ${damage} damage.`;
					} catch (error) {
						damage = 2; // Fallback damage
						character.hp.current = Math.max(0, character.hp.current - damage);
						message += ` You take ${damage} damage.`;
					}
				}
				break;

			case EffectTargetType.SPAWN_ITEMS:
				if (effect.spawnItems) {
					itemsSpawned.push(...effect.spawnItems);
					const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
					if (currentRoom) {
						currentRoom.contents.items.push(...effect.spawnItems);
						const itemNames = effect.spawnItems.map(item => item.name).join(', ');
						message += ` ${itemNames} appears!`;
					}
				}
				break;

			case EffectTargetType.ROOM:
				if (effect.roomModification) {
					roomModified = true;
					message += " The room changes around you!";
					// Room modification logic would be handled by the calling system
				}
				break;

			case EffectTargetType.TELEPORT:
				if (effect.teleportDestination) {
					// Teleportation would be handled by the calling system
					message += " You are teleported away!";
				}
				break;
		}

		return {
			success: true,
			message,
			damage: damage > 0 ? damage : undefined,
			healing: healing > 0 ? healing : undefined,
			statusEffects: statusEffects.length > 0 ? statusEffects : undefined,
			itemsSpawned: itemsSpawned.length > 0 ? itemsSpawned : undefined,
			roomModified
		};
	}

	private makeSkillCheck(character: Character, skillType: string, dc: number): { success: boolean; message: string } {
		let modifier = 0;
		let skillName = skillType;

		// Map skill types to character stats
		switch (skillType.toLowerCase()) {
			case 'strength':
				modifier = Math.floor((character.stats.strength - 10) / 2);
				skillName = 'Strength';
				break;
			case 'dexterity':
				modifier = Math.floor((character.stats.dexterity - 10) / 2);
				skillName = 'Dexterity';
				break;
			case 'intelligence':
				modifier = Math.floor((character.stats.intelligence - 10) / 2);
				skillName = 'Intelligence';
				break;
			case 'wisdom':
				modifier = Math.floor((character.stats.wisdom - 10) / 2);
				skillName = 'Wisdom';
				break;
		}

		// Add proficiency bonus
		const proficiencyBonus = Math.ceil(character.level / 4) + 1;

		// Class bonuses for specific skills
		if (character.class === 'Rogue' && skillType.toLowerCase() === 'dexterity') {
			modifier += 2; // Rogues are better at dexterity-based checks
		}
		if (character.class === 'Wizard' && skillType.toLowerCase() === 'intelligence') {
			modifier += 2; // Wizards are better at intelligence-based checks
		}

		const roll = DiceRoller.rollD20();
		const total = roll + modifier + proficiencyBonus;

		return {
			success: total >= dc,
			message: `${skillName} check: rolled ${roll} + ${modifier + proficiencyBonus} = ${total} vs DC ${dc}`
		};
	}

	private getHazardSaveDC(severity: HazardSeverity): number {
		switch (severity) {
			case HazardSeverity.MINOR: return 10;
			case HazardSeverity.MODERATE: return 13;
			case HazardSeverity.SEVERE: return 16;
			case HazardSeverity.EXTREME: return 20;
			default: return 12;
		}
	}

	// Generate environmental hazards for rooms
	generateHazard(roomType: string, roomDepth: number, rng: RandomGenerator): EnvironmentalHazard | null {
		const hazardTypes = this.getHazardTypesForRoom(roomType);
		if (hazardTypes.length === 0) return null;

		const hazardType = rng.choose(hazardTypes);
		const severity = this.getHazardSeverityForDepth(roomDepth);

		return this.createHazard(hazardType, severity);
	}

	// Generate interactive elements for rooms
	generateInteractiveElement(roomType: string, roomDepth: number, rng: RandomGenerator): InteractiveElement | null {
		const elementTypes = this.getInteractiveTypesForRoom(roomType);
		if (elementTypes.length === 0) return null;

		const elementType = rng.choose(elementTypes);

		return this.createInteractiveElement(elementType, roomDepth);
	}

	private getHazardTypesForRoom(roomType: string): HazardType[] {
		const baseHazards = [HazardType.POISON_GAS, HazardType.UNSTABLE_FLOOR];

		switch (roomType) {
			case 'library':
				return [...baseHazards, HazardType.MAGICAL_DARKNESS, HazardType.ARCANE_STORM];
			case 'armory':
				return [...baseHazards, HazardType.EXTREME_COLD];
			case 'treasure_room':
				return [HazardType.POISON_GAS, HazardType.ARCANE_STORM, HazardType.MAGICAL_DARKNESS];
			case 'corridor':
				return [HazardType.POISON_GAS, HazardType.UNSTABLE_FLOOR, HazardType.THICK_FOG];
			default:
				return baseHazards;
		}
	}

	private getInteractiveTypesForRoom(roomType: string): InteractiveType[] {
		const baseElements = [InteractiveType.LEVER, InteractiveType.SWITCH];

		switch (roomType) {
			case 'library':
				return [InteractiveType.BOOKSHELF, InteractiveType.ALTAR, ...baseElements];
			case 'throne_room':
				return [InteractiveType.ALTAR, InteractiveType.STATUE, InteractiveType.LEVER];
			case 'armory':
				return [InteractiveType.SWITCH, InteractiveType.PRESSURE_PLATE, InteractiveType.GATE_CONTROL];
			case 'treasure_room':
				return [InteractiveType.PRESSURE_PLATE, InteractiveType.STATUE, InteractiveType.CRYSTAL];
			case 'chamber':
				return [InteractiveType.FOUNTAIN, InteractiveType.CRYSTAL, InteractiveType.TELEPORTER];
			default:
				return baseElements;
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
			description: hazardData.description,
			type,
			severity,
			isPermanent: hazardData.isPermanent,
			duration: hazardData.duration,
			damagePerTurn: hazardData.damagePerTurn,
			effectType: hazardData.effectType,
			resistanceType: hazardData.resistanceType,
			triggeredByMovement: hazardData.triggeredByMovement,
			affectsSpellcasting: hazardData.affectsSpellcasting
		};
	}

	private createInteractiveElement(type: InteractiveType, roomDepth: number): InteractiveElement {
		const elementData = this.getInteractiveElementData(type, roomDepth);

		return {
			id: `interactive_${Date.now()}_${Math.random()}`,
			name: elementData.name,
			description: elementData.description,
			type,
			activated: false,
			usesRemaining: elementData.usesRemaining,
			requiresItem: elementData.requiresItem,
			skillRequired: elementData.skillRequired,
			difficultyClass: elementData.difficultyClass,
			cooldownTurns: elementData.cooldownTurns,
			effect: elementData.effect
		};
	}

	private getHazardData(type: HazardType, severity: HazardSeverity) {
		const severityMultiplier = {
			[HazardSeverity.MINOR]: 1,
			[HazardSeverity.MODERATE]: 2,
			[HazardSeverity.SEVERE]: 3,
			[HazardSeverity.EXTREME]: 4
		};

		const baseDamage = severityMultiplier[severity];

		switch (type) {
			case HazardType.POISON_GAS:
				return {
					name: "Poison Gas",
					description: "Toxic vapors fill the air",
					isPermanent: false,
					duration: 5 + baseDamage,
					damagePerTurn: `${baseDamage}d4`,
					effectType: EnvironmentalEffect.CONTINUOUS_DAMAGE,
					resistanceType: "poison_resistance",
					triggeredByMovement: false,
					affectsSpellcasting: false
				};

			case HazardType.MAGICAL_DARKNESS:
				return {
					name: "Magical Darkness",
					description: "Supernatural darkness obscures vision",
					isPermanent: true,
					effectType: EnvironmentalEffect.REDUCED_VISIBILITY,
					resistanceType: "darkvision",
					triggeredByMovement: false,
					affectsSpellcasting: true
				};

			case HazardType.UNSTABLE_FLOOR:
				return {
					name: "Unstable Flooring",
					description: "The floor creaks ominously with each step",
					isPermanent: true,
					effectType: EnvironmentalEffect.MOVEMENT_PENALTY,
					triggeredByMovement: true,
					affectsSpellcasting: false
				};

			default:
				return {
					name: "Unknown Hazard",
					description: "Something dangerous lurks here",
					isPermanent: true,
					triggeredByMovement: false,
					affectsSpellcasting: false
				};
		}
	}

	private getInteractiveElementData(type: InteractiveType, roomDepth: number) {
		const difficultyByDepth = Math.min(20, 10 + roomDepth * 2);

		switch (type) {
			case InteractiveType.FOUNTAIN:
				return {
					name: "Ancient Fountain",
					description: "A stone fountain with crystal-clear water",
					usesRemaining: 3,
					skillRequired: undefined,
					difficultyClass: undefined,
					cooldownTurns: undefined,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.CHARACTER,
						description: "The magical water restores your vitality",
						healAmount: "2d4+2",
						characterEffect: {
							type: StatusEffectType.BLESSED,
							duration: 10,
							modifier: 2,
							description: "Blessed by sacred waters"
						}
					}
				};

			case InteractiveType.ALTAR:
				return {
					name: "Sacred Altar",
					description: "An ornate altar radiating divine energy",
					usesRemaining: 1,
					skillRequired: "wisdom",
					difficultyClass: difficultyByDepth,
					cooldownTurns: undefined,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.CHARACTER,
						description: "Divine power flows through you",
						characterEffect: {
							type: StatusEffectType.BLESSED,
							duration: 20,
							modifier: 3,
							description: "Divinely blessed"
						}
					}
				};

			case InteractiveType.LEVER:
				return {
					name: "Ancient Lever",
					description: "A heavy stone lever built into the wall",
					usesRemaining: undefined,
					skillRequired: "strength",
					difficultyClass: difficultyByDepth - 5,
					cooldownTurns: 5,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.ROOM,
						description: "You hear the rumbling of ancient mechanisms",
						roomModification: {
							type: ModificationType.OPEN_SECRET_PASSAGE,
							duration: 50
						}
					}
				};

			case InteractiveType.SWITCH:
				return {
					name: "Wall Switch",
					description: "A mechanical switch embedded in the wall",
					usesRemaining: undefined,
					skillRequired: undefined,
					difficultyClass: undefined,
					cooldownTurns: 3,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.ROOM,
						description: "Mechanisms activate throughout the room",
						roomModification: {
							type: ModificationType.TOGGLE_HAZARD,
							duration: 30
						}
					}
				};

			case InteractiveType.PRESSURE_PLATE:
				return {
					name: "Pressure Plate",
					description: "A stone plate set flush with the floor",
					usesRemaining: undefined,
					skillRequired: undefined,
					difficultyClass: undefined,
					cooldownTurns: undefined,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.DOOR,
						description: "A door somewhere opens",
						doorId: "secret_door"
					}
				};

			case InteractiveType.STATUE:
				return {
					name: "Ancient Statue",
					description: "A weathered statue of a forgotten deity",
					usesRemaining: 1,
					skillRequired: "wisdom",
					difficultyClass: difficultyByDepth,
					cooldownTurns: undefined,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.CHARACTER,
						description: "Ancient wisdom flows through you",
						characterEffect: {
							type: StatusEffectType.ENERGIZED,
							duration: 15,
							modifier: 2,
							description: "Enlightened by ancient knowledge"
						}
					}
				};

			case InteractiveType.CRYSTAL:
				return {
					name: "Glowing Crystal",
					description: "A pulsing crystal emanating magical energy",
					usesRemaining: 3,
					skillRequired: "intelligence",
					difficultyClass: difficultyByDepth,
					cooldownTurns: 10,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.CHARACTER,
						description: "Magical energy courses through your body",
						healAmount: "1d8+3"
					}
				};

			case InteractiveType.BOOKSHELF:
				return {
					name: "Ancient Bookshelf",
					description: "Dusty tomes line these weathered shelves",
					usesRemaining: 2,
					skillRequired: "intelligence",
					difficultyClass: difficultyByDepth - 3,
					cooldownTurns: undefined,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.SPAWN_ITEMS,
						description: "You discover valuable knowledge",
						spawnItems: [] // This would be filled by the system
					}
				};

			case InteractiveType.TELEPORTER:
				return {
					name: "Teleportation Circle",
					description: "Arcane symbols glow faintly on the floor",
					usesRemaining: 1,
					skillRequired: "intelligence",
					difficultyClass: difficultyByDepth + 2,
					cooldownTurns: undefined,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.TELEPORT,
						description: "Reality shifts around you",
						teleportDestination: "random_room"
					}
				};

			case InteractiveType.GATE_CONTROL:
				return {
					name: "Gate Control",
					description: "A mechanical device controlling a gate mechanism",
					usesRemaining: undefined,
					skillRequired: "dexterity",
					difficultyClass: difficultyByDepth,
					cooldownTurns: undefined,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.DOOR,
						description: "You hear a gate opening in the distance",
						doorId: "gate"
					}
				};

			default:
				return {
					name: "Mysterious Object",
					description: "An unidentified interactive element",
					usesRemaining: 1,
					skillRequired: undefined,
					difficultyClass: undefined,
					cooldownTurns: undefined,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.CHARACTER,
						description: "Nothing happens"
					}
				};
		}
	}
}