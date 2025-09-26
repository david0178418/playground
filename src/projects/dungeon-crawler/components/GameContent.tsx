import { Box, Grid } from '@mui/material';
import { MessageLog } from './MessageLog';
import { CommandInput } from './CommandInput';
import { CombatUI } from './CombatUI';
import type { GameState } from '../models/Room';
import type { CombatActionType } from '../models/Combat';

interface GameContentProps {
	gameState: GameState;
	onCommand: (command: string) => void;
	onCombatAction?: (action: CombatActionType, targetId?: string) => void;
}

export function GameContent({ gameState, onCommand, onCombatAction }: GameContentProps) {
	return (
		<Grid size={{ xs: 12, md: 8 }}>
			{/* Combat Interface */}
			{gameState.combatState && onCombatAction && (
				<Box sx={{ mb: 3 }}>
					<CombatUI
						combatState={gameState.combatState}
						onCombatAction={onCombatAction}
						disabled={false}
					/>
				</Box>
			)}

			{/* Message Log */}
			<Box sx={{ mb: 3 }}>
				<MessageLog messages={gameState.messageLog} />
			</Box>

			{/* Command Input */}
			<CommandInput
				onCommand={onCommand}
				disabled={!!gameState.combatState}
			/>
		</Grid>
	);
}