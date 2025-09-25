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