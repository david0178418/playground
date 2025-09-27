import { Box, Button, Stack } from '@mui/material';
import {
	AutoAwesome as MagicIcon,
	Save as SaveIcon,
	Restore as LoadIcon,
	Help as HelpIcon
} from '@mui/icons-material';
import type { GameEngine } from '../engine/GameEngine';
import { ModelSelector } from './ModelSelector';
import type { ModelId } from '../engine/LLMNarrator';

interface GameToolbarProps {
	gameEngine?: GameEngine;
	hasMana: boolean;
	selectedModelId: ModelId;
	isModelLoading?: boolean;
	onModelChange?: (modelId: ModelId) => void;
	onShowSpellBook?: () => void;
	onShowSave?: () => void;
	onShowLoad?: () => void;
	onShowShortcutsHelp?: () => void;
	onShowModelComparison?: () => void;
}

export function GameToolbar({
	gameEngine,
	hasMana,
	selectedModelId,
	isModelLoading,
	onModelChange,
	onShowSpellBook,
	onShowSave,
	onShowLoad,
	onShowShortcutsHelp,
	onShowModelComparison
}: GameToolbarProps) {
	return (
		<Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
			<Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
				{/* Model Selector */}
				{onModelChange && (
					<ModelSelector
						selectedModelId={selectedModelId}
						onModelChange={onModelChange}
						isLoading={isModelLoading}
						onShowComparison={onShowModelComparison}
						compact
					/>
				)}

				{/* Action Buttons */}
				<Stack direction="row" spacing={2}>
				{/* Spell Book */}
				{hasMana && onShowSpellBook && (
					<Button
						variant="outlined"
						startIcon={<MagicIcon />}
						onClick={onShowSpellBook}
						size="small"
					>
						Spells
					</Button>
				)}

				{/* Save Game */}
				{gameEngine && onShowSave && (
					<Button
						variant="outlined"
						startIcon={<SaveIcon />}
						onClick={onShowSave}
						size="small"
					>
						Save
					</Button>
				)}

				{/* Load Game */}
				{gameEngine && onShowLoad && (
					<Button
						variant="outlined"
						startIcon={<LoadIcon />}
						onClick={onShowLoad}
						size="small"
					>
						Load
					</Button>
				)}

				{/* Help */}
				<Button
					variant="outlined"
					startIcon={<HelpIcon />}
					onClick={onShowShortcutsHelp}
					size="small"
				>
					Help
				</Button>
			</Stack>
		</Stack>
		</Box>
	);
}