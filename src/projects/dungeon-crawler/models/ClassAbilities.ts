import type { Character } from './Character';
import { CharacterClass } from './Character';

export interface ClassAbility {
	id: string;
	name: string;
	description: string;
	levelRequired: number;
	usesPerDay?: number;
	currentUses?: number;
	abilityType: AbilityType;
	effects: AbilityEffect[];
}

export interface AbilityEffect {
	type: EffectType;
	value?: number;
	duration?: number;
	target?: EffectTarget;
	condition?: string;
}

export enum AbilityType {
	PASSIVE = "passive",
	ACTIVE = "active",
	COMBAT = "combat",
	EXPLORATION = "exploration"
}

export enum EffectType {
	STAT_BONUS = "stat_bonus",
	DAMAGE_BONUS = "damage_bonus",
	AC_BONUS = "ac_bonus",
	HP_BONUS = "hp_bonus",
	SKILL_BONUS = "skill_bonus",
	SPELL_SLOT = "spell_slot",
	SPECIAL = "special"
}

export enum EffectTarget {
	SELF = "self",
	TARGET = "target",
	ALL_ENEMIES = "all_enemies",
	PARTY = "party"
}

export const CLASS_ABILITIES: Record<CharacterClass, ClassAbility[]> = {
	[CharacterClass.FIGHTER]: [
		{
			id: "weapon_mastery",
			name: "Weapon Mastery",
			description: "+1 damage with all weapon attacks",
			levelRequired: 1,
			abilityType: AbilityType.PASSIVE,
			effects: [
				{ type: EffectType.DAMAGE_BONUS, value: 1, target: EffectTarget.SELF }
			]
		},
		{
			id: "second_wind",
			name: "Second Wind",
			description: "Recover 1d10+level HP once per day",
			levelRequired: 1,
			usesPerDay: 1,
			currentUses: 1,
			abilityType: AbilityType.ACTIVE,
			effects: [
				{ type: EffectType.SPECIAL, value: 0, target: EffectTarget.SELF }
			]
		},
		{
			id: "action_surge",
			name: "Action Surge",
			description: "Take an extra action in combat once per day",
			levelRequired: 2,
			usesPerDay: 1,
			currentUses: 1,
			abilityType: AbilityType.COMBAT,
			effects: [
				{ type: EffectType.SPECIAL, target: EffectTarget.SELF }
			]
		}
	],

	[CharacterClass.WIZARD]: [
		{
			id: "arcane_recovery",
			name: "Arcane Recovery",
			description: "Recover half your mana once per day during rest",
			levelRequired: 1,
			usesPerDay: 1,
			currentUses: 1,
			abilityType: AbilityType.ACTIVE,
			effects: [
				{ type: EffectType.SPECIAL, target: EffectTarget.SELF }
			]
		},
		{
			id: "spell_mastery",
			name: "Spell Mastery",
			description: "Can cast spells using Intelligence modifier",
			levelRequired: 1,
			abilityType: AbilityType.PASSIVE,
			effects: [
				{ type: EffectType.SPELL_SLOT, value: 2, target: EffectTarget.SELF }
			]
		},
		{
			id: "ritual_casting",
			name: "Ritual Casting",
			description: "Can cast certain spells without using mana",
			levelRequired: 2,
			abilityType: AbilityType.PASSIVE,
			effects: [
				{ type: EffectType.SPECIAL, target: EffectTarget.SELF }
			]
		}
	],

	[CharacterClass.ROGUE]: [
		{
			id: "sneak_attack",
			name: "Sneak Attack",
			description: "+1d6 damage when attacking surprised enemies",
			levelRequired: 1,
			abilityType: AbilityType.COMBAT,
			effects: [
				{ type: EffectType.DAMAGE_BONUS, value: 6, condition: "surprised_enemy", target: EffectTarget.TARGET }
			]
		},
		{
			id: "thieves_tools",
			name: "Thieves' Tools",
			description: "Can attempt to pick locks and disarm traps",
			levelRequired: 1,
			abilityType: AbilityType.EXPLORATION,
			effects: [
				{ type: EffectType.SKILL_BONUS, value: 3, target: EffectTarget.SELF }
			]
		},
		{
			id: "uncanny_dodge",
			name: "Uncanny Dodge",
			description: "Reduce damage from one attack by half once per combat",
			levelRequired: 2,
			usesPerDay: 3,
			currentUses: 3,
			abilityType: AbilityType.COMBAT,
			effects: [
				{ type: EffectType.SPECIAL, target: EffectTarget.SELF }
			]
		}
	],

	[CharacterClass.CLERIC]: [
		{
			id: "divine_spellcasting",
			name: "Divine Spellcasting",
			description: "Can cast divine spells using Wisdom modifier",
			levelRequired: 1,
			abilityType: AbilityType.PASSIVE,
			effects: [
				{ type: EffectType.SPELL_SLOT, value: 2, target: EffectTarget.SELF }
			]
		},
		{
			id: "turn_undead",
			name: "Turn Undead",
			description: "Force undead enemies to flee for 1 minute",
			levelRequired: 1,
			usesPerDay: 2,
			currentUses: 2,
			abilityType: AbilityType.COMBAT,
			effects: [
				{ type: EffectType.SPECIAL, duration: 10, target: EffectTarget.ALL_ENEMIES }
			]
		},
		{
			id: "channel_divinity",
			name: "Channel Divinity",
			description: "Heal yourself or allies for 2d8+Wisdom HP",
			levelRequired: 2,
			usesPerDay: 1,
			currentUses: 1,
			abilityType: AbilityType.ACTIVE,
			effects: [
				{ type: EffectType.SPECIAL, target: EffectTarget.SELF }
			]
		}
	]
};

