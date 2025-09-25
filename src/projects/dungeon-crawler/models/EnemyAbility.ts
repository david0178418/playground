export interface EnemyAbility {
	id: string;
	name: string;
	description: string;
	type: AbilityType;
	targetType: AbilityTargetType;
	cooldown: number;
	lastUsedRound?: number;
	cost?: AbilityCost;
	effect: AbilityEffect;
	conditions?: AbilityCondition[];
	priority: number; // Higher priority abilities preferred by AI
}

export interface AbilityCost {
	type: 'mana' | 'health' | 'rage' | 'none';
	amount: number;
}

export interface AbilityEffect {
	type: AbilityEffectType;
	damage?: string; // Dice notation
	healing?: string; // Dice notation
	statusEffect?: StatusEffectData;
	areaEffect?: AreaEffect;
	duration?: number;
	description: string;
}

export interface StatusEffectData {
	name: string;
	description: string;
	type: StatusType;
	duration: number;
	modifier?: number;
	damagePerTurn?: string;
}

export interface AreaEffect {
	shape: 'cone' | 'line' | 'circle' | 'room';
	size: number;
	affectsAllies: boolean;
	affectsEnemies: boolean;
}

export interface AbilityCondition {
	type: ConditionType;
	value: number | string;
	comparison: 'less_than' | 'greater_than' | 'equals' | 'not_equals';
}

export enum AbilityType {
	ACTIVE = "active",           // Actively used abilities
	PASSIVE = "passive",         // Always-on effects
	REACTIVE = "reactive",       // Triggered by conditions
	LEGENDARY = "legendary"      // Boss-only special abilities
}

export enum AbilityTargetType {
	SELF = "self",
	ENEMY = "enemy",
	ALLY = "ally",
	ALL_ENEMIES = "all_enemies",
	ALL_ALLIES = "all_allies",
	AREA = "area",
	ROOM = "room"
}

export enum AbilityEffectType {
	DAMAGE = "damage",
	HEALING = "healing",
	BUFF = "buff",
	DEBUFF = "debuff",
	SUMMON = "summon",
	TELEPORT = "teleport",
	ENVIRONMENTAL = "environmental"
}

export enum StatusType {
	POISON = "poison",
	PARALYSIS = "paralysis",
	FEAR = "fear",
	RAGE = "rage",
	HASTE = "haste",
	SLOW = "slow",
	WEAKNESS = "weakness",
	STRENGTH = "strength",
	INVISIBILITY = "invisibility",
	RESTRAINED = "restrained"
}

export enum ConditionType {
	HEALTH_PERCENTAGE = "health_percentage",
	ALLY_COUNT = "ally_count",
	ENEMY_COUNT = "enemy_count",
	ROUND_NUMBER = "round_number",
	DISTANCE_TO_TARGET = "distance_to_target",
	HAS_STATUS_EFFECT = "has_status_effect"
}

// AI Behavior profiles for different enemy types
export interface AIProfile {
	behaviorType: AIBehaviorType;
	aggressiveness: number; // 0-1, how likely to attack vs other actions
	selfPreservation: number; // 0-1, how likely to retreat/defend when hurt
	tacticalAwareness: number; // 0-1, how well they coordinate and use tactics
	abilityUsage: number; // 0-1, how likely to use special abilities
	groupCoordination: number; // 0-1, how well they work with allies
	environmentalAwareness: number; // 0-1, how likely to use environmental features
}

export enum AIBehaviorType {
	BERSERKER = "berserker",     // Always attacks, ignores defense
	TACTICAL = "tactical",       // Uses positioning and abilities strategically
	DEFENSIVE = "defensive",     // Focuses on survival and support
	COWARDLY = "cowardly",      // Flees when hurt, attacks from distance
	PACK_HUNTER = "pack_hunter", // Coordinates with allies for flanking
	SPELLCASTER = "spellcaster", // Prefers magical abilities over melee
	BOSS = "boss"               // Complex multi-phase behavior
}