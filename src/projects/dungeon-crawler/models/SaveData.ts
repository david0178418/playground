import type { GameState } from './Room';

export interface SaveMetadata {
	characterName: string;
	characterClass: string;
	level: number;
	currentRoom: string;
	playTime: number; // in milliseconds
	dungeonSeed: string; // Store dungeon seed instead of floor
	lastSaved: number; // timestamp
	saveSlot: number;
}

export interface SaveData {
	id: string;
	version: string;
	metadata: SaveMetadata;
	gameState: SerializableGameState;
	timestamp: number;
}

// Serializable version of GameState that handles Maps and complex objects
export interface SerializableGameState {
	character: any; // Character object is already serializable
	dungeon: SerializableDungeon;
	currentRoomId: string;
	combatState?: any; // CombatState object
	messageLog: any[]; // Message array
	turnCount: number;
	playTimeStart?: number; // Track session start time
}

export interface SerializableDungeon {
	id: string;
	seed: string;
	rooms: Array<[string, any]>; // Converted from Map to array of key-value pairs
	entranceRoomId: string;
}

export interface SaveSlot {
	id: number;
	isEmpty: boolean;
	saveData?: SaveData;
	metadata?: SaveMetadata;
}

export const SAVE_SYSTEM_CONFIG = {
	MAX_SAVE_SLOTS: 5,
	SAVE_VERSION: '1.0.0',
	STORAGE_KEY_PREFIX: 'dungeon_crawler_save_',
	AUTO_SAVE_SLOT: 0, // Slot 0 reserved for auto-save
	COMPRESSION_ENABLED: false, // Future feature
	BACKUP_ENABLED: false // Future IndexedDB feature
} as const;

export enum SaveResult {
	SUCCESS = 'success',
	ERROR_STORAGE_FULL = 'storage_full',
	ERROR_INVALID_DATA = 'invalid_data',
	ERROR_SLOT_LOCKED = 'slot_locked',
	ERROR_UNKNOWN = 'unknown'
}

export enum LoadResult {
	SUCCESS = 'success',
	ERROR_NOT_FOUND = 'not_found',
	ERROR_CORRUPTED = 'corrupted',
	ERROR_VERSION_MISMATCH = 'version_mismatch',
	ERROR_UNKNOWN = 'unknown'
}

export interface SaveOperation {
	result: SaveResult;
	message: string;
	saveData?: SaveData;
}

export interface LoadOperation {
	result: LoadResult;
	message: string;
	gameState?: GameState;
	saveData?: SaveData;
}