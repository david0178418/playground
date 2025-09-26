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