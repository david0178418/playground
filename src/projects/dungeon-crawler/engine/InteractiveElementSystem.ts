import type { Character } from '../models/Character';
import type {
	InteractiveElement,
	InteractiveEffect,
	CharacterStatusEffect,
	GameState
} from '../models/Room';
import {
	InteractiveType,
	EffectTargetType,
	StatusEffectType
} from '../models/Room';
import { DiceRoller } from '../utils/DiceRoller';
import { RandomGenerator } from '../utils/RandomGenerator';

export interface InteractiveResult {
	success: boolean;
	message: string;
	healing?: number;
	damage?: number;
	statusEffects?: CharacterStatusEffect[];
	itemsSpawned?: any[];
	roomModified?: boolean;
}

/**
 * Manages interactive elements like levers, switches, altars, fountains
 */
export class InteractiveElementSystem {
	constructor() {
		// Constructor intentionally minimal
	}

	/**
	 * Activate an interactive element
	 */
	activateInteractiveElement(
		character: Character,
		element: InteractiveElement,
		gameState: GameState
	): InteractiveResult {
		// Check if element can be used
		const canUse = this.canUseInteractiveElement(character, element, gameState.turnCount);
		if (!canUse.success) {
			return {
				success: false,
				message: canUse.message
			};
		}

		// Update usage tracking
		if (element.usesRemaining !== undefined) {
			element.usesRemaining--;
		}
		if (element.cooldownTurns !== undefined) {
			element.lastUsedTurn = gameState.turnCount;
		}

		return this.applyInteractiveEffect(character, element.effect, gameState);
	}

	/**
	 * Check if an interactive element can be used
	 */
	private canUseInteractiveElement(
		character: Character,
		element: InteractiveElement,
		currentTurn: number
	): { success: boolean; message: string } {
		// Check uses remaining
		if (element.usesRemaining !== undefined && element.usesRemaining <= 0) {
			return {
				success: false,
				message: `The ${element.name} has no more uses.`
			};
		}

		// Check cooldown
		if (element.cooldownTurns && element.lastUsedTurn !== undefined) {
			const turnsSinceUse = currentTurn - element.lastUsedTurn;
			if (turnsSinceUse < element.cooldownTurns) {
				return {
					success: false,
					message: `The ${element.name} is still recharging (${element.cooldownTurns - turnsSinceUse} turns remaining).`
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
					message: `${skillRoll.message} You fail to activate the ${element.name}.`
				};
			}
		}

		return { success: true, message: '' };
	}

	/**
	 * Apply the effect of an interactive element
	 */
	private applyInteractiveEffect(
		character: Character,
		effect: InteractiveEffect,
		gameState: GameState
	): InteractiveResult {
		let healing = 0;
		let damage = 0;
		const statusEffects: CharacterStatusEffect[] = [];
		const itemsSpawned: any[] = [];
		let roomModified = false;

		let message = effect.description;

		switch (effect.type) {
			case EffectTargetType.CHARACTER:
				// Apply character effects
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
						message += ` You are healed for ${healing} points.`;
					} catch {
						healing = 5;
						character.hp.current = Math.min(character.hp.max, character.hp.current + healing);
						message += ` You are healed for ${healing} points.`;
					}
				}

				if (effect.damageAmount && effect.damageAmount.includes('d')) {
					try {
						damage = DiceRoller.parseDiceRoll(effect.damageAmount);
						character.hp.current = Math.max(0, character.hp.current - damage);
						message += ` You take ${damage} damage.`;
					} catch {
						damage = 3;
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
						message += ` ${itemNames} appear${effect.spawnItems.length === 1 ? 's' : ''}.`;
					}
				}
				break;

			case EffectTargetType.ROOM:
				if (effect.roomModification) {
					roomModified = true;
					message += ' The room itself seems to change.';
				}
				break;

			case EffectTargetType.TELEPORT:
				if (effect.teleportDestination) {
					// Teleportation would be handled by the game engine
					message += ' Reality bends around you...';
				}
				break;

			case EffectTargetType.DOOR:
				message += ' You hear mechanical sounds in the distance.';
				break;

