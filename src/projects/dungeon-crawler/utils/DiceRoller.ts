export class DiceRoller {
	static roll(sides: number): number {
		return Math.floor(Math.random() * sides) + 1;
	}

	static rollD20(): number {
		return DiceRoller.roll(20);
	}

	static rollD6(): number {
		return DiceRoller.roll(6);
	}

	static rollD4(): number {
		return DiceRoller.roll(4);
	}

	static rollMultiple(count: number, sides: number, modifier: number = 0): number {
		let total = 0;
		for (let i = 0; i < count; i++) {
			total += DiceRoller.roll(sides);
		}
		return total + modifier;
	}

	static parseDiceRoll(rollString: string): number {
		// Parse strings like "1d6+2", "2d4", "1d8-1"
		const match = rollString.match(/(\d+)d(\d+)([+-]\d+)?/);
		if (!match || !match[1] || !match[2]) {
			throw new Error(`Invalid dice roll format: ${rollString}`);
		}

		const count = parseInt(match[1]);
		const sides = parseInt(match[2]);
		const modifier = match[3] ? parseInt(match[3]) : 0;

		return DiceRoller.rollMultiple(count, sides, modifier);
	}

	static rollWithAdvantage(): number {
		return Math.max(DiceRoller.rollD20(), DiceRoller.rollD20());
	}

	static rollWithDisadvantage(): number {
		return Math.min(DiceRoller.rollD20(), DiceRoller.rollD20());
	}
}