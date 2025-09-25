import { useState } from 'react';
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

	if (showCharacterCreation) {
		return <CharacterCreation onCharacterCreated={handleCharacterCreated} />;
	}

	if (isLoading) {
		return <div>Loading game...</div>;
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
		/>
	);
}