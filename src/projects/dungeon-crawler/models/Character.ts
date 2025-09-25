export interface Character {
	name: string;
	class: CharacterClass;
	level: number;
	stats: StatBlock;
	hp: { current: number; max: number };
	equipment: Equipment;
	inventory: Item[];
	experience: number;
}

export interface StatBlock {
	strength: number;     // Melee damage, carrying capacity
	dexterity: number;    // AC, initiative, ranged attacks
	constitution: number; // HP, stamina
	intelligence: number; // Spell power, skill points
	wisdom: number;       // Perception, saves
	charisma: number;     // NPC interactions (future)
}

export interface Equipment {
	weapon?: Item;
	armor?: Item;
	shield?: Item;
	accessory?: Item;
}

export enum CharacterClass {
	FIGHTER = "Fighter",
	WIZARD = "Wizard",
	ROGUE = "Rogue",
	CLERIC = "Cleric"
}

export interface Item {
	id: string;
	name: string;
	baseType: ItemType;
	properties: ItemProperty[];
	rarity: Rarity;
	description?: string;
}

export interface ItemProperty {
	type: PropertyType;
	value: number;
	stat?: StatType;
}

export enum ItemType {
	WEAPON = "weapon",
	ARMOR = "armor",
	SHIELD = "shield",
	POTION = "potion",
	ACCESSORY = "accessory",
	TREASURE = "treasure"
}

export enum PropertyType {
	DAMAGE_BONUS = "damage_bonus",
	AC_BONUS = "ac_bonus",
	STAT_BONUS = "stat_bonus",
	HP_BONUS = "hp_bonus",
	HEALING = "healing"
}

export enum StatType {
	STRENGTH = "strength",
	DEXTERITY = "dexterity",
	CONSTITUTION = "constitution",
	INTELLIGENCE = "intelligence",
	WISDOM = "wisdom",
	CHARISMA = "charisma"
}

export enum Rarity {
	COMMON = "common",
	UNCOMMON = "uncommon",
	RARE = "rare",
	EPIC = "epic",
	LEGENDARY = "legendary"
}