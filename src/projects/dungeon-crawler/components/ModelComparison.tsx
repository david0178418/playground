import { useState, useCallback } from 'react';
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Box,
	Typography,
	Paper,
	Grid,
	CircularProgress,
	Chip,
	Rating,
	Stack,
	Alert
} from '@mui/material';
import {
	Refresh as RefreshIcon,
	Timer as TimerIcon,
	Speed as SpeedIcon,
	HighQuality as QualityIcon
} from '@mui/icons-material';
import { LLMNarrator, AVAILABLE_MODELS, type ModelId, type ModelConfig } from '../engine/LLMNarrator';
import type { Room, GameState } from '../models/Room';

interface ModelComparisonProps {
	open: boolean;
	onClose: () => void;
	currentRoom?: Room;
	gameState?: GameState;
}

interface ComparisonResult {
	modelId: ModelId;
	model: ModelConfig;
	description: string;
	generationTime: number;
	userRating?: number;
	error?: string;
}

export function ModelComparison({ open, onClose, currentRoom, gameState }: ModelComparisonProps) {
	const [results, setResults] = useState<ComparisonResult[]>([]);
	const [isGenerating, setIsGenerating] = useState(false);
	const [selectedWinner, setSelectedWinner] = useState<ModelId | null>(null);

	const handleGenerateComparison = useCallback(async () => {
		if (!currentRoom || !gameState) {
			console.error('No room or game state available for comparison');
			return;
		}

		setIsGenerating(true);
		setResults([]);
		setSelectedWinner(null);

		const newResults: ComparisonResult[] = [];

		for (const model of AVAILABLE_MODELS) {
			const narrator = new LLMNarrator();
			const startTime = performance.now();

			try {
				const description = await narrator.describeRoom(currentRoom, gameState, model.id);
				const endTime = performance.now();
				const generationTime = Math.round(endTime - startTime);

				newResults.push({
					modelId: model.id,
					model,
					description,
					generationTime
				});
			} catch (error) {
				const endTime = performance.now();
				const generationTime = Math.round(endTime - startTime);

				newResults.push({
					modelId: model.id,
					model,
					description: '',
					generationTime,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		}

		setResults(newResults);
		setIsGenerating(false);
	}, [currentRoom, gameState]);

	const handleRateModel = useCallback((modelId: ModelId, rating: number) => {
		setResults(prev => prev.map(result =>
			result.modelId === modelId
				? { ...result, userRating: rating }
				: result
		));
	}, []);

	const handleSelectWinner = useCallback((modelId: ModelId) => {
		setSelectedWinner(modelId);
	}, []);

	const getPerformanceIcon = (level: ModelConfig['performanceLevel']) => {
		switch (level) {
			case 'fast': return <SpeedIcon fontSize="small" />;
			case 'quality': return <QualityIcon fontSize="small" />;
			default: return <SpeedIcon fontSize="small" />;
		}
	};

	const getPerformanceColor = (level: ModelConfig['performanceLevel']): 'primary' | 'secondary' => {
		switch (level) {
			case 'fast': return 'primary';
			case 'quality': return 'secondary';
			default: return 'primary';
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
			<DialogTitle>
				Model Comparison
			</DialogTitle>
			<DialogContent>
				<Stack spacing={3}>
					{!currentRoom || !gameState ? (
						<Alert severity="warning">
							Enter a game room first to compare model descriptions
						</Alert>
					) : (
						<>
							<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<Typography variant="body1">
									Compare how different models describe the same room
								</Typography>
								<Button
									variant="contained"
									startIcon={isGenerating ? <CircularProgress size={16} /> : <RefreshIcon />}
									onClick={handleGenerateComparison}
									disabled={isGenerating}
								>
									{isGenerating ? 'Generating...' : 'Generate Comparison'}
								</Button>
							</Box>

							{results.length > 0 && (
								<Grid container spacing={3}>
									{results.map((result) => (
										<Grid size={{ xs: 12, md: 6 }} key={result.modelId}>
											<Paper
												sx={{
													p: 3,
													height: '100%',
													border: selectedWinner === result.modelId ? 2 : 1,
													borderColor: selectedWinner === result.modelId ? 'primary.main' : 'divider',
													cursor: 'pointer'
												}}
												onClick={() => handleSelectWinner(result.modelId)}
											>
												<Stack spacing={2}>
													{/* Model Header */}
													<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
														{getPerformanceIcon(result.model.performanceLevel)}
														<Typography variant="h6">{result.model.name}</Typography>
														<Chip
															label={result.model.parameters}
															size="small"
															color={getPerformanceColor(result.model.performanceLevel)}
														/>
														{selectedWinner === result.modelId && (
															<Chip label="Winner" color="success" size="small" />
														)}
													</Box>

													{/* Generation Time */}
													<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
														<TimerIcon fontSize="small" color="action" />
														<Typography variant="caption">
															{result.generationTime}ms generation time
														</Typography>
													</Box>

													{/* Description or Error */}
													{result.error ? (
														<Alert severity="error">
															{result.error}
														</Alert>
													) : (
														<Typography
															variant="body2"
															sx={{
																minHeight: 100,
																p: 2,
																bgcolor: 'background.default',
																borderRadius: 1,
																fontStyle: 'italic'
															}}
														>
															"{result.description}"
														</Typography>
													)}

													{/* User Rating */}
													{!result.error && (
														<Box>
															<Typography variant="caption" display="block" gutterBottom>
																Rate this description:
															</Typography>
															<Rating
																value={result.userRating || 0}
																onChange={(_, value) => value && handleRateModel(result.modelId, value)}
																size="small"
															/>
														</Box>
													)}
												</Stack>
											</Paper>
										</Grid>
									))}
								</Grid>
							)}
						</>
					)}
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}