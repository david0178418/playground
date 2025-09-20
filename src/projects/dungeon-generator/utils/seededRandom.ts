/**
 * Simple seeded pseudo-random number generator using Linear Congruential Generator (LCG)
 * Provides deterministic random sequences for reproducible dungeon generation
 */
export class SeededRandom {
	private seed: number;
	private current: number;

	constructor(seed?: string | number) {
		if (typeof seed === 'string') {
			// Convert string to number using simple hash
			this.seed = this.hashString(seed);
		} else if (typeof seed === 'number') {
			this.seed = seed;
		} else {
			// Generate random seed if none provided
			this.seed = Math.floor(Math.random() * 2147483647);
		}
		this.current = this.seed;
	}

	/**
	 * Generate next random number between 0 and 1 (exclusive)
	 */
	next(): number {
		// LCG formula: (a * x + c) % m
		// Using parameters from Numerical Recipes
		this.current = (this.current * 1664525 + 1013904223) % 2147483647;
		return this.current / 2147483647;
	}

	/**
	 * Generate random integer between min (inclusive) and max (inclusive)
	 */
	nextInt(min: number, max: number): number {
		if (min > max) {
			throw new Error('min cannot be greater than max');
		}
		const range = max - min + 1;
		return Math.floor(this.next() * range) + min;
	}

	/**
	 * Generate random integer between 0 (inclusive) and max (exclusive)
	 */
	nextIntMax(max: number): number {
		return Math.floor(this.next() * max);
	}

	/**
	 * Pick random element from array
	 */
	choice<T>(array: T[]): T {
		if (array.length === 0) {
			throw new Error('Cannot choose from empty array');
		}
		const index = this.nextIntMax(array.length);
		const element = array[index];
		if (element === undefined) {
			throw new Error('Array element selection error');
		}
		return element;
	}

	/**
	 * Shuffle array in place using Fisher-Yates algorithm
	 */
	shuffle<T>(array: T[]): T[] {
		for (let i = array.length - 1; i > 0; i--) {
			const j = this.nextIntMax(i + 1);
			[array[i], array[j]] = [array[j]!, array[i]!];
		}
		return array;
	}

	/**
	 * Get the current seed value
	 */
	getSeed(): number {
		return this.seed;
	}

	/**
	 * Get the seed as a string for display/storage
	 */
	getSeedString(): string {
		return this.seed.toString();
	}

	/**
	 * Reset the generator to initial seed state
	 */
	reset(): void {
		this.current = this.seed;
	}

	/**
	 * Simple string hash function
	 */
	private hashString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash) % 2147483647;
	}
}

/**
 * Generate a random seed string for UI use
 */
export function generateRandomSeed(): string {
	return Math.floor(Math.random() * 2147483647).toString();
}