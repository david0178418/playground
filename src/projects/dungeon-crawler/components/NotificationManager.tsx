import { Dialog, Snackbar, Alert } from '@mui/material';
import { SpellBook } from './SpellBook';
import { SaveLoadUI } from './SaveLoadUI';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import type { GameState } from '../models/Room';
import type { GameEngine } from '../engine/GameEngine';

import type { KeyboardShortcut } from './KeyboardHandler';

interface NotificationManagerProps {
	gameState: GameState;
	gameEngine?: GameEngine;
	magicSystem?: any; // TODO: Import MagicSystem type

	// Dialog states
	showSpellBook: boolean;
	showSaveDialog: boolean;
	showLoadDialog: boolean;
	showShortcutsHelp: boolean;

	// Dialog handlers
	onCloseSpellBook: () => void;
	onCloseSaveDialog: () => void;
	onCloseLoadDialog: () => void;
	onCloseShortcutsHelp: () => void;

	// Actions
	onCastSpell?: (spellId: string, targetIds?: string[]) => void;
	onGameStateChange?: (newGameState: GameState) => void;

	// Shortcuts for help dialog
	shortcuts: KeyboardShortcut[];

	// Notification
	notification: { message: string; type: 'success' | 'error' } | null;
	onCloseNotification: () => void;
}

export function NotificationManager({
	gameState,
	gameEngine,
	magicSystem,
	showSpellBook,
	showSaveDialog,
	showLoadDialog,
	showShortcutsHelp,
	onCloseSpellBook,
	onCloseSaveDialog,
	onCloseLoadDialog,
	onCloseShortcutsHelp,
	onCastSpell,
	onGameStateChange,
	shortcuts,
	notification,
	onCloseNotification
}: NotificationManagerProps) {
	return (
		<>
			{/* Spell Book Dialog */}
			<Dialog
				open={showSpellBook}
				onClose={onCloseSpellBook}
				maxWidth="md"
				fullWidth
			>
				{magicSystem && (
					<SpellBook
						character={gameState.character}
						magicSystem={magicSystem}
						inCombat={!!gameState.combatState}
						onCastSpell={onCastSpell ? (spellId) => onCastSpell(spellId, []) : () => {}}
						onClose={onCloseSpellBook}
					/>
				)}
			</Dialog>

			{gameEngine && (
				<SaveLoadUI
					open={showSaveDialog}
					onClose={onCloseSaveDialog}
					gameEngine={gameEngine}
					currentGameState={gameState}
					mode="save"
					onSaveComplete={(_success, _message) => {
						// Handle save completion
						onCloseSaveDialog();
					}}
				/>
			)}

			{gameEngine && (
				<SaveLoadUI
					open={showLoadDialog}
					onClose={onCloseLoadDialog}
					gameEngine={gameEngine}
					currentGameState={gameState}
					mode="load"
					onLoadComplete={(loadedGameState, _message) => {
						if (loadedGameState && onGameStateChange) {
							onGameStateChange(loadedGameState);
						}
						onCloseLoadDialog();
					}}
				/>
			)}

			{/* Keyboard Shortcuts Help Dialog */}
			<KeyboardShortcutsDialog
				open={showShortcutsHelp}
				onClose={onCloseShortcutsHelp}
				shortcuts={shortcuts}
			/>

			{/* Notifications */}
			<Snackbar
				open={!!notification}
				autoHideDuration={4000}
				onClose={onCloseNotification}
				anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
			>
				<Alert
					onClose={onCloseNotification}
					severity={notification?.type || 'info'}
					variant="filled"
				>
					{notification?.message || ''}
				</Alert>
			</Snackbar>
		</>
	);
}