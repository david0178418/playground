import {
	Paper,
	Typography,
	Box,
	Button,
	Grid,
	Card,
	CardContent,
	CardActions,
	Chip,
	Stack,
	IconButton,
	Tooltip
} from '@mui/material';
import { Close as CloseIcon, AutoAwesome as MagicIcon } from '@mui/icons-material';
import type { Character } from '../models/Character';
import type { Spell } from '../models/Magic';
import { MagicSystem } from '../engine/MagicSystem';

interface SpellBookProps {
	character: Character;
	magicSystem: MagicSystem;
	onCastSpell: (spellId: string) => void;
	onClose: () => void;
	inCombat?: boolean;
}

export function SpellBook({ character, magicSystem, onCastSpell, onClose, inCombat = false }: SpellBookProps) {
	if (!character.mana) {
		return (
			<Paper sx={{ p: 3, textAlign: 'center' }}>
				<Typography variant="h6" color="text.secondary">
					This character cannot cast spells
				</Typography>
				<Button onClick={onClose} sx={{ mt: 2 }}>
					Close
				</Button>
			</Paper>
		);
	}

	const spellcastingInfo = magicSystem.getSpellcastingInfo(character);
	const knownSpells = spellcastingInfo.knownSpells.map(id => magicSystem.getSpell(id)).filter(Boolean) as Spell[];

	const canCastSpell = (spell: Spell): boolean => {
		const result = magicSystem.canCastSpell(character, spell.id);
		return result.canCast;
	};

	const getSpellSchoolColor = (school: string) => {
		const colors: Record<string, string> = {
			'evocation': 'error.main',
			'abjuration': 'primary.main',
			'enchantment': 'secondary.main',
			'divination': 'info.main',
			'necromancy': 'grey.700',
			'conjuration': 'success.main',
			'illusion': 'warning.main',
			'transmutation': 'purple.main'
		};
		return colors[school] || 'text.secondary';
	};

	const manaPercentage = (character.mana.current / character.mana.max) * 100;

	return (
		<Paper sx={{ p: 3, minWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
			{/* Header */}
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<MagicIcon color="primary" />
					<Typography variant="h5">Spell Book</Typography>
				</Box>
				<IconButton onClick={onClose}>
					<CloseIcon />
				</IconButton>
			</Box>

			{/* Mana Display */}
			<Box sx={{ mb: 3 }}>
				<Typography variant="body1" gutterBottom>
					Mana: {character.mana.current} / {character.mana.max}
				</Typography>
				<Box sx={{
					width: '100%',
					height: 8,
					bgcolor: 'grey.300',
					borderRadius: 1,
					overflow: 'hidden'
				}}>
					<Box sx={{
						width: `${manaPercentage}%`,
						height: '100%',
						bgcolor: 'primary.main',
						transition: 'width 0.3s ease'
					}} />
				</Box>
			</Box>

			{/* Spellcasting Info */}
			<Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
				<Typography variant="body2">
					<strong>Spellcasting Ability:</strong> {spellcastingInfo.spellcastingAbility}
					({Math.floor((character.stats[spellcastingInfo.spellcastingAbility as keyof typeof character.stats] - 10) / 2) >= 0 ? '+' : ''}{Math.floor((character.stats[spellcastingInfo.spellcastingAbility as keyof typeof character.stats] - 10) / 2)})
				</Typography>
				<Typography variant="body2">
					<strong>Spell Save DC:</strong> {spellcastingInfo.spellSaveDC}
				</Typography>
				<Typography variant="body2">
					<strong>Spell Attack Bonus:</strong> +{spellcastingInfo.spellAttackBonus}
				</Typography>
			</Box>

			{/* Spell List */}
			<Typography variant="h6" gutterBottom>
				Known Spells ({knownSpells.length})
			</Typography>

			{knownSpells.length === 0 ? (
				<Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
					No spells known. Learn spells by finding spellbooks or scrolls!
				</Typography>
			) : (
				<Grid container spacing={2}>
					{knownSpells.map((spell) => {
						const castable = canCastSpell(spell);

						return (
							<Grid size={{ xs: 12, sm: 6 }} key={spell.id}>
								<Card sx={{
									height: '100%',
									opacity: castable ? 1 : 0.6,
									transition: 'all 0.2s ease'
								}}>
									<CardContent sx={{ pb: 1 }}>
										<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
											<Typography variant="h6" component="div">
												{spell.name}
											</Typography>
											<Stack direction="row" spacing={0.5}>
												<Chip
													label={`Level ${spell.level}`}
													size="small"
													color="primary"
												/>
												<Chip
													label={`${spell.manaCost} mana`}
													size="small"
													variant="outlined"
												/>
											</Stack>
										</Box>

										<Chip
											label={spell.school}
											size="small"
											sx={{
												bgcolor: getSpellSchoolColor(spell.school),
												color: 'white',
												mb: 1
											}}
										/>

										<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
											{spell.description}
										</Typography>

										<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
											<Typography variant="caption" color="text.secondary">
												<strong>Cast Time:</strong> {spell.castingTime.replace('_', ' ')}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												• <strong>Range:</strong> {spell.range}
											</Typography>
											{spell.duration && (
												<Typography variant="caption" color="text.secondary">
													• <strong>Duration:</strong> {spell.duration > 60
														? `${Math.floor(spell.duration / 60)} min`
														: `${spell.duration} rounds`}
												</Typography>
											)}
											{spell.ritual && (
												<Chip label="Ritual" size="small" variant="outlined" color="info" />
											)}
										</Box>
									</CardContent>

									<CardActions sx={{ pt: 0 }}>
										<Tooltip title={castable ? 'Cast this spell' : 'Not enough mana'}>
											<span>
												<Button
													size="small"
													variant="contained"
													onClick={() => onCastSpell(spell.id)}
													disabled={!castable || (!inCombat && spell.castingTime !== 'ritual')}
													fullWidth
												>
													{inCombat ? 'Cast' : spell.ritual ? 'Cast (Ritual)' : 'Combat Only'}
												</Button>
											</span>
										</Tooltip>
									</CardActions>
								</Card>
							</Grid>
						);
					})}
				</Grid>
			)}

			{/* Instructions */}
			<Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
				<Typography variant="body2" color="info.contrastText">
					<strong>Tip:</strong> {inCombat
						? 'Select a spell to cast it in combat. Mana will be consumed upon casting.'
						: 'Most spells can only be cast in combat. Ritual spells can be cast anytime.'}
				</Typography>
			</Box>
		</Paper>
	);
}