import { Box, Grid } from '@mui/material';
import { CharacterSheet } from './CharacterSheet';
import { QuickActions } from './QuickActions';
import { Minimap } from './Minimap';
import type { GameState } from '../models/Room';
import type { CombatActionType } from '../models/Combat';

interface GameSidebarProps {
	gameState: GameState;
	onCommand: (command: string) => void;
	onCombatAction?: (action: CombatActionType, targetId?: string) => void;
	onShowSpellBook?: () => void;
}

export function GameSidebar({ gameState, onCommand, onCombatAction, onShowSpellBook }: GameSidebarProps) {
	return (
		<Grid size={{ xs: 12, md: 4 }}>
			{/* Character Sheet */}
			<Box sx={{ mb: 3 }}>
				<CharacterSheet character={gameState.character} />
			</Box>

			{/* Quick Actions */}
			<Box sx={{ mb: 3 }}>
				<QuickActions
					gameState={gameState}
					onCommand={onCommand}
					onCombatAction={onCombatAction}
					onShowSpellBook={onShowSpellBook}
				/>
			</Box>

			{/* Minimap */}
			<Box sx={{ mb: 3 }}>
				<Minimap gameState={gameState} />
			</Box>
		</Grid>
	);
}