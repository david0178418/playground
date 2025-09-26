import type { CombatState, CombatParticipant, CombatActionType } from '../models/Combat';
import type { Enemy } from '../models/Enemy';
import type {
	EnemyAbility,
	AIProfile,
	AbilityCondition
} from '../models/EnemyAbility';
import { AIBehaviorType, ConditionType } from '../models/EnemyAbility';
import { CombatActionType as ActionType } from '../models/Combat';
import { RandomGenerator } from '../utils/RandomGenerator';
import { isValidEnemyParticipant, isValidCharacterParticipant } from '../utils/guards';

export interface TacticalSituation {
	enemyHealthPercentage: number;
	playerHealthPercentage: number;
	allyCount: number;
	enemyCount: number;
	roundNumber: number;
	canUseAbilities: EnemyAbility[];
	inMeleeRange: boolean;
	playerIsWounded: boolean;
	hasAdvantage: boolean;
}

export interface AIDecision {
	action: CombatActionType;
	targetId?: string;
	abilityId?: string;
	reasoning: string;
	priority: number;
}

export class AIBehaviorSystem {
	private rng: RandomGenerator;

	constructor(seed?: string) {
		this.rng = new RandomGenerator(seed);
	}

	selectEnemyAction(
		enemy: CombatParticipant,
		combatState: CombatState,
		abilities: EnemyAbility[] = []
	): AIDecision {
		if (!enemy.enemy) {
			return {
				action: ActionType.DEFEND,
				reasoning: "No enemy data available",
				priority: 0
			};
		}

		const situation = this.evaluateTacticalSituation(enemy, combatState);
		const aiProfile = this.getAIProfile(enemy.enemy);

		// Get all possible actions with priorities
		const possibleActions = this.generatePossibleActions(
			enemy,
			combatState,
			abilities,
			situation,
			aiProfile
		);

		// Select action based on AI profile and situation
		return this.selectOptimalAction(possibleActions, aiProfile);
	}

	private evaluateTacticalSituation(
		enemy: CombatParticipant,
		combatState: CombatState
	): TacticalSituation {
		const player = combatState.participants.find(p => p.type === 'player');
		const allies = combatState.participants.filter(
			p => p.type === 'enemy' && p.isActive && p.id !== enemy.id
		);

		const enemyHealth = isValidEnemyParticipant(enemy) ?
			enemy.enemy.hp.current / enemy.enemy.hp.max : 0;
		const playerHealth = isValidCharacterParticipant(player) ?
			player.character.hp.current / player.character.hp.max : 0;

		return {
			enemyHealthPercentage: enemyHealth,
			playerHealthPercentage: playerHealth,
			allyCount: allies.length,
			enemyCount: 1, // This enemy
			roundNumber: combatState.round,
			canUseAbilities: [], // Will be filled by ability system
			inMeleeRange: true, // Simplified for now
			playerIsWounded: playerHealth < 0.5,
			hasAdvantage: allies.length > 0
		};
	}

	private getAIProfile(enemy: Enemy): AIProfile {
		// Default AI profiles based on enemy type
		const profiles: Record<string, AIProfile> = {
			goblin: {
				behaviorType: AIBehaviorType.COWARDLY,
				aggressiveness: 0.6,
				selfPreservation: 0.8,
				tacticalAwareness: 0.4,
				abilityUsage: 0.3,
				groupCoordination: 0.7,
				environmentalAwareness: 0.3
			},
			orc: {
				behaviorType: AIBehaviorType.BERSERKER,
				aggressiveness: 0.9,
				selfPreservation: 0.2,
				tacticalAwareness: 0.3,
				abilityUsage: 0.4,
				groupCoordination: 0.4,
				environmentalAwareness: 0.2
			},
			skeleton: {
				behaviorType: AIBehaviorType.TACTICAL,
				aggressiveness: 0.7,
				selfPreservation: 0.1, // Undead don't fear death
				tacticalAwareness: 0.8,
				abilityUsage: 0.5,
				groupCoordination: 0.9,
				environmentalAwareness: 0.6
			},
			spider: {
				behaviorType: AIBehaviorType.PACK_HUNTER,
				aggressiveness: 0.6,
				selfPreservation: 0.6,
				tacticalAwareness: 0.7,
				abilityUsage: 0.8,
				groupCoordination: 0.5,
				environmentalAwareness: 0.8
			},
			dragon: {
				behaviorType: AIBehaviorType.BOSS,
				aggressiveness: 0.8,
				selfPreservation: 0.7,
				tacticalAwareness: 0.9,
				abilityUsage: 0.9,
				groupCoordination: 0.3, // Arrogant, doesn't need help
				environmentalAwareness: 0.9
			}
		};

		const enemyType = enemy.type.toLowerCase();
		return profiles[enemyType] || profiles['goblin']!; // Default fallback
	}

