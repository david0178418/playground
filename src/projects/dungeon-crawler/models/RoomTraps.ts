
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

export enum TrapType {
	POISON_DART = "poison_dart",
	PIT = "pit",
	SPIKE = "spike",
	FIRE = "fire",
	MAGIC = "magic",
	ALARM = "alarm"
}

export enum TrapEffect {
	DAMAGE = "damage",
	POISON = "poison",
	PARALYSIS = "paralysis",
	ALARM = "alarm",
	TELEPORT = "teleport"
}