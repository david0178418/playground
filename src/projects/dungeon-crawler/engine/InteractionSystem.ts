import type { Character } from '../models/Character';
import type { Room, Trap, Puzzle, Lock } from '../models/Room';
import { TrapType, TrapEffect, PuzzleType, LockType } from '../models/Room';
import { DiceRoller } from '../utils/DiceRoller';
import { RandomGenerator } from '../utils/RandomGenerator';

export interface InteractionResult {
	success: boolean;
	message: string;
	damage?: number;
	itemsFound?: any[];
	effectApplied?: string;
}

export class InteractionSystem {
	private rng: RandomGenerator;

	constructor() {
		this.rng = new RandomGenerator();
	}

	// Lock picking system
	attemptLockPicking(character: Character, lock: Lock): InteractionResult {
		if (lock.unlocked) {
			return { success: false, message: "This lock is already unlocked." };
		}

		// Calculate lock picking skill (simplified)
		const dexModifier = Math.floor((character.stats.dexterity - 10) / 2);
		const proficiencyBonus = Math.ceil(character.level / 4) + 1;

		// Rogues get bonus to lock picking
		const classBonus = character.class === 'Rogue' ? 3 : 0;

		const roll = DiceRoller.rollD20();
		const total = roll + dexModifier + proficiencyBonus + classBonus;

		lock.attempts = (lock.attempts || 0) + 1;

		if (total >= lock.difficulty) {
			lock.unlocked = true;
			return {
				success: true,
				message: `Successfully picked the lock! (rolled ${roll} + ${total - roll} = ${total} vs DC ${lock.difficulty})`
			};
		} else {
			// Failure might have consequences for complex locks
			let failureMessage = `Failed to pick the lock. (rolled ${roll} + ${total - roll} = ${total} vs DC ${lock.difficulty})`;

			if (lock.type === LockType.COMPLEX && lock.attempts >= 3) {
				failureMessage += " The lock mechanism jams from too many failed attempts!";
				lock.difficulty += 5; // Make it harder
			}

			return { success: false, message: failureMessage };
		}
	}

	// Use key on lock
	useKey(character: Character, lock: Lock, keyId: string): InteractionResult {
		if (lock.unlocked) {
			return { success: false, message: "This lock is already unlocked." };
		}

		if (lock.keyId !== keyId) {
			return { success: false, message: "This key doesn't fit this lock." };
		}

		// Check if character has the key
		const hasKey = character.inventory.some(item => item.id === keyId);
		if (!hasKey) {
			return { success: false, message: "You don't have the required key." };
		}

		lock.unlocked = true;
		return { success: true, message: "The key fits perfectly! The lock opens with a satisfying click." };
	}

	// Trap detection system
	attemptTrapDetection(character: Character, trap: Trap): InteractionResult {
		if (trap.detected) {
			return { success: true, message: "You already know about this trap." };
		}

		// Calculate perception skill
		const wisModifier = Math.floor((character.stats.wisdom - 10) / 2);
		const proficiencyBonus = Math.ceil(character.level / 4) + 1;

		// Rogues get bonus to trap detection
		const classBonus = character.class === 'Rogue' ? 3 : 0;

		const roll = DiceRoller.rollD20();
		const total = roll + wisModifier + proficiencyBonus + classBonus;

		if (total >= trap.detectionDC) {
			trap.detected = true;
			return {
				success: true,
				message: `You spot a ${trap.name}! ${trap.description} (rolled ${roll} + ${total - roll} = ${total} vs DC ${trap.detectionDC})`
			};
		} else {
			return {
				success: false,
				message: `You don't notice anything suspicious. (rolled ${roll} + ${total - roll} = ${total} vs DC ${trap.detectionDC})`
			};
		}
	}

	// Trap disarming system
	attemptTrapDisarming(character: Character, trap: Trap): InteractionResult {
		if (!trap.detected) {
			return { success: false, message: "You must detect the trap first before attempting to disarm it." };
		}

		if (trap.disarmed) {
			return { success: false, message: "This trap has already been disarmed." };
		}

		// Calculate disarm skill
		const dexModifier = Math.floor((character.stats.dexterity - 10) / 2);
		const proficiencyBonus = Math.ceil(character.level / 4) + 1;

		// Rogues get bonus to trap disarming
		const classBonus = character.class === 'Rogue' ? 4 : 0;

		const roll = DiceRoller.rollD20();
		const total = roll + dexModifier + proficiencyBonus + classBonus;

		if (total >= trap.disarmDC) {
			trap.disarmed = true;
			return {
				success: true,
				message: `Successfully disarmed the ${trap.name}! (rolled ${roll} + ${total - roll} = ${total} vs DC ${trap.disarmDC})`
			};
		} else {
			// Failed disarm might trigger the trap
			if (roll === 1) {
				return this.triggerTrap(character, trap);
			}

			return {
				success: false,
				message: `Failed to disarm the trap. (rolled ${roll} + ${total - roll} = ${total} vs DC ${trap.disarmDC}) Be careful - one wrong move could trigger it!`
			};
		}
	}

