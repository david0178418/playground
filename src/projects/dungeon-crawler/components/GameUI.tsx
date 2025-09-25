import { useState } from 'react';
import { Container, Grid, Paper, Typography, Box, Button, Dialog, Snackbar, Alert } from '@mui/material';
import {
	AutoAwesome as MagicIcon,
	Save as SaveIcon,
	Restore as LoadIcon,
	Help as HelpIcon
} from '@mui/icons-material';
import type { GameState } from '../models/Room';
import { CombatActionType } from '../models/Combat';
import { MessageLog } from './MessageLog';
import { CommandInput } from './CommandInput';
import { CharacterSheet } from './CharacterSheet';
import { CombatUI } from './CombatUI';
import { SpellBook } from './SpellBook';
import { SaveLoadUI } from './SaveLoadUI';
import { Minimap } from './Minimap';
import { EnhancedTooltip, gameTooltips } from './EnhancedTooltip';
import { KeyboardHandler, createGameShortcuts } from './KeyboardHandler';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { QuickActions } from './QuickActions';

import { GameEngine } from '../engine/GameEngine';

interface GameUIProps {
	gameState: GameState;
	gameEngine?: GameEngine;
	onCommand: (command: string) => void;
	onCombatAction?: (action: CombatActionType, targetId?: string) => void;
	onCastSpell?: (spellId: string, targetIds?: string[]) => void;
	onGameStateChange?: (newGameState: GameState) => void;
}