	private generatePossibleActions(
		_enemy: CombatParticipant,
		combatState: CombatState,
		abilities: EnemyAbility[],
		situation: TacticalSituation,
		aiProfile: AIProfile
	): AIDecision[] {
		const actions: AIDecision[] = [];
		const player = combatState.participants.find(p => p.type === 'player');

		// Basic attack action
		if (player?.isActive) {
			actions.push({
				action: ActionType.ATTACK,
				targetId: player.id,
				reasoning: "Direct attack on player",
				priority: aiProfile.aggressiveness * 100
			});
		}

		// Defensive action when hurt
		if (situation.enemyHealthPercentage < 0.5) {
			actions.push({
				action: ActionType.DEFEND,
				reasoning: "Low health, taking defensive stance",
				priority: aiProfile.selfPreservation * 80
			});
		}

		// Special ability usage
		for (const ability of abilities) {
			if (this.canUseAbility(ability, situation, combatState.round)) {
				const priority = this.calculateAbilityPriority(ability, situation, aiProfile);
				actions.push({
					action: ActionType.CAST_SPELL, // We'll use this for special abilities
					abilityId: ability.id,
					targetId: this.selectAbilityTarget(ability, combatState),
					reasoning: `Use special ability: ${ability.name}`,
					priority
				});
			}
		}

		// Flee action for cowardly enemies when hurt
		if (aiProfile.behaviorType === AIBehaviorType.COWARDLY &&
			situation.enemyHealthPercentage < 0.3) {
			actions.push({
				action: ActionType.FLEE,
				reasoning: "Cowardly retreat due to low health",
				priority: aiProfile.selfPreservation * 90
			});
		}

		return actions;
	}

	private canUseAbility(
		ability: EnemyAbility,
		situation: TacticalSituation,
		currentRound: number
	): boolean {
		// Check cooldown
		if (ability.lastUsedRound &&
			currentRound - ability.lastUsedRound < ability.cooldown) {
			return false;
		}

		// Check conditions
		if (ability.conditions) {
			for (const condition of ability.conditions) {
				if (!this.evaluateCondition(condition, situation)) {
					return false;
				}
			}
		}

		return true;
	}

	private evaluateCondition(
		condition: AbilityCondition,
		situation: TacticalSituation
	): boolean {
		let actualValue: number;

		switch (condition.type) {
			case ConditionType.HEALTH_PERCENTAGE:
				actualValue = situation.enemyHealthPercentage * 100;
				break;
			case ConditionType.ALLY_COUNT:
				actualValue = situation.allyCount;
				break;
			case ConditionType.ENEMY_COUNT:
				actualValue = situation.enemyCount;
				break;
			case ConditionType.ROUND_NUMBER:
				actualValue = situation.roundNumber;
				break;
			default:
				return true;
		}

		const targetValue = typeof condition.value === 'number' ?
			condition.value : parseFloat(condition.value);

		switch (condition.comparison) {
			case 'less_than':
				return actualValue < targetValue;
			case 'greater_than':
				return actualValue > targetValue;
			case 'equals':
				return actualValue === targetValue;
			case 'not_equals':
				return actualValue !== targetValue;
			default:
				return true;
		}
	}

	private calculateAbilityPriority(
		ability: EnemyAbility,
		situation: TacticalSituation,
		aiProfile: AIProfile
	): number {
		let priority = ability.priority;

		// Modify priority based on situation
		if (situation.enemyHealthPercentage < 0.3 && ability.effect.healing) {
			priority += 50; // Prioritize healing when low on health
		}

		if (situation.playerIsWounded && ability.effect.damage) {
			priority += 30; // Prioritize damage when player is hurt
		}

		// Modify based on AI profile
		priority *= aiProfile.abilityUsage;

		// Add some randomness
		priority += this.rng.nextInt(-10, 10);

		return priority;
	}

	private selectAbilityTarget(
		ability: EnemyAbility,
		combatState: CombatState
	): string | undefined {
		switch (ability.targetType) {
			case 'enemy':
				const player = combatState.participants.find(p => p.type === 'player');
				return player?.id;
			case 'self':
				return undefined; // Self-targeting
			case 'ally':
				const allies = combatState.participants.filter(
					p => p.type === 'enemy' && p.isActive
				);
				return allies.length > 0 ? this.rng.choose(allies).id : undefined;
			default:
				return undefined;
		}
	}

	private selectOptimalAction(
		actions: AIDecision[],
		aiProfile: AIProfile
	): AIDecision {
		if (actions.length === 0) {
			return {
				action: ActionType.DEFEND,
				reasoning: "No valid actions available",
				priority: 0
			};
		}

		// Sort by priority (highest first)
		actions.sort((a, b) => b.priority - a.priority);

		// Add behavioral modifications
		const topActions = actions.slice(0, Math.min(3, actions.length));

		// For berserker behavior, always prefer attacks
		if (aiProfile.behaviorType === AIBehaviorType.BERSERKER) {
			const attackAction = topActions.find(a => a.action === ActionType.ATTACK);
			if (attackAction) return attackAction;
		}

		// For tactical behavior, prefer abilities when available
		if (aiProfile.behaviorType === AIBehaviorType.TACTICAL &&
			aiProfile.tacticalAwareness > 0.7) {
			const abilityAction = topActions.find(a => a.abilityId);
			if (abilityAction && this.rng.chance(0.7)) return abilityAction;
		}

		// Default: return highest priority action
		return topActions[0] || {
			action: ActionType.DEFEND,
			reasoning: "No valid actions available",
			priority: 0
		};
	}

	// Utility method for group coordination
	coordinateGroupActions(
		enemies: CombatParticipant[],
		combatState: CombatState
	): Map<string, AIDecision> {
		const decisions = new Map<string, AIDecision>();

		// Simple group coordination: focus fire when multiple enemies
		if (enemies.length > 1) {
			const player = combatState.participants.find(p => p.type === 'player');
			if (player) {
				let shouldFocusFire = true;

				for (const enemy of enemies) {
					if (enemy.enemy) {
						const aiProfile = this.getAIProfile(enemy.enemy);
						if (aiProfile.groupCoordination > 0.6 && shouldFocusFire) {
							decisions.set(enemy.id, {
								action: ActionType.ATTACK,
								targetId: player.id,
								reasoning: "Group focus fire coordination",
								priority: 100
							});
						}
					}
				}
			}
		}

		return decisions;
	}
}