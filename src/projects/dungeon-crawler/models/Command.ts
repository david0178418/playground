import type { Direction } from './Room';

export interface Command {
	action: ActionType;
	target?: string;
	direction?: Direction;
	item?: string;
}

export enum ActionType {
	// Movement
	MOVE = "move",
	LOOK = "look",
	SEARCH = "search",

	// Inventory
	GET = "get",
	DROP = "drop",
	INVENTORY = "inventory",
	EQUIP = "equip",
	UNEQUIP = "unequip",
	USE = "use",

	// Combat
	ATTACK = "attack",
	DEFEND = "defend",
	FLEE = "flee",

	// Interaction
	EXAMINE = "examine",
	OPEN = "open",
	CLOSE = "close",

	// Meta
	SAVE = "save",
	LOAD = "load",
	HELP = "help",
	REST = "rest"
}

// Re-export Direction from Room.ts to avoid conflicts
export { Direction } from './Room';