			default:
				message += ' Nothing seems to happen.';
		}

		return {
			success: true,
			message,
			healing,
			damage,
			statusEffects,
			itemsSpawned,
			roomModified
		};
	}

	/**
	 * Make a skill check for interactive elements
	 */
	private makeSkillCheck(character: Character, skillType: string, dc: number): { success: boolean; message: string } {
		let modifier = 0;

		// Calculate base modifier
		switch (skillType.toLowerCase()) {
			case 'strength':
				modifier = Math.floor((character.stats.strength - 10) / 2);
				break;
			case 'dexterity':
				modifier = Math.floor((character.stats.dexterity - 10) / 2);
				break;
			case 'intelligence':
				modifier = Math.floor((character.stats.intelligence - 10) / 2);
				break;
			case 'wisdom':
				modifier = Math.floor((character.stats.wisdom - 10) / 2);
				break;
		}

		// Add proficiency bonus
		const proficiencyBonus = Math.ceil(character.level / 4) + 1;

		// Class bonuses
		if (character.class === 'Rogue' && skillType.toLowerCase() === 'dexterity') {
			modifier += 2;
		}
		if (character.class === 'Wizard' && skillType.toLowerCase() === 'intelligence') {
			modifier += 2;
		}

		const roll = DiceRoller.rollD20();
		const total = roll + modifier + proficiencyBonus;

		return {
			success: total >= dc,
			message: `${skillType} check: ${roll} + ${modifier + proficiencyBonus} = ${total} vs DC ${dc}`
		};
	}

	/**
	 * Generate interactive elements for room types
	 */
	generateInteractiveElement(roomType: string, roomDepth: number, rng: RandomGenerator): InteractiveElement | null {
		const elementTypes = this.getInteractiveTypesForRoom(roomType);
		if (elementTypes.length === 0) return null;

		const elementType = rng.choose(elementTypes);

		return this.createInteractiveElement(elementType, roomDepth);
	}

	private getInteractiveTypesForRoom(roomType: string): InteractiveType[] {
		// Basic room type mapping
		switch (roomType) {
			case 'shrine':
				return [InteractiveType.ALTAR, InteractiveType.FOUNTAIN];
			case 'library':
				return [InteractiveType.BOOKSHELF];
			case 'treasury':
				return [InteractiveType.LEVER, InteractiveType.SWITCH];
			case 'laboratory':
				return [InteractiveType.CRYSTAL, InteractiveType.SWITCH];
			default:
				return [InteractiveType.LEVER, InteractiveType.PRESSURE_PLATE];
		}
	}

	private createInteractiveElement(type: InteractiveType, roomDepth: number): InteractiveElement {
		const elementData = this.getInteractiveElementData(type, roomDepth);

		return {
			id: `interactive_${Date.now()}_${Math.random()}`,
			name: elementData.name,
			type,
			description: elementData.description,
			activated: false,
			usesRemaining: elementData.usesRemaining,
			skillRequired: elementData.skillRequired,
			difficultyClass: elementData.difficultyClass,
			cooldownTurns: elementData.cooldownTurns,
			requiresItem: elementData.requiresItem,
			effect: elementData.effect
		};
	}

	private getInteractiveElementData(type: InteractiveType, roomDepth: number) {
		const difficultyByDepth = Math.min(20, 10 + roomDepth * 2);

		switch (type) {
			case InteractiveType.LEVER:
				return {
					name: "Ancient Lever",
					description: "A worn stone lever jutting from the wall",
					usesRemaining: undefined,
					skillRequired: "strength",
					difficultyClass: difficultyByDepth - 2,
					cooldownTurns: undefined,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.ROOM,
						description: "The lever clicks into place with a grinding sound"
					}
				};

			case InteractiveType.FOUNTAIN:
				return {
					name: "Mystical Fountain",
					description: "Crystal clear water flows from an ornate fountain",
					usesRemaining: 3,
					skillRequired: undefined,
					difficultyClass: undefined,
					cooldownTurns: undefined,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.CHARACTER,
						description: "The water tastes refreshing",
						healAmount: "2d4+1",
						characterEffect: {
							type: StatusEffectType.BLESSED,
							duration: 5,
							description: "Blessed by sacred waters",
							}
					}
				};

			case InteractiveType.ALTAR:
				return {
					name: "Sacred Altar",
					description: "A stone altar carved with divine symbols",
					usesRemaining: 1,
					skillRequired: "wisdom",
					difficultyClass: difficultyByDepth,
					cooldownTurns: undefined,
					requiresItem: undefined,
					effect: {
						type: EffectTargetType.CHARACTER,
						description: "Divine energy flows through you",
						healAmount: "3d4+3",
						characterEffect: {
							type: StatusEffectType.PROTECTED,
							duration: 10,
							description: "Protected by divine grace",
							}
					}
				};

			default:
				return {
					name: "Unknown Element",
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