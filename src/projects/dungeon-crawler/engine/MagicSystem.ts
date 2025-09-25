import type { Character } from '../models/Character';
import type { Enemy } from '../models/Enemy';
import type {
	Spell,
	SpellCastResult,
	ActiveSpell,
	SpellcastingInfo
} from '../models/Magic';
import {
	EffectType,
	StatType
} from '../models/Magic';
import { DiceRoller } from '../utils/DiceRoller';
import { RandomGenerator } from '../utils/RandomGenerator';
import spellData from '../data/spells.json';

export class MagicSystem {
	private spells: Record<string, Spell>;
	private _rng: RandomGenerator;

	constructor() {
		this._rng = new RandomGenerator();
		this.spells = this.loadSpells();
	}

	private loadSpells(): Record<string, Spell> {
		const allSpells: Record<string, Spell> = {};

		// Load wizard spells
		Object.values(spellData.wizard_spells).forEach(spell => {
			allSpells[spell.id] = spell as Spell;
		});

		// Load cleric spells
		Object.values(spellData.cleric_spells).forEach(spell => {
			allSpells[spell.id] = spell as Spell;
		});

		return allSpells;
	}

	canCastSpell(caster: Character, spellId: string): { canCast: boolean; reason?: string } {
		const spell = this.spells[spellId];
		if (!spell) {
			return { canCast: false, reason: "Unknown spell" };
		}

		// Check if character knows the spell
		const spellcastingInfo = this.getSpellcastingInfo(caster);
		if (!spellcastingInfo.knownSpells.includes(spellId)) {
			return { canCast: false, reason: "Spell not known" };
		}

		// Check mana cost
		if (!caster.mana || caster.mana.current < spell.manaCost) {
			return { canCast: false, reason: "Not enough mana" };
		}

		return { canCast: true };
	}

	castSpell(
		caster: Character,
		spellId: string,
		targets?: (Character | Enemy)[],
		targetIds?: string[]
	): SpellCastResult {
		const canCastResult = this.canCastSpell(caster, spellId);
		if (!canCastResult.canCast) {
			return {
				success: false,
				message: canCastResult.reason || "Cannot cast spell",
				effectsApplied: [],
				manaCost: 0
			};
		}

		const spell = this.spells[spellId];
		if (!spell) {
			return {
				success: false,
				message: "Unknown spell",
				effectsApplied: [],
				manaCost: 0
			};
		}
		const spellcastingInfo = this.getSpellcastingInfo(caster);

		// Deduct mana
		if (caster.mana) {
			caster.mana.current -= spell.manaCost;
		}

		// Process spell effects
		const result = this.processSpellEffects(caster, spell, targets, targetIds, spellcastingInfo);

		return {
			success: true,
			message: `${caster.name} casts ${spell.name}! ${result.message}`,
			damage: result.damage,
			healing: result.healing,
			effectsApplied: result.effectsApplied,
			manaCost: spell.manaCost
		};
	}

	private processSpellEffects(
		caster: Character,
		spell: Spell,
		targets?: (Character | Enemy)[],
		targetIds?: string[],
		spellcastingInfo?: SpellcastingInfo
	): SpellCastResult {
		let totalDamage = 0;
		let totalHealing = 0;
		const effectsApplied: ActiveSpell[] = [];
		const messages: string[] = [];

		for (const effect of spell.effects) {
			switch (effect.type) {
				case EffectType.DAMAGE:
					const damage = this.calculateDamage(effect, caster, spellcastingInfo);
					totalDamage += damage;

					if (targets && targets.length > 0) {
						targets.forEach(target => {
							if ('hp' in target) {
								const actualDamage = this.applyDamage(target as any, damage, effect);
								messages.push(`${target.name} takes ${actualDamage} ${effect.damageType || 'magical'} damage`);
							}
						});
					}
					break;

				case EffectType.HEALING:
					const healing = this.calculateHealing(effect, caster, spellcastingInfo);
					totalHealing += healing;

					if (targets && targets.length > 0) {
						targets.forEach(target => {
							if ('hp' in target) {
								const actualHealing = this.applyHealing(target as Character, healing);
								messages.push(`${target.name} recovers ${actualHealing} hit points`);
							}
						});
					}
					break;

				case EffectType.AC_BONUS:
				case EffectType.AC_BASE:
				case EffectType.ATTACK_BONUS:
				case EffectType.SAVE_BONUS:
					if (effect.duration && effect.duration > 0) {
						const activeSpell: ActiveSpell = {
							spellId: spell.id,
							casterName: caster.name,
							targetId: targetIds?.[0],
							remainingDuration: effect.duration,
							effects: [effect]
						};
						effectsApplied.push(activeSpell);
						messages.push(`${effect.type.replace('_', ' ')} effect applied`);
					}
					break;

				case EffectType.UTILITY:
					messages.push(this.processUtilityEffect(effect, caster, targets));
					break;

				default:
					messages.push(`${effect.type} effect applied`);
					break;
			}
		}

		return {
			success: true,
			message: messages.join('. '),
			damage: totalDamage,
			healing: totalHealing,
			effectsApplied,
			manaCost: spell.manaCost
		};
	}

