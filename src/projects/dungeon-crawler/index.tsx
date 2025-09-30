import { useState, useEffect } from 'react';
import { GameUI } from './components/GameUI';
import { CharacterCreation } from './components/CharacterCreation';
import { GameEngine } from './engine/GameEngine';
import type { GameState } from './models/Room';
import type { Character } from './models/Character';
import { CombatActionType } from './models/Combat';

export default function DungeonCrawler() {
	const [gameEngine] = useState(() => new GameEngine());
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [showCharacterCreation, setShowCharacterCreation] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [hasCheckedForSaves, setHasCheckedForSaves] = useState(false);

	// Check for existing saves on component mount
	useEffect(() => {
		const checkForExistingSaves = async () => {
			try {
				setIsLoading(true);
				const mostRecentSave = gameEngine.getMostRecentSave();

				if (mostRecentSave) {
					// Auto-load the most recent save
					const loadResult = await gameEngine.loadMostRecentSave();
					if (loadResult.result === 'success' && loadResult.gameState) {
						setGameState(loadResult.gameState);
						setShowCharacterCreation(false);
					} else {
						// If loading failed, show character creation
						console.warn('Failed to load most recent save:', loadResult.message);
						setShowCharacterCreation(true);
					}
				} else {
					// No saves found, show character creation
					setShowCharacterCreation(true);
				}
			} catch (error) {
				console.error('Error checking for existing saves:', error);
				setShowCharacterCreation(true);
			} finally {
				setIsLoading(false);
				setHasCheckedForSaves(true);
			}
		};

		if (!hasCheckedForSaves) {
			checkForExistingSaves();
		}
	}, [gameEngine, hasCheckedForSaves]);

	const handleCharacterCreated = async (character: Character) => {
		setIsLoading(true);
		setShowCharacterCreation(false);

		try {
			const initialState = await gameEngine.startNewGame(character);
			setGameState(initialState);
		} catch (error) {
			console.error('Failed to initialize game:', error);
		} finally {
			setIsLoading(false);
		}
	};

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

	const handleCastSpell = async (spellId: string, targetIds?: string[]) => {
		if (!gameState) return;

		try {
			const newState = await gameEngine.castSpell(spellId, gameState, targetIds);
			setGameState(newState);
		} catch (error) {
			console.error('Failed to cast spell:', error);
		}
	};

	// Show loading while checking for saves or loading game
	if (!hasCheckedForSaves || isLoading) {
		return <div>Loading game...</div>;
	}

	if (showCharacterCreation) {
		return <CharacterCreation onCharacterCreated={handleCharacterCreated} />;
	}

	if (!gameState) {
		return <div>Failed to load game</div>;
	}

	return (
		<GameUI
			gameState={gameState}
			gameEngine={gameEngine}
			onCommand={handleCommand}
			onCombatAction={handleCombatAction}
			onCastSpell={handleCastSpell}
			onGameStateChange={setGameState}
		/>
	);
}