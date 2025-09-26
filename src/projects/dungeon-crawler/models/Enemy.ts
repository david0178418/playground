import type { StatBlock, Item } from './Character';
import type { EnemyAbility, AIProfile } from './EnemyAbility';

export interface Enemy {
	id: string;
	name: string;
	type: EnemyType;
	description?: string;
	stats: StatBlock;
	hp: { current: number; max: number };
	ac: number;
	attacks: Attack[];
	loot: LootTable;
	abilities?: EnemyAbility[];
	aiProfile?: AIProfile;
	resources?: EnemyResources;
}

export interface Attack {
	name: string;
	damageRoll: string; // e.g., "1d6+2"
	hitBonus: number;
	description: string;
	abilityId?: string; // Link to special ability
	recharge?: number; // Rounds before can be used again
	lastUsedRound?: number;
}

export interface EnemyResources {
	mana?: { current: number; max: number };
	rage?: { current: number; max: number };
	energy?: { current: number; max: number };
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