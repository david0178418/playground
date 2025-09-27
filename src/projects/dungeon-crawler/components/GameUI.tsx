import { useState, useMemo, useCallback } from 'react';
import { Container, Grid } from '@mui/material';
import { GameToolbar } from './GameToolbar';
import { GameContent } from './GameContent';
import { GameSidebar } from './GameSidebar';
import { NotificationManager } from './NotificationManager';
import { ModelComparison } from './ModelComparison';
import { KeyboardHandler, createGameShortcuts } from './KeyboardHandler';
import type { GameState } from '../models/Room';
import { CombatActionType } from '../models/Combat';
import type { GameEngine } from '../engine/GameEngine';
import type { ModelId } from '../engine/LLMNarrator';

interface GameUIProps {
	gameState: GameState;
	gameEngine?: GameEngine;
	magicSystem?: any; // TODO: Import MagicSystem type
	selectedModelId?: ModelId;
	isModelLoading?: boolean;
	onCommand: (command: string) => void;
	onCombatAction?: (action: CombatActionType, targetId?: string) => void;
	onCastSpell?: (spellId: string, targetIds?: string[]) => void;
	onGameStateChange?: (newGameState: GameState) => void;
	onModelChange?: (modelId: ModelId) => void;
}

export function GameUI({ gameState, gameEngine, selectedModelId = 'tinyllama-1.1b', isModelLoading, onCommand, onCombatAction, onCastSpell, onGameStateChange, onModelChange }: GameUIProps) {
	const [showSpellBook, setShowSpellBook] = useState(false);
	const [showSaveDialog, setShowSaveDialog] = useState(false);
	const [showLoadDialog, setShowLoadDialog] = useState(false);
	const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
	const [showModelComparison, setShowModelComparison] = useState(false);
	const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

	const hasMana = useMemo(() => !!gameState.character.mana, [gameState.character.mana]);
	const canShowSpellBook = useMemo(() => hasMana && !!onCastSpell, [hasMana, onCastSpell]);

	const handleShowSpellBook = useCallback(() => setShowSpellBook(true), []);
	const handleShowSave = useCallback(() => setShowSaveDialog(true), []);
	const handleShowLoad = useCallback(() => setShowLoadDialog(true), []);
	const handleShowShortcutsHelp = useCallback(() => setShowShortcutsHelp(true), []);
	const handleShowModelComparison = useCallback(() => {
		setShowModelComparison(true);
	}, []);

	const handleCloseModelComparison = useCallback(() => {
		setShowModelComparison(false);
	}, []);

	// Create keyboard shortcuts
	const shortcuts = useMemo(() => {
		const baseShortcuts = createGameShortcuts({
			onCommand,
			onShowSpellBook: canShowSpellBook ? handleShowSpellBook : undefined,
			onShowSave: gameEngine ? handleShowSave : undefined,
			onShowLoad: gameEngine ? handleShowLoad : undefined,
			onCombatAction: gameState.combatState && onCombatAction ? onCombatAction : undefined
		});

		// Add help shortcut
		baseShortcuts.push({
			key: '?',
			action: handleShowShortcutsHelp,
			description: 'Show keyboard shortcuts help'
		});

		return baseShortcuts;
	}, [onCommand, canShowSpellBook, gameEngine, gameState.combatState, onCombatAction, handleShowSpellBook, handleShowSave, handleShowLoad, handleShowShortcutsHelp]);

	return (
		<Container maxWidth="lg" sx={{ py: 2 }}>
			{/* Keyboard Handler */}
			<KeyboardHandler shortcuts={shortcuts} />

			{/* Game Toolbar */}
			<GameToolbar
				gameEngine={gameEngine}
				hasMana={hasMana}
				selectedModelId={selectedModelId}
				isModelLoading={isModelLoading}
				onModelChange={onModelChange}
				onShowSpellBook={canShowSpellBook ? handleShowSpellBook : undefined}
				onShowSave={gameEngine ? handleShowSave : undefined}
				onShowLoad={gameEngine ? handleShowLoad : undefined}
				onShowShortcutsHelp={handleShowShortcutsHelp}
				onShowModelComparison={handleShowModelComparison}
			/>

			{/* Main Game Layout */}
			<Grid container spacing={3}>
				<GameContent
					gameState={gameState}
					onCommand={onCommand}
					onCombatAction={onCombatAction}
				/>

				<GameSidebar
					gameState={gameState}
					onCommand={onCommand}
					onCombatAction={onCombatAction}
					onShowSpellBook={canShowSpellBook ? handleShowSpellBook : undefined}
				/>
			</Grid>

			{/* Notification Manager */}
			<NotificationManager
				gameState={gameState}
				gameEngine={gameEngine}
				showSpellBook={showSpellBook}
				showSaveDialog={showSaveDialog}
				showLoadDialog={showLoadDialog}
				showShortcutsHelp={showShortcutsHelp}
				onCloseSpellBook={useCallback(() => setShowSpellBook(false), [])}
				onCloseSaveDialog={useCallback(() => setShowSaveDialog(false), [])}
				onCloseLoadDialog={useCallback(() => setShowLoadDialog(false), [])}
				onCloseShortcutsHelp={useCallback(() => setShowShortcutsHelp(false), [])}
				onCastSpell={onCastSpell}
				onGameStateChange={onGameStateChange}
				shortcuts={shortcuts}
				notification={notification}
				onCloseNotification={useCallback(() => setNotification(null), [])}
			/>

			{/* Model Comparison Dialog */}
			<ModelComparison
				open={showModelComparison}
				onClose={handleCloseModelComparison}
				currentRoom={gameState.dungeon?.rooms.get(gameState.currentRoomId)}
				gameState={gameState}
			/>
		</Container>
	);
}