import { useState, useEffect } from 'react';
import { GameUI } from './components/GameUI';
import { GameEngine } from './engine/GameEngine';
import type { GameState } from './models/Room';
import { CombatActionType } from './models/Combat';

export default function DungeonCrawler() {
	const [gameEngine] = useState(() => new GameEngine());
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Initialize the game
		const initializeGame = async () => {
			try {
				const initialState = await gameEngine.startNewGame();
				setGameState(initialState);
			} catch (error) {
				console.error('Failed to initialize game:', error);
			} finally {
				setIsLoading(false);
			}
		};

		initializeGame();
	}, [gameEngine]);

	const handleCommand = async (command: string) => {
		if (!gameState) return;

		try {
			const newState = await gameEngine.processCommand(command, gameState);
			setGameState(newState);
		} catch (error) {
			console.error('Failed to process command:', error);
		}
	};

	const handleCombatAction = async (action: CombatActionType, targetId?: string) => {
		if (!gameState) return;

		try {
			const newState = await gameEngine.processCombatAction(action, gameState, targetId);
			setGameState(newState);
		} catch (error) {
			console.error('Failed to process combat action:', error);
		}
	};

	if (isLoading) {
		return <div>Loading game...</div>;
	}

	if (!gameState) {
		return <div>Failed to load game</div>;
	}

	return (
		<GameUI
			gameState={gameState}
			onCommand={handleCommand}
			onCombatAction={handleCombatAction}
		/>
	);
}