export class ClassAbilityManager {
	static getAbilitiesForCharacter(character: Character): ClassAbility[] {
		const classAbilities = CLASS_ABILITIES[character.class] || [];
		return classAbilities.filter(ability => character.level >= ability.levelRequired);
	}

	static resetDailyAbilities(_character: Character): void {
		// This would reset daily use abilities - placeholder for now
	}

	static canUseAbility(character: Character, abilityId: string): boolean {
		const abilities = this.getAbilitiesForCharacter(character);
		const ability = abilities.find(a => a.id === abilityId);

		if (!ability) return false;
		if (ability.usesPerDay === undefined) return true;

		return (ability.currentUses || 0) > 0;
	}

	static useAbility(character: Character, abilityId: string): boolean {
		const abilities = this.getAbilitiesForCharacter(character);
		const ability = abilities.find(a => a.id === abilityId);

		if (!ability || !this.canUseAbility(character, abilityId)) {
			return false;
		}

		if (ability.usesPerDay !== undefined && ability.currentUses !== undefined) {
			ability.currentUses--;
		}

		return true;
	}

	static getStatBonus(character: Character, _statType: string): number {
		const abilities = this.getAbilitiesForCharacter(character);
		let bonus = 0;

		for (const ability of abilities) {
			if (ability.abilityType === AbilityType.PASSIVE) {
				for (const effect of ability.effects) {
					if (effect.type === EffectType.STAT_BONUS) {
						bonus += effect.value || 0;
					}
				}
			}
		}

		return bonus;
	}

	static getDamageBonus(character: Character): number {
		const abilities = this.getAbilitiesForCharacter(character);
		let bonus = 0;

		for (const ability of abilities) {
			if (ability.abilityType === AbilityType.PASSIVE) {
				for (const effect of ability.effects) {
					if (effect.type === EffectType.DAMAGE_BONUS) {
						bonus += effect.value || 0;
					}
				}
			}
		}

		return bonus;
	}

	static getACBonus(character: Character): number {
		const abilities = this.getAbilitiesForCharacter(character);
		let bonus = 0;

		for (const ability of abilities) {
			if (ability.abilityType === AbilityType.PASSIVE) {
				for (const effect of ability.effects) {
					if (effect.type === EffectType.AC_BONUS) {
						bonus += effect.value || 0;
					}
				}
			}
		}

		return bonus;
	}

	static getHPBonus(character: Character): number {
		const abilities = this.getAbilitiesForCharacter(character);
		let bonus = 0;

		for (const ability of abilities) {
			if (ability.abilityType === AbilityType.PASSIVE) {
				for (const effect of ability.effects) {
					if (effect.type === EffectType.HP_BONUS) {
						bonus += effect.value || 0;
					}
				}
			}
		}

		return bonus;
	}
}