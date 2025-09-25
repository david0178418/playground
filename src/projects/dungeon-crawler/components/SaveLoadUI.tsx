import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Grid,
	Card,
	CardContent,
	CardActions,
	Typography,
	Box,
	IconButton,
	TextField,
	Chip,
	Alert,
	Divider
} from '@mui/material';
import {
	Save as SaveIcon,
	Restore as LoadIcon,
	Delete as DeleteIcon,
	Schedule as TimeIcon,
	Person as PersonIcon,
	LocationOn as LocationIcon,
	PlayArrow as AutoSaveIcon
} from '@mui/icons-material';
import type { SaveSlot } from '../models/SaveData';
import type { GameEngine } from '../engine/GameEngine';
import type { GameState } from '../models/Room';

interface SaveLoadUIProps {
	open: boolean;
	onClose: () => void;
	gameEngine: GameEngine;
	currentGameState?: GameState;
	mode: 'save' | 'load';
	onSaveComplete?: (success: boolean, message: string) => void;
	onLoadComplete?: (gameState: GameState | null, message: string) => void;
}

export function SaveLoadUI({
	open,
	onClose,
	gameEngine,
	currentGameState,
	mode,
	onSaveComplete,
	onLoadComplete
}: SaveLoadUIProps) {
	const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
	const [customSaveName, setCustomSaveName] = useState('');
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [messageType, setMessageType] = useState<'success' | 'error'>('success');

	// Load save slots when dialog opens
	useEffect(() => {
		if (open) {
			loadSaveSlots();
			setCustomSaveName('');
			setMessage(null);
		}
	}, [open]);

	const loadSaveSlots = () => {
		const slots = gameEngine.getSaveSlots();
		setSaveSlots(slots);
	};

	const handleSave = async (slotId: number) => {
		if (!currentGameState) return;

		setLoading(true);
		try {
			const saveName = customSaveName || `${currentGameState.character.name} - ${currentGameState.character.class}`;
			const result = await gameEngine.saveGame(currentGameState, slotId, saveName);

			if (result.result === 'success') {
				setMessage(result.message);
				setMessageType('success');
				loadSaveSlots(); // Refresh slots
				onSaveComplete?.(true, result.message);
			} else {
				setMessage(result.message);
				setMessageType('error');
				onSaveComplete?.(false, result.message);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			setMessage(errorMessage);
			setMessageType('error');
			onSaveComplete?.(false, errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const handleLoad = async (slotId: number) => {
		setLoading(true);
		try {
			const result = await gameEngine.loadGame(slotId);

			if (result.result === 'success' && result.gameState) {
				setMessage(result.message);
				setMessageType('success');
				onLoadComplete?.(result.gameState, result.message);
				onClose();
			} else {
				setMessage(result.message);
				setMessageType('error');
				onLoadComplete?.(null, result.message);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			setMessage(errorMessage);
			setMessageType('error');
			onLoadComplete?.(null, errorMessage);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (slotId: number) => {
		const success = gameEngine.deleteSave(slotId);
		if (success) {
			setMessage(`Save slot ${slotId} deleted successfully.`);
			setMessageType('success');
			loadSaveSlots(); // Refresh slots
		} else {
			setMessage(`Failed to delete save slot ${slotId}.`);
			setMessageType('error');
		}
		setShowDeleteConfirm(null);
	};

	const formatPlayTime = (milliseconds: number): string => {
		const hours = Math.floor(milliseconds / 3600000);
		const minutes = Math.floor((milliseconds % 3600000) / 60000);
		return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
	};

	const formatDate = (timestamp: number): string => {
		return new Date(timestamp).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	const renderSaveSlot = (slot: SaveSlot) => {
		const isAutoSave = slot.id === 0;

		return (
			<Grid size={{ xs: 12 }} key={slot.id}>
				<Card
					variant={slot.isEmpty ? 'outlined' : 'elevation'}
					sx={{
						position: 'relative',
						opacity: loading ? 0.6 : 1,
						transition: 'all 0.2s'
					}}
				>
					{/* Auto-save indicator */}
					{isAutoSave && (
						<Chip
							icon={<AutoSaveIcon />}
							label="Auto Save"
							size="small"
							color="secondary"
							sx={{
								position: 'absolute',
								top: 8,
								right: 8,
								zIndex: 1
							}}
						/>
					)}

					<CardContent>
						{slot.isEmpty ? (
							<Box sx={{ py: 2, textAlign: 'center' }}>
								<Typography variant="h6" color="text.secondary">
									Empty Slot {slot.id}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									No save data
								</Typography>
							</Box>
						) : (
							<Box>
								<Typography variant="h6" gutterBottom>
									{slot.metadata?.characterName || 'Unknown Character'}
								</Typography>
								<Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
									<Chip
										icon={<PersonIcon />}
										label={slot.metadata?.characterClass || 'Unknown'}
										size="small"
										variant="outlined"
									/>
									<Chip
										label={`Level ${slot.metadata?.level || 0}`}
										size="small"
										variant="outlined"
									/>
									<Chip
										icon={<LocationIcon />}
										label={`Seed: ${slot.metadata?.dungeonSeed?.substring(0, 8) || 'Unknown'}`}
										size="small"
										variant="outlined"
									/>
									<Chip
										icon={<TimeIcon />}
										label={formatPlayTime(slot.metadata?.playTime || 0)}
										size="small"
										variant="outlined"
									/>
								</Box>
								<Typography variant="body2" color="text.secondary">
									Saved: {formatDate(slot.metadata?.lastSaved || 0)}
								</Typography>
							</Box>
						)}
					</CardContent>

					<Divider />

					<CardActions sx={{ justifyContent: 'space-between' }}>
						<Box>
							{mode === 'save' && currentGameState && (
								<Button
									startIcon={<SaveIcon />}
									onClick={() => handleSave(slot.id)}
									disabled={loading}
									color="primary"
								>
									Save Here
								</Button>
							)}
							{mode === 'load' && !slot.isEmpty && (
								<Button
									startIcon={<LoadIcon />}
									onClick={() => handleLoad(slot.id)}
									disabled={loading}
									color="primary"
								>
									Load Game
								</Button>
							)}
						</Box>

						{!slot.isEmpty && (
							<IconButton
								onClick={() => setShowDeleteConfirm(slot.id)}
								disabled={loading}
								color="error"
								size="small"
							>
								<DeleteIcon />
							</IconButton>
						)}
					</CardActions>
				</Card>
			</Grid>
		);
	};

	return (
		<>
			<Dialog
				open={open}
				onClose={onClose}
				maxWidth="md"
				fullWidth
			>
				<DialogTitle>
					{mode === 'save' ? 'Save Game' : 'Load Game'}
				</DialogTitle>

				<DialogContent>
					{message && (
						<Alert
							severity={messageType}
							sx={{ mb: 2 }}
							onClose={() => setMessage(null)}
						>
							{message}
						</Alert>
					)}

					{mode === 'save' && currentGameState && (
						<Box sx={{ mb: 3 }}>
							<TextField
								fullWidth
								label="Custom Save Name (Optional)"
								value={customSaveName}
								onChange={(e) => setCustomSaveName(e.target.value)}
								placeholder={`${currentGameState.character.name} - ${currentGameState.character.class}`}
								size="small"
							/>
						</Box>
					)}

					<Grid container spacing={2}>
						{saveSlots.map(renderSaveSlot)}
					</Grid>
				</DialogContent>

				<DialogActions>
					<Button onClick={onClose} disabled={loading}>
						Cancel
					</Button>
				</DialogActions>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={showDeleteConfirm !== null}
				onClose={() => setShowDeleteConfirm(null)}
			>
				<DialogTitle>Delete Save</DialogTitle>
				<DialogContent>
					<Typography>
						Are you sure you want to delete save slot {showDeleteConfirm}?
						This action cannot be undone.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowDeleteConfirm(null)}>
						Cancel
					</Button>
					<Button
						onClick={() => showDeleteConfirm !== null && handleDelete(showDeleteConfirm)}
						color="error"
					>
						Delete
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}