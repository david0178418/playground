export const getStatModifier = (stat: number): number => {
	return Math.floor((stat - 10) / 2);
};

export const formatStatModifier = (stat: number): string => {
	const modifier = getStatModifier(stat);
	return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

export const calculateAC = (character: any): number => {
	let baseAC = 10 + getStatModifier(character.stats.dexterity);

	if (character.equipment.armor) {
		const acBonus = character.equipment.armor.properties.find((p: any) => p.type === 'ac_bonus');
		if (acBonus) {
			baseAC += acBonus.value;
		}
	}

	if (character.equipment.shield) {
		const acBonus = character.equipment.shield.properties.find((p: any) => p.type === 'ac_bonus');
		if (acBonus) {
			baseAC += acBonus.value;
		}
	}

	return baseAC;
};

export const getExperienceForLevel = (level: number): number => {
	return (level - 1) * 100;
};

export const getExperienceToNextLevel = (currentExperience: number, currentLevel: number): number => {
	const nextLevelRequirement = getExperienceForLevel(currentLevel + 1);
	return nextLevelRequirement - currentExperience;
};

export const getExperienceInCurrentLevel = (currentExperience: number, currentLevel: number): number => {
	const currentLevelStart = getExperienceForLevel(currentLevel);
	return currentExperience - currentLevelStart;
};