	private calculateDamage(
		effect: any,
		caster: Character,
		spellcastingInfo?: SpellcastingInfo
	): number {
		let baseDamage = 0;

		if (effect.value) {
			if (typeof effect.value === 'string') {
				baseDamage = DiceRoller.parseDiceRoll(effect.value);
			} else {
				baseDamage = effect.value;
			}
		}

		// Add spellcasting modifier if applicable
		if (effect.scalingAttribute && spellcastingInfo) {
			const statValue = caster.stats[effect.scalingAttribute as keyof typeof caster.stats];
			const modifier = Math.floor((statValue - 10) / 2);
			baseDamage += modifier;
		}

		return Math.max(0, baseDamage);
	}

	private calculateHealing(
		effect: any,
		caster: Character,
		spellcastingInfo?: SpellcastingInfo
	): number {
		let baseHealing = 0;

		if (effect.value) {
			if (typeof effect.value === 'string') {
				baseHealing = DiceRoller.parseDiceRoll(effect.value);
			} else {
				baseHealing = effect.value;
			}
		}

		// Add spellcasting modifier if applicable
		if (effect.scalingAttribute && spellcastingInfo) {
			const statValue = caster.stats[effect.scalingAttribute as keyof typeof caster.stats];
			const modifier = Math.floor((statValue - 10) / 2);
			baseHealing += modifier;
		}

		return Math.max(1, baseHealing);
	}

	private applyDamage(target: Character | Enemy, damage: number, _effect: any): number {
		const actualDamage = Math.min(damage, target.hp.current);
		target.hp.current -= actualDamage;
		return actualDamage;
	}

	private applyHealing(target: Character, healing: number): number {
		const actualHealing = Math.min(healing, target.hp.max - target.hp.current);
		target.hp.current += actualHealing;
		return actualHealing;
	}

	private processUtilityEffect(effect: any, _caster: Character, _targets?: (Character | Enemy)[]): string {
		switch (effect.effect) {
			case 'detect_magic':
				return "You sense magical auras in the area";
			default:
				return `${effect.effect} activated`;
		}
	}

	getSpellcastingInfo(character: Character): SpellcastingInfo {
		const spellcastingAbility: StatType = character.class === 'Wizard'
			? StatType.INTELLIGENCE
			: StatType.WISDOM;

		const abilityScore = character.stats[spellcastingAbility];
		const abilityModifier = Math.floor((abilityScore - 10) / 2);
		const proficiencyBonus = Math.ceil(character.level / 4) + 1;

		return {
			knownSpells: this.getKnownSpells(character),
			spellcastingAbility,
			spellSaveDC: 8 + abilityModifier + proficiencyBonus,
			spellAttackBonus: abilityModifier + proficiencyBonus
		};
	}

	private getKnownSpells(character: Character): string[] {
		const startingSpells = spellData.starting_spells as Record<string, string[]>;

		if (character.class === 'Wizard') {
			return startingSpells['wizard'] || [];
		} else if (character.class === 'Cleric') {
			return startingSpells['cleric'] || [];
		}

		return [];
	}

	getSpell(spellId: string): Spell | undefined {
		return this.spells[spellId];
	}

	getAllSpells(): Spell[] {
		return Object.values(this.spells);
	}

	getSpellsForClass(characterClass: string): Spell[] {
		const knownSpellIds = this.getKnownSpells({ class: characterClass } as Character);
		return knownSpellIds.map(id => this.spells[id]).filter((spell): spell is Spell => spell !== undefined);
	}

	restoreMana(character: Character, amount?: number): number {
		if (!character.mana) return 0;

		const restoreAmount = amount || character.mana.max;
		const actualRestore = Math.min(restoreAmount, character.mana.max - character.mana.current);
		character.mana.current += actualRestore;

		return actualRestore;
	}
}