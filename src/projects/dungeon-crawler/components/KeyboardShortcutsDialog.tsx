import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Box,
	Grid,
	Chip,
	Divider,
	IconButton
} from '@mui/material';
import {
	Close as CloseIcon,
	Keyboard as KeyboardIcon
} from '@mui/icons-material';
import type { KeyboardShortcut } from './KeyboardHandler';
import { formatShortcut } from './KeyboardHandler';

interface KeyboardShortcutsDialogProps {
	open: boolean;
	onClose: () => void;
	shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsDialog({ open, onClose, shortcuts }: KeyboardShortcutsDialogProps) {
	// Group shortcuts by category
	const movementShortcuts = shortcuts.filter(s =>
		s.description.toLowerCase().includes('move') ||
		['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(s.key)
	);

	const actionShortcuts = shortcuts.filter(s =>
		!movementShortcuts.includes(s) &&
		!s.ctrl &&
		!s.description.toLowerCase().includes('combat') &&
		!s.description.toLowerCase().includes('save') &&
		!s.description.toLowerCase().includes('load')
	);

	const combatShortcuts = shortcuts.filter(s =>
		s.description.toLowerCase().includes('combat') ||
		s.description.toLowerCase().includes('attack') ||
		s.description.toLowerCase().includes('flee')
	);

	const uiShortcuts = shortcuts.filter(s =>
		s.ctrl ||
		s.description.toLowerCase().includes('save') ||
		s.description.toLowerCase().includes('load') ||
		s.description.toLowerCase().includes('spell') ||
		s.description.toLowerCase().includes('dialog')
	);

	const renderShortcutGroup = (title: string, groupShortcuts: KeyboardShortcut[]) => {
		if (groupShortcuts.length === 0) return null;

		return (
			<Box sx={{ mb: 3 }}>
				<Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<KeyboardIcon fontSize="small" />
					{title}
				</Typography>
				<Grid container spacing={1}>
					{groupShortcuts.map((shortcut, index) => (
						<Grid size={{ xs: 12 }} key={index}>
							<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
								<Typography variant="body2">
									{shortcut.description}
								</Typography>
								<Chip
									label={formatShortcut(shortcut)}
									size="small"
									variant="outlined"
									sx={{
										fontFamily: 'monospace',
										fontSize: '0.75rem',
										minWidth: 'auto'
									}}
								/>
							</Box>
						</Grid>
					))}
				</Grid>
			</Box>
		);
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				Keyboard Shortcuts
				<IconButton onClick={onClose} size="small">
					<CloseIcon />
				</IconButton>
			</DialogTitle>

			<DialogContent>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
					Use these keyboard shortcuts to play more efficiently. Shortcuts don't work while typing in text fields.
				</Typography>

				{renderShortcutGroup('Movement', movementShortcuts)}
				{movementShortcuts.length > 0 && actionShortcuts.length > 0 && <Divider sx={{ my: 2 }} />}

				{renderShortcutGroup('Actions', actionShortcuts)}
				{actionShortcuts.length > 0 && combatShortcuts.length > 0 && <Divider sx={{ my: 2 }} />}

				{renderShortcutGroup('Combat', combatShortcuts)}
				{combatShortcuts.length > 0 && uiShortcuts.length > 0 && <Divider sx={{ my: 2 }} />}

				{renderShortcutGroup('Interface', uiShortcuts)}

				<Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
					<Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
						<KeyboardIcon fontSize="small" />
						<strong>Tip:</strong> Press <Chip label="?" size="small" sx={{ mx: 0.5 }} /> at any time to see this help dialog
					</Typography>
				</Box>
			</DialogContent>

			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}