import type { Enemy } from './Enemy';
import type { Item, Character } from './Character';

export interface Room {
	id: string;
	coordinates: { x: number; y: number };
	exits: Map<Direction, string>; // Direction -> RoomId
	lockedExits?: Map<Direction, Lock>; // Locked exits
	roomType: RoomType;
	description: BaseDescription;
	contents: RoomContents;
	visited: boolean;
	traps?: Trap[];
	puzzles?: Puzzle[];
	hazards?: EnvironmentalHazard[];
	interactiveElements?: InteractiveElement[];
}

export interface RoomContents {
	enemies: Enemy[];
	items: Item[];
	features: Feature[];
	searched: boolean;
}

export interface BaseDescription {
	template: string;
	generatedDescription?: string;
}

export interface Feature {
	id: string;
	name: string;
	description: string;
	searchable: boolean;
	searched: boolean;
	hidden_items?: Item[];
}

export interface Lock {
	id: string;
	type: LockType;
	difficulty: number; // DC for lock picking or key requirement
	keyId?: string; // ID of key item required
	unlocked: boolean;
	attempts?: number; // Track failed attempts
}

export interface Trap {
	id: string;
	name: string;
	description: string;
	type: TrapType;
	detected: boolean;
	disarmed: boolean;
	triggered: boolean;
	detectionDC: number;
	disarmDC: number;
	damage?: string; // Dice notation like "2d6"
	effect?: TrapEffect;
}

export interface Puzzle {
	id: string;
	name: string;
	description: string;
	type: PuzzleType;
	solved: boolean;
	solution: string;
	attempts: number;
	maxAttempts?: number;
	reward?: Item[];
	penalty?: string;
}

export enum LockType {
	SIMPLE = "simple",
	COMPLEX = "complex",
	MAGICAL = "magical",
	KEYCARD = "keycard"
}

export enum TrapType {
	POISON_DART = "poison_dart",
	PIT = "pit",
	SPIKE = "spike",
	FIRE = "fire",
	MAGIC = "magic",
	ALARM = "alarm"
}

export enum PuzzleType {
	RIDDLE = "riddle",
	SEQUENCE = "sequence",
	SYMBOL = "symbol",
	MATH = "math",
	WORD = "word"
}

export enum TrapEffect {
	DAMAGE = "damage",
	POISON = "poison",
	PARALYSIS = "paralysis",
	ALARM = "alarm",
	TELEPORT = "teleport"
}

export interface EnvironmentalHazard {
	id: string;
	name: string;
	description: string;
	type: HazardType;
	severity: HazardSeverity;
	isPermanent: boolean;
	duration?: number; // rounds remaining for temporary hazards
	damagePerTurn?: string; // dice notation
	effectType?: EnvironmentalEffect;
	resistanceType?: string; // what can protect against it
	triggeredByMovement?: boolean;
	affectsSpellcasting?: boolean;
}

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

export enum HazardType {
	POISON_GAS = "poison_gas",
	UNSTABLE_FLOOR = "unstable_floor",
	EXTREME_COLD = "extreme_cold",
	EXTREME_HEAT = "extreme_heat",
	MAGICAL_DARKNESS = "magical_darkness",
	ARCANE_STORM = "arcane_storm",
	FLOODING = "flooding",
	THICK_FOG = "thick_fog",
	RADIATION = "radiation"
}

export enum HazardSeverity {
	MINOR = "minor",
	MODERATE = "moderate",
	SEVERE = "severe",
	EXTREME = "extreme"
}

export enum EnvironmentalEffect {
	CONTINUOUS_DAMAGE = "continuous_damage",
	REDUCED_VISIBILITY = "reduced_visibility",
	SPELL_DISRUPTION = "spell_disruption",
	MOVEMENT_PENALTY = "movement_penalty",
	EQUIPMENT_DAMAGE = "equipment_damage",
	EXHAUSTION = "exhaustion",
	SUFFOCATION = "suffocation"
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

export enum Direction {
	NORTH = "north",
	SOUTH = "south",
	EAST = "east",
	WEST = "west"
}

export enum RoomType {
	ENTRANCE = "entrance",
	CORRIDOR = "corridor",
	CHAMBER = "chamber",
	ARMORY = "armory",
	LIBRARY = "library",
	THRONE_ROOM = "throne_room",
	TREASURE_ROOM = "treasure_room",
	GENERIC = "generic"
}

export interface Dungeon {
	id: string;
	seed: string;
	rooms: Map<string, Room>;
	entranceRoomId: string;
}

export interface GameState {
	character: Character;
	dungeon: Dungeon;
	currentRoomId: string;
	combatState?: import('./Combat').CombatState;
	messageLog: Message[];
	turnCount: number;
}

// Note: CombatState is now imported from Combat.ts to avoid circular dependencies

export interface Message {
	id: string;
	text: string;
	timestamp: number;
	type: MessageType;
}

export enum MessageType {
	SYSTEM = "system",
	ACTION = "action",
	COMBAT = "combat",
	DESCRIPTION = "description",
	ERROR = "error"
}