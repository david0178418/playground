export interface Spell {
	id: string;
	name: string;
	description: string;
	level: number;
	manaCost: number;
	school: SpellSchool;
	castingTime: CastingTime;
	range: string;
	duration?: number;
	damage?: string;
	targetType: TargetType;
	ritual?: boolean;
	effects: SpellEffect[];
}

export interface SpellEffect {
	type: EffectType;
	damageType?: DamageType;
	value?: string | number;
	duration?: number;
	target?: string;
	autoHit?: boolean;
	saveType?: SaveType;
	saveDC?: number;
	scalingAttribute?: StatType;
	effect?: string;
	summonType?: string;
}

export interface ActiveSpell {
	spellId: string;
	casterName: string;
	targetId?: string;
	remainingDuration: number;
	effects: SpellEffect[];
}

export interface SpellcastingInfo {
	knownSpells: string[];
	preparedSpells?: string[];
	spellSlots?: Record<number, { current: number; max: number }>;
	spellcastingAbility: StatType;
	spellSaveDC: number;
	spellAttackBonus: number;
}

export enum SpellSchool {
	EVOCATION = "evocation",
	ABJURATION = "abjuration",
	ENCHANTMENT = "enchantment",
	DIVINATION = "divination",
	NECROMANCY = "necromancy",
	CONJURATION = "conjuration",
	ILLUSION = "illusion",
	TRANSMUTATION = "transmutation"
}

export enum CastingTime {
	ACTION = "action",
	BONUS_ACTION = "bonus_action",
	REACTION = "reaction",
	RITUAL = "ritual"
}

export enum TargetType {
	SELF = "self",
	SINGLE = "single",
	AREA = "area",
	UTILITY = "utility"
}

export enum EffectType {
	DAMAGE = "damage",
	HEALING = "healing",
	AC_BONUS = "ac_bonus",
	AC_BASE = "ac_base",
	ATTACK_BONUS = "attack_bonus",
	SAVE_BONUS = "save_bonus",
	FEAR = "fear",
	SANCTUARY = "sanctuary",
	SUMMON = "summon",
	UTILITY = "utility"
}

export enum DamageType {
	FIRE = "fire",
	COLD = "cold",
	LIGHTNING = "lightning",
	ACID = "acid",
	POISON = "poison",
	NECROTIC = "necrotic",
	RADIANT = "radiant",
	FORCE = "force",
	PSYCHIC = "psychic",
	THUNDER = "thunder"
}

export enum SaveType {
	STRENGTH = "strength",
	DEXTERITY = "dexterity",
	CONSTITUTION = "constitution",
	INTELLIGENCE = "intelligence",
	WISDOM = "wisdom",
	CHARISMA = "charisma"
}

export enum StatType {
	STRENGTH = "strength",
	DEXTERITY = "dexterity",
	CONSTITUTION = "constitution",
	INTELLIGENCE = "intelligence",
	WISDOM = "wisdom",
	CHARISMA = "charisma"
}

export interface SpellCastResult {
	success: boolean;
	message: string;
	damage?: number;
	healing?: number;
	effectsApplied: ActiveSpell[];
	manaCost: number;
}