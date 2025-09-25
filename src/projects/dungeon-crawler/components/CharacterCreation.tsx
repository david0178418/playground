import { useState } from 'react';
import {
	Paper,
	Typography,
	Box,
	Button,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Grid,
	Chip,
	Divider
} from '@mui/material';
import type { Character, StatBlock } from '../models/Character';
import { CharacterClass } from '../models/Character';

interface CharacterCreationProps {
	onCharacterCreated: (character: Character) => void;
}

interface ClassInfo {
	name: CharacterClass;
	description: string;
	primaryStat: string;
	startingStats: StatBlock;
	hitDie: number;
	features: string[];
}

const CLASS_INFO: Record<CharacterClass, ClassInfo> = {
	[CharacterClass.FIGHTER]: {
		name: CharacterClass.FIGHTER,
		description: "Masters of martial combat, fighters excel with weapons and armor.",
		primaryStat: "Strength",
		startingStats: { strength: 16, dexterity: 13, constitution: 15, intelligence: 10, wisdom: 12, charisma: 8 },
		hitDie: 10,
		features: ["Weapon Mastery", "Heavy Armor Proficiency", "+2 HP per level"]
	},
	[CharacterClass.WIZARD]: {
		name: CharacterClass.WIZARD,
		description: "Arcane spellcasters who wield magic through study and preparation.",
		primaryStat: "Intelligence",
		startingStats: { strength: 8, dexterity: 14, constitution: 12, intelligence: 16, wisdom: 13, charisma: 10 },
		hitDie: 6,
		features: ["Spellcasting", "Arcane Recovery", "Spell Learning from Books"]
	},
	[CharacterClass.ROGUE]: {
		name: CharacterClass.ROGUE,
		description: "Stealthy specialists who strike from shadows and avoid danger.",
		primaryStat: "Dexterity",
		startingStats: { strength: 10, dexterity: 16, constitution: 13, intelligence: 12, wisdom: 14, charisma: 8 },
		hitDie: 8,
		features: ["Sneak Attack", "Stealth", "Trap Detection", "Lockpicking"]
	},
	[CharacterClass.CLERIC]: {
		name: CharacterClass.CLERIC,
		description: "Divine spellcasters who channel the power of their deity.",
		primaryStat: "Wisdom",
		startingStats: { strength: 13, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 16, charisma: 12 },
		hitDie: 8,
		features: ["Divine Spellcasting", "Turn Undead", "Healing Magic", "Medium Armor"]
	}
};

