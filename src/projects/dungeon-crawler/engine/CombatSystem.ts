import type { Character } from '../models/Character';
import type { Enemy, Attack } from '../models/Enemy';
import type {
	CombatState,
	CombatParticipant,
	CombatAction,
	AttackResult,
	CombatOptions,
	StatusEffect
} from '../models/Combat';
import {
	ParticipantType,
	CombatActionType,
	CombatStatus
} from '../models/Combat';
import { DiceRoller } from '../utils/DiceRoller';
import { RandomGenerator } from '../utils/RandomGenerator';
import { AIBehaviorSystem } from './AIBehaviorSystem';
import type { EnemyAbility } from '../models/EnemyAbility';
import enemyAbilitiesData from '../data/enemy-abilities.json';

export class CombatSystem {
	private rng: RandomGenerator;
	private aiBehavior: AIBehaviorSystem;
	private enemyAbilities: Record<string, EnemyAbility>;

	constructor(seed?: string) {
		this.rng = new RandomGenerator(seed);
		this.aiBehavior = new AIBehaviorSystem(seed);
		this.enemyAbilities = enemyAbilitiesData.abilities as Record<string, EnemyAbility>;
	}

	initiateCombat(
		character: Character,
		enemies: Enemy[],
		_options: Partial<CombatOptions> = {}
	): CombatState {
		const participants: CombatParticipant[] = [];

		// Add player
		const playerInitiative = this.rollInitiative(character.stats.dexterity);
		participants.push({
			id: 'player',
			name: character.name,
			type: ParticipantType.PLAYER,
			character,
			initiative: playerInitiative,
			isActive: character.hp.current > 0,
			statusEffects: []
		});

		// Add enemies
		enemies.forEach((enemy, index) => {
			const enemyInitiative = this.rollInitiative(enemy.stats.dexterity);
			participants.push({
				id: `enemy-${index}`,
				name: enemy.name,
				type: ParticipantType.ENEMY,
				enemy,
				initiative: enemyInitiative,
				isActive: enemy.hp.current > 0,
				statusEffects: []
			});
		});

		// Sort by initiative (highest first)
		participants.sort((a, b) => b.initiative - a.initiative);
		const turnOrder = participants.map(p => p.id);

		return {
			participants,
			turnOrder,
			currentTurnIndex: 0,
			round: 1,
			playerActions: [],
			status: CombatStatus.ACTIVE
		};
	}

	processPlayerAction(
		combatState: CombatState,
		action: CombatActionType,
		targetId?: string,
		_itemId?: string
	): CombatAction[] {
		const player = this.getActivePlayer(combatState);
		if (!player?.character) {
			throw new Error('No active player found');
		}

		const actions: CombatAction[] = [];

		switch (action) {
			case CombatActionType.ATTACK:
				if (!targetId) throw new Error('Attack requires a target');
				const target = combatState.participants.find(p => p.id === targetId);
				if (!target?.enemy) throw new Error('Invalid attack target');

				const attackResult = this.performAttack(player.character, target.enemy);
				actions.push({
					type: CombatActionType.ATTACK,
					actor: player.id,
					target: targetId,
					damage: attackResult.damage,
					description: attackResult.description
				});

				// Apply damage
				target.enemy.hp.current = Math.max(0, target.enemy.hp.current - attackResult.damage);
				if (target.enemy.hp.current === 0) {
					target.isActive = false;
				}
				break;

			case CombatActionType.DEFEND:
				this.applyDefendingStance(player);
				actions.push({
					type: CombatActionType.DEFEND,
					actor: player.id,
					description: `${player.name} takes a defensive stance, gaining +2 AC until their next turn.`
				});
				break;

			case CombatActionType.FLEE:
				const fleeSuccess = this.attemptFlee(combatState);
				if (fleeSuccess) {
					combatState.status = CombatStatus.FLED;
					actions.push({
						type: CombatActionType.FLEE,
						actor: player.id,
						description: `${player.name} successfully flees from combat!`
					});
				} else {
					actions.push({
						type: CombatActionType.FLEE,
						actor: player.id,
						description: `${player.name} attempts to flee but fails!`
					});
				}
				break;

			default:
				throw new Error(`Combat action ${action} not implemented`);
		}

		combatState.playerActions.push(...actions);
		return actions;
	}

