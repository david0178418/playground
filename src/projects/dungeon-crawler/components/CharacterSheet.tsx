import { Paper, Typography, Box, Grid, LinearProgress } from '@mui/material';
import type { Character } from '../models/Character';

interface CharacterSheetProps {
	character: Character;
}

export function CharacterSheet({ character }: CharacterSheetProps) {
	const getStatModifier = (stat: number): string => {
		const modifier = Math.floor((stat - 10) / 2);
		return modifier >= 0 ? `+${modifier}` : `${modifier}`;
	};

	const hpPercentage = (character.hp.current / character.hp.max) * 100;

	const calculateAC = (): number => {
		let baseAC = 10 + Math.floor((character.stats.dexterity - 10) / 2);

		// Add armor AC bonus
		if (character.equipment.armor) {
			const acBonus = character.equipment.armor.properties.find(p => p.type === 'ac_bonus');
			if (acBonus) {
				baseAC += acBonus.value;
			}
		}

		// Add shield AC bonus
		if (character.equipment.shield) {
			const acBonus = character.equipment.shield.properties.find(p => p.type === 'ac_bonus');
			if (acBonus) {
				baseAC += acBonus.value;
			}
		}

		return baseAC;
	};

	return (
		<Paper sx={{ p: 2 }}>
			<Typography variant="h6" gutterBottom>
				{character.name} - Level {character.level} {character.class}
			</Typography>

			<Box sx={{ mb: 2 }}>
				<Typography variant="body2" gutterBottom>
					HP: {character.hp.current} / {character.hp.max}
				</Typography>
				<LinearProgress
					variant="determinate"
					value={hpPercentage}
					sx={{
						height: 8,
						backgroundColor: 'grey.300',
						'& .MuiLinearProgress-bar': {
							backgroundColor: hpPercentage > 50 ? 'success.main' :
								hpPercentage > 25 ? 'warning.main' : 'error.main'
						}
					}}
				/>
			</Box>

			<Typography variant="subtitle2" gutterBottom>
				Ability Scores
			</Typography>
			<Grid container spacing={2} sx={{ mb: 2 }}>
				<Grid size={4}>
					<Box sx={{ textAlign: 'center' }}>
						<Typography variant="body2">STR</Typography>
						<Typography variant="h6">{character.stats.strength}</Typography>
						<Typography variant="caption">{getStatModifier(character.stats.strength)}</Typography>
					</Box>
				</Grid>
				<Grid size={4}>
					<Box sx={{ textAlign: 'center' }}>
						<Typography variant="body2">DEX</Typography>
						<Typography variant="h6">{character.stats.dexterity}</Typography>
						<Typography variant="caption">{getStatModifier(character.stats.dexterity)}</Typography>
					</Box>
				</Grid>
				<Grid size={4}>
					<Box sx={{ textAlign: 'center' }}>
						<Typography variant="body2">CON</Typography>
						<Typography variant="h6">{character.stats.constitution}</Typography>
						<Typography variant="caption">{getStatModifier(character.stats.constitution)}</Typography>
					</Box>
				</Grid>
				<Grid size={4}>
					<Box sx={{ textAlign: 'center' }}>
						<Typography variant="body2">INT</Typography>
						<Typography variant="h6">{character.stats.intelligence}</Typography>
						<Typography variant="caption">{getStatModifier(character.stats.intelligence)}</Typography>
					</Box>
				</Grid>
				<Grid size={4}>
					<Box sx={{ textAlign: 'center' }}>
						<Typography variant="body2">WIS</Typography>
						<Typography variant="h6">{character.stats.wisdom}</Typography>
						<Typography variant="caption">{getStatModifier(character.stats.wisdom)}</Typography>
					</Box>
				</Grid>
				<Grid size={4}>
					<Box sx={{ textAlign: 'center' }}>
						<Typography variant="body2">CHA</Typography>
						<Typography variant="h6">{character.stats.charisma}</Typography>
						<Typography variant="caption">{getStatModifier(character.stats.charisma)}</Typography>
					</Box>
				</Grid>
			</Grid>

			<Typography variant="body2" sx={{ mb: 1 }}>
				Experience: {character.experience}
			</Typography>

			<Typography variant="body2" sx={{ mb: 2 }}>
				Armor Class: {calculateAC()}
			</Typography>

			<Typography variant="subtitle2" gutterBottom>
				Equipment
			</Typography>
			<Box sx={{ mb: 2 }}>
				<Typography variant="body2">
					Weapon: {character.equipment.weapon?.name || 'None'}
				</Typography>
				<Typography variant="body2">
					Armor: {character.equipment.armor?.name || 'None'}
				</Typography>
				<Typography variant="body2">
					Shield: {character.equipment.shield?.name || 'None'}
				</Typography>
			</Box>

			{character.inventory.length > 0 && (
				<>
					<Typography variant="subtitle2" gutterBottom>
						Inventory ({character.inventory.length} items)
					</Typography>
					<Box sx={{ maxHeight: 100, overflow: 'auto' }}>
						{character.inventory.slice(0, 5).map((item, index) => (
							<Typography key={index} variant="caption" display="block">
								• {item.name}
							</Typography>
						))}
						{character.inventory.length > 5 && (
							<Typography variant="caption" color="text.secondary">
								...and {character.inventory.length - 5} more items
							</Typography>
						)}
					</Box>
				</>
			)}
		</Paper>
	);
}