import type { Character } from './Character';
import type { Dungeon } from './RoomCore';

export interface GameState {
	character: Character;
	dungeon: Dungeon;
	currentRoomId: string;
	combatState?: import('./Combat').CombatState;
	messageLog: Message[];
	turnCount: number;
}

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