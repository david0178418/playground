import { Box, Button, ButtonGroup, Chip, Stack, Typography } from '@mui/material';
import {
	Visibility as LookIcon,
	Inventory as InventoryIcon,
	Hotel as RestIcon,
	DirectionsRun as FleeIcon,
	SecurityUpdate as AttackIcon,
	AutoAwesome as MagicIcon
} from '@mui/icons-material';
import type { GameState } from '../models/Room';
import { EnhancedTooltip, gameTooltips } from './EnhancedTooltip';

interface QuickActionsProps {
	gameState: GameState;
	onCommand: (command: string) => void;
	onCombatAction?: (action: any) => void;
	onShowSpellBook?: () => void;
}

export function QuickActions({ gameState, onCommand, onCombatAction, onShowSpellBook }: QuickActionsProps) {
	const inCombat = !!gameState.combatState;
	const canRest = !inCombat && gameState.character.hp.current < gameState.character.hp.max;
	const hasSpells = gameState.character.mana && onShowSpellBook;

	const quickCommands = [
		{
			icon: <LookIcon />,
			label: 'Look',
			command: 'look',
			tooltip: gameTooltips.commands.look,
			disabled: false
		},
		{
			icon: <InventoryIcon />,
			label: 'Inventory',
			command: 'inventory',
			tooltip: gameTooltips.commands.inventory,
			disabled: false
		},
		{
			icon: <RestIcon />,
			label: 'Rest',
			command: 'rest',
			tooltip: gameTooltips.commands.rest,
			disabled: !canRest
		}
	];

	const combatActions = [
		{
			icon: <AttackIcon />,
			label: 'Attack',
			action: 'attack',
			tooltip: gameTooltips.combat.attack,
			disabled: false
		},
		{
			icon: <FleeIcon />,
			label: 'Flee',
			action: 'flee',
			tooltip: gameTooltips.combat.flee,
			disabled: false
		}
	];

	return (
		<Box>
			{/* Status Display */}
			<Box sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
				<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
					Quick Status
				</Typography>

				<Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
					{/* Health Status */}
					<Chip
						size="small"
						label={`HP: ${gameState.character.hp.current}/${gameState.character.hp.max}`}
						color={
							gameState.character.hp.current / gameState.character.hp.max > 0.5 ? 'success' :
							gameState.character.hp.current / gameState.character.hp.max > 0.25 ? 'warning' : 'error'
						}
						variant="filled"
					/>

					{/* Mana Status */}
					{gameState.character.mana && (
						<Chip
							size="small"
							label={`MP: ${gameState.character.mana.current}/${gameState.character.mana.max}`}
							color="info"
							variant="outlined"
						/>
					)}

					{/* Combat Status */}
					{inCombat && (
						<Chip
							size="small"
							label={`Combat Round ${gameState.combatState!.round}`}
							color="error"
							variant="filled"
						/>
					)}

					{/* Turn Count */}
					<Chip
						size="small"
						label={`Turn ${gameState.turnCount}`}
						color="secondary"
						variant="outlined"
					/>
				</Stack>

				{/* Status Effects */}
				{gameState.character.statusEffects && gameState.character.statusEffects.length > 0 && (
					<Box sx={{ mt: 1 }}>
						<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
							Status Effects:
						</Typography>
						<Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
							{gameState.character.statusEffects.map((effect, index) => (
								<Chip
									key={index}
									size="small"
									label={`${effect.type} (${effect.duration})`}
									color="warning"
									variant="outlined"
									sx={{ fontSize: '0.65rem' }}
								/>
							))}
						</Stack>
					</Box>
				)}
			</Box>

			{/* Quick Action Buttons */}
			{inCombat ? (
				<Box>
					<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
						Combat Actions
					</Typography>
					<ButtonGroup variant="outlined" size="small" fullWidth sx={{ mb: 1 }}>
						{combatActions.map((action) => (
							<EnhancedTooltip key={action.action} {...action.tooltip}>
								<Button
									startIcon={action.icon}
									disabled={action.disabled}
									onClick={() => onCombatAction?.(action.action)}
								>
									{action.label}
								</Button>
							</EnhancedTooltip>
						))}
					</ButtonGroup>

					{hasSpells && onShowSpellBook && (
						<EnhancedTooltip {...gameTooltips.commands.cast}>
							<Button
								variant="outlined"
								startIcon={<MagicIcon />}
								onClick={onShowSpellBook}
								size="small"
								fullWidth
							>
								Cast Spell
							</Button>
						</EnhancedTooltip>
					)}
				</Box>
			) : (
				<Box>
					<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
						Quick Commands
					</Typography>
					<Stack spacing={1}>
						<ButtonGroup variant="outlined" size="small" fullWidth>
							{quickCommands.slice(0, 2).map((cmd) => (
								<EnhancedTooltip key={cmd.command} {...cmd.tooltip}>
									<Button
										startIcon={cmd.icon}
										disabled={cmd.disabled}
										onClick={() => onCommand(cmd.command)}
									>
										{cmd.label}
									</Button>
								</EnhancedTooltip>
							))}
						</ButtonGroup>

						<ButtonGroup variant="outlined" size="small" fullWidth>
							{quickCommands[2] && (
								<EnhancedTooltip {...quickCommands[2].tooltip}>
									<Button
										startIcon={quickCommands[2].icon}
										disabled={quickCommands[2].disabled}
										onClick={() => onCommand(quickCommands[2]!.command)}
									>
										{quickCommands[2].label}
									</Button>
								</EnhancedTooltip>
							)}

							{hasSpells && onShowSpellBook && (
								<EnhancedTooltip {...gameTooltips.commands.cast}>
									<Button
										startIcon={<MagicIcon />}
										onClick={onShowSpellBook}
									>
										Spells
									</Button>
								</EnhancedTooltip>
							)}
						</ButtonGroup>
					</Stack>
				</Box>
			)}
		</Box>
	);
}