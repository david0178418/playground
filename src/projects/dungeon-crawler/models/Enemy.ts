import type { StatBlock, Item } from './Character';

export interface Enemy {
	id: string;
	name: string;
	type: EnemyType;
	stats: StatBlock;
	hp: { current: number; max: number };
	ac: number;
	attacks: Attack[];
	loot: LootTable;
}

export interface Attack {
	name: string;
	damageRoll: string; // e.g., "1d6+2"
	hitBonus: number;
	description: string;
}

export interface LootTable {
	items: LootEntry[];
	gold: { min: number; max: number };
}

export interface LootEntry {
	item: Item;
	chance: number; // 0-1 probability
}

export enum EnemyType {
	GOBLIN = "goblin",
	ORC = "orc",
	SKELETON = "skeleton",
	ZOMBIE = "zombie",
	RAT = "rat",
	SPIDER = "spider",
	BANDIT = "bandit",
	DRAGON = "dragon"
}