export function CharacterCreation({ onCharacterCreated }: CharacterCreationProps) {
	const [name, setName] = useState('');
	const [selectedClass, setSelectedClass] = useState<CharacterClass>(CharacterClass.FIGHTER);
	const [customStats, setCustomStats] = useState<StatBlock | null>(null);
	const [pointsRemaining, setPointsRemaining] = useState(27); // Point-buy system
	const [usePointBuy, setUsePointBuy] = useState(false);

	const currentStats = usePointBuy && customStats ? customStats : CLASS_INFO[selectedClass].startingStats;

	const createCharacter = () => {
		if (!name.trim()) {
			alert('Please enter a character name');
			return;
		}

		const classInfo = CLASS_INFO[selectedClass];
		const finalStats = currentStats;

		// Calculate HP based on class
		const conModifier = Math.floor((finalStats.constitution - 10) / 2);
		const maxHp = classInfo.hitDie + conModifier;

		const character: Character = {
			name: name.trim(),
			class: selectedClass,
			level: 1,
			stats: finalStats,
			hp: { current: maxHp, max: maxHp },
			equipment: {},
			inventory: [],
			experience: 0,
			classAbilities: []
		};

		// Initialize mana for spellcasters
		if (selectedClass === CharacterClass.WIZARD || selectedClass === CharacterClass.CLERIC) {
			const primaryStat = selectedClass === CharacterClass.WIZARD
				? finalStats.intelligence
				: finalStats.wisdom;
			const statModifier = Math.floor((primaryStat - 10) / 2);
			const maxMana = Math.max(1, 1 + statModifier);

			character.mana = {
				current: maxMana,
				max: maxMana
			};
		}

		onCharacterCreated(character);
	};

	const initializePointBuy = () => {
		// Start with base stats of 8 each
		const baseStats: StatBlock = {
			strength: 8,
			dexterity: 8,
			constitution: 8,
			intelligence: 8,
			wisdom: 8,
			charisma: 8
		};
		setCustomStats(baseStats);
		setPointsRemaining(27);
		setUsePointBuy(true);
	};

	const adjustStat = (stat: keyof StatBlock, delta: number) => {
		if (!customStats || !usePointBuy) return;

		const newValue = customStats[stat] + delta;
		if (newValue < 8 || newValue > 15) return;

		// Calculate point cost (higher stats cost more)
		const getStatCost = (value: number) => {
			if (value <= 13) return value - 8;
			return (value - 8) + (value - 13); // 14-15 cost 2 points each
		};

		const oldCost = getStatCost(customStats[stat]);
		const newCost = getStatCost(newValue);
		const costDifference = newCost - oldCost;

		if (pointsRemaining - costDifference < 0) return;

		setCustomStats({
			...customStats,
			[stat]: newValue
		});
		setPointsRemaining(pointsRemaining - costDifference);
	};

	const getStatModifier = (stat: number) => {
		const modifier = Math.floor((stat - 10) / 2);
		return modifier >= 0 ? `+${modifier}` : `${modifier}`;
	};

	return (
		<Paper sx={{ p: 4, maxWidth: 800, margin: 'auto' }}>
			<Typography variant="h4" gutterBottom textAlign="center">
				Create Your Character
			</Typography>

			{/* Character Name */}
			<Box sx={{ mb: 3 }}>
				<TextField
					fullWidth
					label="Character Name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					variant="outlined"
				/>
			</Box>

			{/* Class Selection */}
			<Box sx={{ mb: 3 }}>
				<FormControl fullWidth>
					<InputLabel>Character Class</InputLabel>
					<Select
						value={selectedClass}
						label="Character Class"
						onChange={(e) => setSelectedClass(e.target.value as CharacterClass)}
					>
						{Object.values(CharacterClass).map((cls) => (
							<MenuItem key={cls} value={cls}>
								{cls}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				{/* Class Description */}
				<Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
					<Typography variant="h6" gutterBottom>
						{CLASS_INFO[selectedClass].name}
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						{CLASS_INFO[selectedClass].description}
					</Typography>
					<Typography variant="body2" sx={{ mb: 1 }}>
						<strong>Primary Stat:</strong> {CLASS_INFO[selectedClass].primaryStat}
					</Typography>
					<Typography variant="body2" sx={{ mb: 1 }}>
						<strong>Hit Die:</strong> d{CLASS_INFO[selectedClass].hitDie}
					</Typography>
					<Box>
						<Typography variant="body2" sx={{ mb: 1 }}>
							<strong>Class Features:</strong>
						</Typography>
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
							{CLASS_INFO[selectedClass].features.map((feature) => (
								<Chip key={feature} label={feature} size="small" />
							))}
						</Box>
					</Box>
				</Paper>
			</Box>

			{/* Stat Management */}
			<Box sx={{ mb: 3 }}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
					<Typography variant="h6">Ability Scores</Typography>
					{!usePointBuy && (
						<Button variant="outlined" onClick={initializePointBuy}>
							Customize Stats
						</Button>
					)}
					{usePointBuy && (
						<Box>
							<Typography variant="body2">Points Remaining: {pointsRemaining}</Typography>
							<Button
								variant="outlined"
								size="small"
								onClick={() => { setUsePointBuy(false); setCustomStats(null); }}
								sx={{ ml: 1 }}
							>
								Use Class Defaults
							</Button>
						</Box>
					)}
				</Box>

				<Grid container spacing={2}>
					{(Object.keys(currentStats) as Array<keyof StatBlock>).map((stat) => (
						<Grid size={4} key={stat}>
							<Paper sx={{ p: 2, textAlign: 'center' }}>
								<Typography variant="body2" sx={{ textTransform: 'uppercase', mb: 1 }}>
									{stat.slice(0, 3)}
								</Typography>
								<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
									{usePointBuy && (
										<Button
											size="small"
											onClick={() => adjustStat(stat, -1)}
											disabled={currentStats[stat] <= 8}
										>
											-
										</Button>
									)}
									<Typography variant="h5">{currentStats[stat]}</Typography>
									{usePointBuy && (
										<Button
											size="small"
											onClick={() => adjustStat(stat, 1)}
											disabled={currentStats[stat] >= 15 || pointsRemaining <= 0}
										>
											+
										</Button>
									)}
								</Box>
								<Typography variant="caption" color="text.secondary">
									{getStatModifier(currentStats[stat])}
								</Typography>
							</Paper>
						</Grid>
					))}
				</Grid>
			</Box>

			<Divider sx={{ my: 3 }} />

			{/* Character Summary */}
			<Box sx={{ mb: 3 }}>
				<Typography variant="h6" gutterBottom>Character Summary</Typography>
				<Typography variant="body2">
					<strong>Name:</strong> {name || 'Unnamed Hero'}
				</Typography>
				<Typography variant="body2">
					<strong>Class:</strong> {selectedClass}
				</Typography>
				<Typography variant="body2">
					<strong>Starting HP:</strong> {CLASS_INFO[selectedClass].hitDie + Math.floor((currentStats.constitution - 10) / 2)}
				</Typography>
				<Typography variant="body2">
					<strong>Armor Class:</strong> {10 + Math.floor((currentStats.dexterity - 10) / 2)} (base)
				</Typography>
			</Box>

			{/* Create Button */}
			<Button
				variant="contained"
				size="large"
				fullWidth
				onClick={createCharacter}
				disabled={!name.trim()}
			>
				Begin Your Adventure
			</Button>
		</Paper>
	);
}