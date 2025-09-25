import type { Enemy } from './Enemy';
import type { Item, Character } from './Character';

export interface Room {
	id: string;
	coordinates: { x: number; y: number };
	exits: Map<Direction, string>; // Direction -> RoomId
	roomType: RoomType;
	description: BaseDescription;
	contents: RoomContents;
	visited: boolean;
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