	processEnemyTurns(combatState: CombatState): CombatAction[] {
		const actions: CombatAction[] = [];
		const activeEnemies = combatState.participants.filter(
			p => p.type === ParticipantType.ENEMY && p.isActive
		);

		for (const enemy of activeEnemies) {
			if (!enemy.enemy) continue;

			const aiDecision = this.getEnemyAction(enemy, combatState);
			const actionResults = this.executeEnemyAction(enemy, aiDecision.action, combatState, aiDecision.targetId, aiDecision.abilityId);
			actions.push(...actionResults);
		}

		return actions;
	}

	processSingleEnemyTurn(enemy: CombatParticipant, combatState: CombatState): CombatAction[] {
		if (!enemy.enemy) return [];

		const aiDecision = this.getEnemyAction(enemy, combatState);
		return this.executeEnemyAction(
			enemy,
			aiDecision.action,
			combatState,
			aiDecision.targetId,
			aiDecision.abilityId
		);
	}

	checkCombatEnd(combatState: CombatState): CombatStatus {
		const player = this.getActivePlayer(combatState);
		const activeEnemies = combatState.participants.filter(
			p => p.type === ParticipantType.ENEMY && p.isActive
		);

		// Check if player is defeated
		if (!player?.isActive || (player.character && player.character.hp.current <= 0)) {
			return CombatStatus.DEFEAT;
		}

		// Check if all enemies are defeated
		if (activeEnemies.length === 0) {
			return CombatStatus.VICTORY;
		}

		return combatState.status;
	}

	private rollInitiative(dexterity: number): number {
		const modifier = Math.floor((dexterity - 10) / 2);
		return DiceRoller.rollD20() + modifier;
	}

	private performAttack(attacker: Character, target: Enemy): AttackResult {
		const attackerLevel = attacker.level;
		const strengthModifier = Math.floor((attacker.stats.strength - 10) / 2);
		const proficiencyBonus = Math.ceil(attackerLevel / 4) + 1; // +2 at level 1, scales up

		// Get weapon damage
		const weaponDamage = this.getWeaponDamage(attacker);
		const baseDamage = `${weaponDamage}+${strengthModifier}`;

		// Roll attack
		const attackRoll = DiceRoller.rollD20();
		const totalAttackBonus = strengthModifier + proficiencyBonus;
		const totalAttack = attackRoll + totalAttackBonus;

		const hit = totalAttack >= target.ac;
		const critical = attackRoll === 20;

		let damage = 0;
		let damageRoll = '';

		if (hit) {
			if (critical) {
				// Critical hit: double damage dice
				damage = DiceRoller.parseDiceRoll(weaponDamage) + DiceRoller.parseDiceRoll(weaponDamage) + strengthModifier;
				damageRoll = `${weaponDamage} + ${weaponDamage} + ${strengthModifier} (critical)`;
			} else {
				damage = DiceRoller.parseDiceRoll(baseDamage);
				damageRoll = baseDamage;
			}
		}

		const description = hit
			? `${attacker.name} hits ${target.name} for ${damage} damage! (${totalAttack} vs AC ${target.ac})`
			: `${attacker.name} misses ${target.name}. (${totalAttack} vs AC ${target.ac})`;

		return {
			hit,
			damage,
			critical,
			attackRoll: totalAttack,
			damageRoll,
			description
		};
	}

	private getWeaponDamage(character: Character): string {
		const weapon = character.equipment.weapon;
		if (weapon) {
			// Extract damage from weapon properties
			const damageProperty = weapon.properties.find(p => p.type === 'damage_bonus');
			if (damageProperty) {
				return `1d${damageProperty.value}`;
			}
		}
		// Default unarmed damage
		return '1d4';
	}

	private applyDefendingStance(participant: CombatParticipant): void {
		const defendingEffect: StatusEffect = {
			id: 'defending',
			name: 'Defending',
			description: 'Taking defensive stance, +2 AC',
			duration: 1,
			effects: {
				damageReduction: 2
			}
		};

		participant.statusEffects.push(defendingEffect);
	}

