import type { Enemy } from './Enemy';
import type { Item } from './Character';
import type { Trap } from './RoomTraps';
import type { Puzzle } from './RoomPuzzles';
import type { EnvironmentalHazard } from './EnvironmentalHazards';
import type { InteractiveElement } from './InteractiveElements';

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

export enum LockType {
	SIMPLE = "simple",
	COMPLEX = "complex",
	MAGICAL = "magical",
	KEYCARD = "keycard"
}

export enum Direction {
	NORTH = "north",
	SOUTH = "south",
	EAST = "east",
	WEST = "west",
	NORTHEAST = "northeast",
	NORTHWEST = "northwest",
	SOUTHEAST = "southeast",
	SOUTHWEST = "southwest",
	UP = "up",
	DOWN = "down"
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