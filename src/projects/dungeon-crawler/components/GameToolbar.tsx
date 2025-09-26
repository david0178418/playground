import { Box, Button, Stack } from '@mui/material';
import {
	AutoAwesome as MagicIcon,
	Save as SaveIcon,
	Restore as LoadIcon,
	Help as HelpIcon
} from '@mui/icons-material';
import type { GameEngine } from '../engine/GameEngine';

interface GameToolbarProps {
	gameEngine?: GameEngine;
	hasMana: boolean;
	onShowSpellBook?: () => void;
	onShowSave?: () => void;
	onShowLoad?: () => void;
	onShowShortcutsHelp?: () => void;
}

export function GameToolbar({
	gameEngine,
	hasMana,
	onShowSpellBook,
	onShowSave,
	onShowLoad,
	onShowShortcutsHelp
}: GameToolbarProps) {
	return (
		<Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
			<Stack direction="row" spacing={2} justifyContent="center">
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
		</Box>
	);
}