import type { Direction } from './Room';

export interface Command {
	action: ActionType;
	target?: string;
	direction?: Direction;
	item?: string;
	spellId?: string;
	answer?: string;
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
	CAST = "cast",

	// Interaction
	EXAMINE = "examine",
	OPEN = "open",
	CLOSE = "close",
	PICK_LOCK = "pick_lock",
	DETECT_TRAPS = "detect_traps",
	DISARM_TRAP = "disarm_trap",
	SOLVE_PUZZLE = "solve_puzzle",

	// Meta
	SAVE = "save",
	LOAD = "load",
	HELP = "help",
	REST = "rest"
}

// Re-export Direction from Room.ts to avoid conflicts
export { Direction } from './Room';