export function GameUI({ gameState, gameEngine, onCommand, onCombatAction, onCastSpell, onGameStateChange }: GameUIProps) {
	const [showSpellBook, setShowSpellBook] = useState(false);
	const [showSaveDialog, setShowSaveDialog] = useState(false);
	const [showLoadDialog, setShowLoadDialog] = useState(false);
	const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
	const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
	const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);

	// Create keyboard shortcuts
	const shortcuts = createGameShortcuts({
		onCommand,
		onShowSpellBook: gameState.character.mana && onCastSpell ? () => setShowSpellBook(true) : undefined,
		onShowSave: gameEngine ? () => setShowSaveDialog(true) : undefined,
		onShowLoad: gameEngine ? () => setShowLoadDialog(true) : undefined,
		onCombatAction: gameState.combatState && onCombatAction ? onCombatAction : undefined
	});

	// Add help shortcut
	shortcuts.push({
		key: '?',
		action: () => setShowShortcutsHelp(true),
		description: 'Show keyboard shortcuts help'
	});

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

					{/* Quick Actions */}
					<Box sx={{ mb: 3 }}>
						<QuickActions
							gameState={gameState}
							onCommand={onCommand}
							onCombatAction={onCombatAction}
							onShowSpellBook={gameState.character.mana && onCastSpell ? () => setShowSpellBook(true) : undefined}
						/>
					</Box>

					{/* Spell Book Button */}
					{gameState.character.mana && onCastSpell && (
						<Box sx={{ mb: 2 }}>
							<EnhancedTooltip {...gameTooltips.commands.cast}>
								<Button
									fullWidth
									variant="outlined"
									startIcon={<MagicIcon />}
									onClick={() => setShowSpellBook(true)}
								>
									Spell Book
								</Button>
							</EnhancedTooltip>
						</Box>
					)}

					{/* Save/Load/Help Buttons */}
					<Box sx={{ mb: 2 }}>
						<Grid container spacing={1}>
							{gameEngine && (
								<>
									<Grid size={{ xs: 4 }}>
										<EnhancedTooltip {...gameTooltips.commands.save}>
											<span>
												<Button
													fullWidth
													variant="outlined"
													startIcon={<SaveIcon />}
													onClick={() => setShowSaveDialog(true)}
													disabled={!!gameState.combatState}
													size="small"
												>
													Save
												</Button>
											</span>
										</EnhancedTooltip>
									</Grid>
									<Grid size={{ xs: 4 }}>
										<EnhancedTooltip {...gameTooltips.commands.load}>
											<span>
												<Button
													fullWidth
													variant="outlined"
													startIcon={<LoadIcon />}
													onClick={() => setShowLoadDialog(true)}
													disabled={!!gameState.combatState}
													size="small"
												>
													Load
												</Button>
											</span>
										</EnhancedTooltip>
									</Grid>
								</>
							)}
							<Grid size={{ xs: gameEngine ? 4 : 12 }}>
								<EnhancedTooltip
									title="Keyboard Shortcuts"
									description="View available keyboard shortcuts for faster gameplay"
									shortcut="?"
									type="help"
								>
									<Button
										fullWidth
										variant="outlined"
										startIcon={<HelpIcon />}
										onClick={() => setShowShortcutsHelp(true)}
										size="small"
									>
										Help
									</Button>
								</EnhancedTooltip>
							</Grid>
						</Grid>
					</Box>

					{/* Minimap */}
					<Box sx={{ mb: 2 }}>
						<Minimap gameState={gameState} />
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
								<EnhancedTooltip {...gameTooltips.room.exits}>
									<Typography variant="body2" sx={{ cursor: 'help' }}>
										Exits: {currentRoom.exits && currentRoom.exits.keys ? Array.from(currentRoom.exits.keys()).join(', ') || 'None' : 'None'}
									</Typography>
								</EnhancedTooltip>
								{currentRoom.contents.enemies.length > 0 && (
									<EnhancedTooltip {...gameTooltips.room.enemies}>
										<Typography variant="body2" color="error.main" sx={{ cursor: 'help' }}>
											Enemies: {currentRoom.contents.enemies.map(e => e.name).join(', ')}
										</Typography>
									</EnhancedTooltip>
								)}
								{currentRoom.contents.items.length > 0 && (
									<EnhancedTooltip {...gameTooltips.room.items}>
										<Typography variant="body2" color="success.main" sx={{ cursor: 'help' }}>
											Items: {currentRoom.contents.items.map(i => i.name).join(', ')}
										</Typography>
									</EnhancedTooltip>
								)}
								{currentRoom.hazards && currentRoom.hazards.length > 0 && (
									<EnhancedTooltip {...gameTooltips.room.hazards}>
										<Typography variant="body2" color="warning.main" sx={{ cursor: 'help' }}>
											Hazards: {currentRoom.hazards.map((h: any) => h.name).join(', ')}
										</Typography>
									</EnhancedTooltip>
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

			{/* Save Dialog */}
			{gameEngine && (
				<SaveLoadUI
					open={showSaveDialog}
					onClose={() => setShowSaveDialog(false)}
					gameEngine={gameEngine}
					currentGameState={gameState}
					mode="save"
					onSaveComplete={(success, message) => {
						setNotification({ message, type: success ? 'success' : 'error' });
						if (success) {
							setShowSaveDialog(false);
						}
					}}
				/>
			)}

			{/* Load Dialog */}
			{gameEngine && (
				<SaveLoadUI
					open={showLoadDialog}
					onClose={() => setShowLoadDialog(false)}
					gameEngine={gameEngine}
					mode="load"
					onLoadComplete={(newGameState, message) => {
						setNotification({ message, type: newGameState ? 'success' : 'error' });
						if (newGameState && onGameStateChange) {
							onGameStateChange(newGameState);
							setShowLoadDialog(false);
						}
					}}
				/>
			)}

			{/* Notification Snackbar */}
			{notification && (
				<Snackbar
					open={true}
					autoHideDuration={4000}
					onClose={() => setNotification(null)}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
				>
					<Alert
						onClose={() => setNotification(null)}
						severity={notification.type}
						variant="filled"
					>
						{notification.message}
					</Alert>
				</Snackbar>
			)}

			{/* Keyboard Handler */}
			<KeyboardHandler
				shortcuts={shortcuts}
				disabled={showSpellBook || showSaveDialog || showLoadDialog || showShortcutsHelp}
			/>

			{/* Keyboard Shortcuts Help Dialog */}
			<KeyboardShortcutsDialog
				open={showShortcutsHelp}
				onClose={() => setShowShortcutsHelp(false)}
				shortcuts={shortcuts}
			/>
		</Container>
	);
}