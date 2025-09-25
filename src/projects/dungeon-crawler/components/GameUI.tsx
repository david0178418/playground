import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import type { GameState } from '../models/Room';
import { MessageLog } from './MessageLog';
import { CommandInput } from './CommandInput';
import { CharacterSheet } from './CharacterSheet';

interface GameUIProps {
	gameState: GameState;
	onCommand: (command: string) => void;
}

export function GameUI({ gameState, onCommand }: GameUIProps) {
	const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);

	return (
		<Container maxWidth="lg" sx={{ py: 2 }}>
			<Grid container spacing={3}>
				{/* Main game area */}
				<Grid size={{ xs: 12, md: 8 }}>
					<Box sx={{ mb: 3 }}>
						<MessageLog messages={gameState.messageLog} />
					</Box>
					<CommandInput
						onCommand={onCommand}
						disabled={!!gameState.combatState}
					/>
				</Grid>

				{/* Character sheet sidebar */}
				<Grid size={{ xs: 12, md: 4 }}>
					<Box sx={{ mb: 3 }}>
						<CharacterSheet character={gameState.character} />
					</Box>

					{/* Current room info */}
					<Paper sx={{ p: 2 }}>
						<Typography variant="h6" gutterBottom>
							Current Location
						</Typography>
						{currentRoom && (
							<Box>
								<Typography variant="body2" gutterBottom>
									Room Type: {currentRoom.roomType}
								</Typography>
								<Typography variant="body2" gutterBottom>
									Coordinates: ({currentRoom.coordinates.x}, {currentRoom.coordinates.y})
								</Typography>
								<Typography variant="body2">
									Exits: {Array.from(currentRoom.exits.keys()).join(', ') || 'None'}
								</Typography>
								{currentRoom.contents.enemies.length > 0 && (
									<Typography variant="body2" color="error.main">
										Enemies: {currentRoom.contents.enemies.map(e => e.name).join(', ')}
									</Typography>
								)}
								{currentRoom.contents.items.length > 0 && (
									<Typography variant="body2" color="success.main">
										Items: {currentRoom.contents.items.map(i => i.name).join(', ')}
									</Typography>
								)}
							</Box>
						)}
					</Paper>

					{/* Combat state */}
					{gameState.combatState && (
						<Paper sx={{ p: 2, mt: 2, bgcolor: 'error.light' }}>
							<Typography variant="h6" gutterBottom color="error.contrastText">
								Combat!
							</Typography>
							<Typography variant="body2" color="error.contrastText">
								Enemies: {gameState.combatState.enemies.map(e => `${e.name} (${e.hp.current}/${e.hp.max} HP)`).join(', ')}
							</Typography>
						</Paper>
					)}
				</Grid>
			</Grid>
		</Container>
	);
}