	// Trigger trap
	triggerTrap(character: Character, trap: Trap): InteractionResult {
		if (trap.triggered || trap.disarmed) {
			return { success: false, message: "This trap has already been triggered or disarmed." };
		}

		trap.triggered = true;

		let damage = 0;
		let message = `The ${trap.name} triggers! `;
		let effectApplied;

		// Calculate damage if applicable
		if (trap.damage) {
			damage = DiceRoller.parseDiceRoll(trap.damage);
			character.hp.current = Math.max(0, character.hp.current - damage);
			message += `You take ${damage} damage! `;
		}

		// Apply additional effects
		switch (trap.effect) {
			case TrapEffect.POISON:
				effectApplied = "poisoned";
				message += "You feel sick from the poison!";
				break;
			case TrapEffect.PARALYSIS:
				effectApplied = "paralyzed";
				message += "Your muscles seize up!";
				break;
			case TrapEffect.ALARM:
				message += "A loud alarm echoes through the dungeon!";
				break;
			default:
				message += trap.description;
		}

		return { success: false, message, damage, effectApplied };
	}

	// Puzzle solving system
	attemptPuzzle(_character: Character, puzzle: Puzzle, answer: string): InteractionResult {
		if (puzzle.solved) {
			return { success: false, message: "This puzzle has already been solved." };
		}

		puzzle.attempts++;

		// Check if max attempts reached
		if (puzzle.maxAttempts && puzzle.attempts > puzzle.maxAttempts) {
			return {
				success: false,
				message: "You've made too many attempts at this puzzle. It locks you out permanently."
			};
		}

		// Check answer
		const isCorrect = answer.toLowerCase().trim() === puzzle.solution.toLowerCase().trim();

		if (isCorrect) {
			puzzle.solved = true;
			let message = `Correct! You solve the ${puzzle.name}. `;

			const itemsFound = puzzle.reward || [];
			if (itemsFound.length > 0) {
				message += `You find: ${itemsFound.map(item => item.name).join(', ')}`;
			}

			return { success: true, message, itemsFound };
		} else {
			let message = `Incorrect answer. `;

			if (puzzle.maxAttempts) {
				const remaining = puzzle.maxAttempts - puzzle.attempts;
				message += `You have ${remaining} attempts remaining.`;
			}

			// Apply penalty on wrong answer
			if (puzzle.penalty && this.rng.random() < 0.3) {
				message += ` ${puzzle.penalty}`;
			}

			return { success: false, message };
		}
	}

	// Check for automatic trap triggers when entering room
	checkTrapTriggers(character: Character, room: Room): InteractionResult[] {
		if (!room.traps) return [];

		const results: InteractionResult[] = [];

		for (const trap of room.traps) {
			if (trap.triggered || trap.disarmed || trap.detected) continue;

			// Some traps trigger automatically on entry
			if (trap.type === TrapType.PIT || trap.type === TrapType.ALARM) {
				// Make a dex save to avoid pit traps
				const dexModifier = Math.floor((character.stats.dexterity - 10) / 2);
				const roll = DiceRoller.rollD20();
				const total = roll + dexModifier;

				if (total < trap.detectionDC) {
					results.push(this.triggerTrap(character, trap));
				}
			}
		}

		return results;
	}

	// Generate random puzzles
	generateRandomPuzzle(): Puzzle {
		const puzzleTypes = Object.values(PuzzleType);
		const type = puzzleTypes[Math.floor(this.rng.random() * puzzleTypes.length)];

		if (!type) {
			throw new Error('No puzzle types available');
		}

		const puzzles = this.getPuzzleTemplates();
		const puzzleList = puzzles[type];
		if (!puzzleList || puzzleList.length === 0) {
			throw new Error(`No puzzles available for type: ${type}`);
		}
		const template = puzzleList[Math.floor(this.rng.random() * puzzleList.length)];

		if (!template) {
			throw new Error(`No template found for puzzle type: ${type}`);
		}

		return {
			id: `puzzle_${Date.now()}`,
			name: template.name,
			description: template.description,
			type,
			solved: false,
			solution: template.solution,
			attempts: 0,
			maxAttempts: template.maxAttempts
		};
	}

	private getPuzzleTemplates() {
		return {
			[PuzzleType.RIDDLE]: [
				{
					name: "Ancient Riddle",
					description: "Carved into the wall: 'I speak without a mouth and hear without ears. I have no body, but come alive with the wind. What am I?'",
					solution: "echo",
					maxAttempts: 3
				},
				{
					name: "Sphinx's Question",
					description: "A mystical voice asks: 'What has keys but no locks, space but no room, you can enter but not go inside?'",
					solution: "keyboard",
					maxAttempts: 3
				}
			],
			[PuzzleType.MATH]: [
				{
					name: "Arithmetic Lock",
					description: "A combination lock with the equation: If I have 3 apples and buy 4 more, then eat 2, how many do I have?",
					solution: "5",
					maxAttempts: 5
				}
			],
			[PuzzleType.SEQUENCE]: [
				{
					name: "Pattern Lock",
					description: "A sequence of gems: Red, Blue, Red, Blue, Red, ___. What color comes next?",
					solution: "blue",
					maxAttempts: 3
				}
			],
			[PuzzleType.WORD]: [
				{
					name: "Word Scramble",
					description: "Unscramble these letters to find the key word: GNDRUAOE",
					solution: "dragon",
					maxAttempts: 5
				}
			],
			[PuzzleType.SYMBOL]: [
				{
					name: "Symbol Cipher",
					description: "Ancient symbols spell out a word. ☀️🌙⭐ represents 'sun moon star'. What does 🔥💧🌍 represent?",
					solution: "fire water earth",
					maxAttempts: 3
				}
			]
		};
	}
}