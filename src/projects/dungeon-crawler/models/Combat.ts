import type { Character } from './Character';
import type { Enemy } from './Enemy';

export interface CombatState {
	participants: CombatParticipant[];
	turnOrder: string[]; // participant IDs
	currentTurnIndex: number;
	round: number;
	playerActions: CombatAction[];
	status: CombatStatus;
}

export interface CombatParticipant {
	id: string;
	name: string;
	type: ParticipantType;
	character?: Character;
	enemy?: Enemy;
	initiative: number;
	isActive: boolean;
	statusEffects: StatusEffect[];
}

export interface CombatAction {
	type: CombatActionType;
	actor: string;
	target?: string;
	damage?: number;
	healing?: number;
	description: string;
}

export interface StatusEffect {
	id: string;
	name: string;
	description: string;
	duration: number;
	effects: {
		statModifiers?: Record<string, number>;
		damagePerTurn?: number;
		healingPerTurn?: number;
		disableFlee?: boolean;
		damageReduction?: number;
	};
}

export interface AttackResult {
	hit: boolean;
	damage: number;
	critical: boolean;
	attackRoll: number;
	damageRoll: string;
	description: string;
}

export enum ParticipantType {
	PLAYER = "player",
	ENEMY = "enemy"
}

export enum CombatActionType {
	ATTACK = "attack",
	DEFEND = "defend",
	USE_ITEM = "use_item",
	FLEE = "flee",
	CAST_SPELL = "cast_spell"
}

export enum CombatStatus {
	ACTIVE = "active",
	VICTORY = "victory",
	DEFEAT = "defeat",
	FLED = "fled"
}

export interface CombatOptions {
	allowFlee: boolean;
	surpriseRound: boolean;
	environmentalEffects: StatusEffect[];
}