	private attemptFlee(combatState: CombatState): boolean {
		// Base 50% chance to flee, modified by conditions
		let fleeChance = 0.5;

		const player = this.getActivePlayer(combatState);
		if (player?.character) {
			// Dexterity modifier affects flee chance
			const dexModifier = Math.floor((player.character.stats.dexterity - 10) / 2);
			fleeChance += dexModifier * 0.1;
		}

		// Number of enemies affects difficulty
		const enemyCount = combatState.participants.filter(
			p => p.type === ParticipantType.ENEMY && p.isActive
		).length;
		fleeChance -= (enemyCount - 1) * 0.1;

		fleeChance = Math.max(0.1, Math.min(0.9, fleeChance)); // Clamp between 10% and 90%

		return this.rng.chance(fleeChance);
	}

	private getEnemyAction(enemy: CombatParticipant, combatState: CombatState): { action: CombatActionType; targetId?: string; abilityId?: string } {
		if (!enemy.enemy) {
			return { action: CombatActionType.DEFEND };
		}

		// Get available abilities for this enemy
		const availableAbilities = this.getEnemyAbilities(enemy.enemy);

		// Use AI behavior system to make decision
		const aiDecision = this.aiBehavior.selectEnemyAction(enemy, combatState, availableAbilities);

		return {
			action: aiDecision.action,
			targetId: aiDecision.targetId,
			abilityId: aiDecision.abilityId
		};
	}

	executeEnemyAction(
		enemy: CombatParticipant,
		action: CombatActionType,
		combatState: CombatState,
		targetId?: string,
		abilityId?: string
	): CombatAction[] {
		if (!enemy.enemy) return [];

		switch (action) {
			case CombatActionType.ATTACK:
				return this.executeEnemyAttack(enemy, combatState);
			case CombatActionType.SPECIAL_ABILITY:
			case CombatActionType.CAST_SPELL:
				if (abilityId) {
					return this.executeEnemyAbility(enemy, abilityId, combatState, targetId);
				}
				return [];
			case CombatActionType.DEFEND:
				return this.executeEnemyDefend(enemy);
			case CombatActionType.FLEE:
				return this.executeEnemyFlee(enemy, combatState);
			default:
				return [];
		}
	}

	private executeEnemyAttack(enemy: CombatParticipant, combatState: CombatState): CombatAction[] {
		const player = this.getActivePlayer(combatState);
		if (!player?.character || !enemy.enemy) return [];

		// Select random attack
		const attacks = enemy.enemy.attacks || [];
		const attack = attacks.length > 0 ? this.rng.choose(attacks) : this.getDefaultAttack();

		const result = this.performEnemyAttack(enemy.enemy, attack, player.character);

		// Apply damage
		player.character.hp.current = Math.max(0, player.character.hp.current - result.damage);
		if (player.character.hp.current === 0) {
			player.isActive = false;
		}

		return [{
			type: CombatActionType.ATTACK,
			actor: enemy.id,
			target: player.id,
			damage: result.damage,
			description: result.description
		}];
	}

	private performEnemyAttack(enemy: Enemy, attack: Attack, target: Character): AttackResult {
		const attackRoll = DiceRoller.rollD20() + attack.hitBonus;
		const targetAC = this.calculateAC(target);

		const hit = attackRoll >= targetAC;
		const critical = attackRoll - attack.hitBonus === 20;

		let damage = 0;
		if (hit) {
			// Handle special case of "0" damage (like web attacks)
			if (attack.damageRoll === "0") {
				damage = 0;
			} else {
				try {
					damage = critical
						? DiceRoller.parseDiceRoll(attack.damageRoll) * 2
						: DiceRoller.parseDiceRoll(attack.damageRoll);
				} catch (error) {
					console.warn(`Invalid damage roll for ${enemy.name}: ${attack.damageRoll}`, error);
					damage = 0;
				}
			}
		}

		const description = hit
			? `${enemy.name} ${attack.description} ${target.name} for ${damage} damage!`
			: `${enemy.name} ${attack.description} ${target.name} but misses!`;

		return {
			hit,
			damage,
			critical,
			attackRoll,
			damageRoll: attack.damageRoll,
			description
		};
	}

	private getDefaultAttack(): Attack {
		return {
			name: 'Claw',
			damageRoll: '1d4',
			hitBonus: 2,
			description: 'claws at'
		};
	}

	private calculateAC(character: Character): number {
		let baseAC = 10 + Math.floor((character.stats.dexterity - 10) / 2);

		// Add armor AC bonus
		if (character.equipment.armor) {
			const acBonus = character.equipment.armor.properties.find(p => p.type === 'ac_bonus');
			if (acBonus) {
				baseAC += acBonus.value;
			}
		}

		// Add shield AC bonus
		if (character.equipment.shield) {
			const acBonus = character.equipment.shield.properties.find(p => p.type === 'ac_bonus');
			if (acBonus) {
				baseAC += acBonus.value;
			}
		}

		return baseAC;
	}

