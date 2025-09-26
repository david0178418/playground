import type { Item } from './Character';

export interface InteractiveElement {
	id: string;
	name: string;
	description: string;
	type: InteractiveType;
	activated: boolean;
	usesRemaining?: number; // some elements can only be used X times
	requiresItem?: string; // ID of required item
	skillRequired?: string; // skill check needed
	difficultyClass?: number;
	cooldownTurns?: number; // how many turns before it can be used again
	lastUsedTurn?: number;
	effect: InteractiveEffect;
}

export interface InteractiveEffect {
	type: EffectTargetType;
	description: string;
	doorId?: string; // for door controls
	roomModification?: RoomModification;
	characterEffect?: CharacterStatusEffect;
	spawnItems?: Item[];
	teleportDestination?: string; // room ID
	healAmount?: string; // dice notation
	damageAmount?: string; // dice notation
}

export interface RoomModification {
	type: ModificationType;
	targetId?: string;
	newState?: boolean;
	duration?: number;
}

export interface CharacterStatusEffect {
	type: StatusEffectType;
	duration: number; // in rounds
	modifier?: number;
	description: string;
}

export enum InteractiveType {
	LEVER = "lever",
	SWITCH = "switch",
	PRESSURE_PLATE = "pressure_plate",
	ALTAR = "altar",
	FOUNTAIN = "fountain",
	MIRROR = "mirror",
	BOOKSHELF = "bookshelf",
	STATUE = "statue",
	CRYSTAL = "crystal",
	TELEPORTER = "teleporter",
	GATE_CONTROL = "gate_control",
	MOVING_PLATFORM = "moving_platform"
}

export enum EffectTargetType {
	CHARACTER = "character",
	ROOM = "room",
	DOOR = "door",
	SPAWN_ITEMS = "spawn_items",
	TELEPORT = "teleport",
	ENVIRONMENTAL = "environmental"
}

export enum ModificationType {
	TOGGLE_HAZARD = "toggle_hazard",
	CHANGE_LIGHTING = "change_lighting",
	OPEN_SECRET_PASSAGE = "open_secret_passage",
	ROTATE_ROOM = "rotate_room"
}

export enum StatusEffectType {
	BLESSED = "blessed",
	CURSED = "cursed",
	ENERGIZED = "energized",
	EXHAUSTED = "exhausted",
	BLINDED = "blinded",
	SLOWED = "slowed",
	PROTECTED = "protected"
}