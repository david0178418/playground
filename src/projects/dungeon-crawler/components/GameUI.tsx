import { useState } from 'react';
import { Container, Grid, Paper, Typography, Box, Button, Dialog } from '@mui/material';
import { AutoAwesome as MagicIcon } from '@mui/icons-material';
import type { GameState } from '../models/Room';
import { CombatActionType } from '../models/Combat';
import { MessageLog } from './MessageLog';
import { CommandInput } from './CommandInput';
import { CharacterSheet } from './CharacterSheet';
import { CombatUI } from './CombatUI';
import { SpellBook } from './SpellBook';

import { GameEngine } from '../engine/GameEngine';

interface GameUIProps {
	gameState: GameState;
	gameEngine?: GameEngine;
	onCommand: (command: string) => void;
	onCombatAction?: (action: CombatActionType, targetId?: string) => void;
	onCastSpell?: (spellId: string, targetIds?: string[]) => void;
}

export function GameUI({ gameState, gameEngine, onCommand, onCombatAction, onCastSpell }: GameUIProps) {
	const [showSpellBook, setShowSpellBook] = useState(false);
	const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);

	return (
		<Container maxWidth="lg" sx={{ py: 2 }}>
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

					{/* Spell Book Button */}
					{gameState.character.mana && onCastSpell && (
						<Box sx={{ mb: 2 }}>
							<Button
								fullWidth
								variant="outlined"
								startIcon={<MagicIcon />}
								onClick={() => setShowSpellBook(true)}
							>
								Spell Book
							</Button>
						</Box>
					)}

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
								Round: {gameState.combatState.round}
							</Typography>
						</Paper>
					)}
				</Grid>
			</Grid>

			{/* Spell Book Dialog */}
			{showSpellBook && gameState.character.mana && onCastSpell && (
				<Dialog
					open={showSpellBook}
					onClose={() => setShowSpellBook(false)}
					maxWidth="md"
					fullWidth
				>
					{gameEngine && (
						<SpellBook
							character={gameState.character}
							magicSystem={gameEngine.getMagicSystem()}
							onCastSpell={(spellId) => {
								onCastSpell(spellId);
								setShowSpellBook(false);
							}}
							onClose={() => setShowSpellBook(false)}
							inCombat={!!gameState.combatState}
						/>
					)}
				</Dialog>
			)}
		</Container>
	);
}