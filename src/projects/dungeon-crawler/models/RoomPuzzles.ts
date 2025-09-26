import type { Item } from './Character';

export interface Puzzle {
	id: string;
	name: string;
	description: string;
	type: PuzzleType;
	solved: boolean;
	solution: string;
	attempts: number;
	maxAttempts?: number;
	reward?: Item[];
	penalty?: string;
}

export enum PuzzleType {
	RIDDLE = "riddle",
	SEQUENCE = "sequence",
	SYMBOL = "symbol",
	MATH = "math",
	WORD = "word"
}