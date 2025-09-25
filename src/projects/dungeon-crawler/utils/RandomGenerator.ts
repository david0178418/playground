export class RandomGenerator {
	private seed: number;

	constructor(seed?: string | number) {
		if (typeof seed === 'string') {
			this.seed = this.hashString(seed);
		} else if (typeof seed === 'number') {
			this.seed = seed;
		} else {
			this.seed = Math.floor(Math.random() * 1000000);
		}
	}

	private hashString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}

	next(): number {
		// Simple LCG (Linear Congruential Generator)
		this.seed = (this.seed * 9301 + 49297) % 233280;
		return this.seed / 233280;
	}

	nextInt(min: number, max: number): number {
		return Math.floor(this.next() * (max - min + 1)) + min;
	}

	choose<T>(array: T[]): T {
		if (array.length === 0) {
			throw new Error('Cannot choose from empty array');
		}
		return array[this.nextInt(0, array.length - 1)]!;
	}

	shuffle<T>(array: T[]): T[] {
		const result = [...array];
		for (let i = result.length - 1; i > 0; i--) {
			const j = this.nextInt(0, i);
			[result[i], result[j]] = [result[j]!, result[i]!];
		}
		return result;
	}

	chance(probability: number): boolean {
		return this.next() < probability;
	}

	rollDie(sides: number): number {
		return this.nextInt(1, sides);
	}

	random(): number {
		return this.next();
	}
}