	private getActivePlayer(combatState: CombatState): CombatParticipant | undefined {
		return combatState.participants.find(p => p.type === ParticipantType.PLAYER);
	}

	private getEnemyAbilities(enemy: Enemy): EnemyAbility[] {
		if (enemy.abilities) {
			return enemy.abilities;
		}

		// Get abilities from data based on enemy type
		const abilityMappings = (enemyAbilitiesData as any).enemyAbilityMappings;
		const enemyType = enemy.type.toLowerCase();
		const abilityIds = abilityMappings[enemyType] || [];

		return abilityIds.map((id: string) => this.enemyAbilities[id]).filter(Boolean);
	}

	private executeEnemyAbility(
		enemy: CombatParticipant,
		abilityId: string,
		combatState: CombatState,
		targetId?: string
	): CombatAction[] {
		const ability = this.enemyAbilities[abilityId];
		if (!ability || !enemy.enemy) return [];

		// Mark ability as used
		ability.lastUsedRound = combatState.round;

		const target = targetId ? combatState.participants.find(p => p.id === targetId) : null;
		const actions: CombatAction[] = [];

		// Execute ability effect
		switch (ability.effect.type) {
			case 'damage':
				if (target?.character && ability.effect.damage) {
					try {
						const damage = DiceRoller.parseDiceRoll(ability.effect.damage);
						target.character.hp.current = Math.max(0, target.character.hp.current - damage);
						if (target.character.hp.current === 0) {
							target.isActive = false;
						}

						actions.push({
							type: CombatActionType.SPECIAL_ABILITY,
							actor: enemy.id,
							target: targetId,
							damage,
							description: `${enemy.name} uses ${ability.name}! ${ability.effect.description}. ${damage} damage dealt!`
						});
					} catch (error) {
						actions.push({
							type: CombatActionType.SPECIAL_ABILITY,
							actor: enemy.id,
							description: `${enemy.name} tries to use ${ability.name} but it fails!`
						});
					}
				}
				break;

			case 'healing':
				if (ability.effect.healing) {
					try {
						const healing = DiceRoller.parseDiceRoll(ability.effect.healing);
						enemy.enemy.hp.current = Math.min(enemy.enemy.hp.max, enemy.enemy.hp.current + healing);

						actions.push({
							type: CombatActionType.SPECIAL_ABILITY,
							actor: enemy.id,
							healing,
							description: `${enemy.name} uses ${ability.name}! ${ability.effect.description}. Healed ${healing} HP!`
						});
					} catch (error) {
						actions.push({
							type: CombatActionType.SPECIAL_ABILITY,
							actor: enemy.id,
							description: `${enemy.name} tries to use ${ability.name} but it fails!`
						});
					}
				}
				break;

			case 'buff':
			case 'debuff':
				// Apply status effects (simplified for now)
				const statusTarget = ability.targetType === 'self' ? enemy :
					(target || enemy);

				if (ability.effect.statusEffect) {
					// Add status effect to target
					actions.push({
						type: CombatActionType.SPECIAL_ABILITY,
						actor: enemy.id,
						target: statusTarget.id,
						description: `${enemy.name} uses ${ability.name}! ${ability.effect.description}`
					});
				}
				break;

			default:
				actions.push({
					type: CombatActionType.SPECIAL_ABILITY,
					actor: enemy.id,
					description: `${enemy.name} uses ${ability.name}! ${ability.effect.description}`
				});
		}

		return actions;
	}

	private executeEnemyDefend(enemy: CombatParticipant): CombatAction[] {
		this.applyDefendingStance(enemy);
		return [{
			type: CombatActionType.DEFEND,
			actor: enemy.id,
			description: `${enemy.name} takes a defensive stance.`
		}];
	}

	private executeEnemyFlee(enemy: CombatParticipant, _combatState: CombatState): CombatAction[] {
		// Remove enemy from combat
		enemy.isActive = false;
		return [{
			type: CombatActionType.FLEE,
			actor: enemy.id,
			description: `${enemy.name} flees from combat!`
		}];
	}
}