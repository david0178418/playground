import { useState, useCallback } from 'react';
import {
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Chip,
	Box,
	Typography,
	CircularProgress,
	Tooltip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Stack
} from '@mui/material';
import {
	Memory as ModelIcon,
	Speed as SpeedIcon,
	HighQuality as QualityIcon,
	Compare as CompareIcon
} from '@mui/icons-material';
import { LLMNarrator, type ModelConfig, type ModelId, AVAILABLE_MODELS } from '../engine/LLMNarrator';

interface ModelSelectorProps {
	selectedModelId: ModelId;
	onModelChange: (modelId: ModelId) => void;
	isLoading?: boolean;
	onShowComparison?: () => void;
	compact?: boolean;
}

function getPerformanceIcon(level: ModelConfig['performanceLevel']) {
	switch (level) {
		case 'fast': return <SpeedIcon fontSize="small" />;
		case 'quality': return <QualityIcon fontSize="small" />;
		case 'balanced': return <ModelIcon fontSize="small" />;
		default: return <ModelIcon fontSize="small" />;
	}
}

function getPerformanceColor(level: ModelConfig['performanceLevel']): 'primary' | 'secondary' | 'warning' {
	switch (level) {
		case 'fast': return 'primary';
		case 'quality': return 'secondary';
		case 'balanced': return 'warning';
		default: return 'primary';
	}
}

export function ModelSelector({
	selectedModelId,
	onModelChange,
	isLoading = false,
	onShowComparison,
	compact = false
}: ModelSelectorProps) {
	const [showModelInfo, setShowModelInfo] = useState(false);

	const selectedModel = LLMNarrator.getModelConfig(selectedModelId);

	const handleModelChange = useCallback((modelId: ModelId) => {
		onModelChange(modelId);
	}, [onModelChange]);

	const handleShowModelInfo = useCallback(() => {
		setShowModelInfo(true);
	}, []);

	const handleCloseModelInfo = useCallback(() => {
		setShowModelInfo(false);
	}, []);

	if (compact) {
		return (
			<>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<Tooltip title={selectedModel?.description || 'Select model'}>
						<Chip
							icon={selectedModel ? getPerformanceIcon(selectedModel.performanceLevel) : <ModelIcon />}
							label={selectedModel?.name || 'No Model'}
							color={selectedModel ? getPerformanceColor(selectedModel.performanceLevel) : 'default'}
							size="small"
							onClick={handleShowModelInfo}
							disabled={isLoading}
						/>
					</Tooltip>
					{isLoading && <CircularProgress size={16} />}
				</Box>

				{/* Model Information Dialog */}
				<Dialog open={showModelInfo} onClose={handleCloseModelInfo} maxWidth="sm" fullWidth>
					<DialogTitle>
						LLM Model Information
					</DialogTitle>
					<DialogContent>
						<Stack spacing={2}>
							{AVAILABLE_MODELS.map((model) => (
								<Box
									key={model.id}
									sx={{
										p: 2,
										border: 1,
										borderColor: model.id === selectedModelId ? 'primary.main' : 'divider',
										borderRadius: 1,
										bgcolor: model.id === selectedModelId ? 'primary.light' : 'background.paper',
										cursor: 'pointer'
									}}
									onClick={() => {
										handleModelChange(model.id);
										handleCloseModelInfo();
									}}
								>
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
										{getPerformanceIcon(model.performanceLevel)}
										<Typography variant="h6">{model.name}</Typography>
										<Chip
											label={model.parameters}
											size="small"
											color={getPerformanceColor(model.performanceLevel)}
										/>
									</Box>
									<Typography variant="body2" color="text.secondary">
										{model.description}
									</Typography>
									<Typography variant="caption" display="block" sx={{ mt: 1 }}>
										Performance: {model.performanceLevel}
									</Typography>
								</Box>
							))}
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={handleCloseModelInfo}>Close</Button>
					</DialogActions>
				</Dialog>
			</>
		);
	}

	return (
		<>
			<Box sx={{ minWidth: 200 }}>
				<FormControl fullWidth size="small">
					<InputLabel>LLM Model</InputLabel>
					<Select
						value={selectedModelId}
						label="LLM Model"
						onChange={(e) => handleModelChange(e.target.value as ModelId)}
						disabled={isLoading}
						startAdornment={isLoading && <CircularProgress size={16} sx={{ mr: 1 }} />}
					>
						{AVAILABLE_MODELS.map((model) => (
							<MenuItem key={model.id} value={model.id}>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
									{getPerformanceIcon(model.performanceLevel)}
									<Box sx={{ flexGrow: 1 }}>
										<Typography variant="body2" component="div">
											{model.name}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											{model.parameters} • {model.performanceLevel}
										</Typography>
									</Box>
								</Box>
							</MenuItem>
						))}
					</Select>
				</FormControl>

				{onShowComparison && (
					<Button
						size="small"
						startIcon={<CompareIcon />}
						onClick={onShowComparison}
						sx={{ mt: 1, width: '100%' }}
						variant="outlined"
					>
						Compare Models
					</Button>
				)}
			</Box>

			{/* Model Information Dialog */}
			<Dialog open={showModelInfo} onClose={handleCloseModelInfo} maxWidth="sm" fullWidth>
				<DialogTitle>
					LLM Model Information
				</DialogTitle>
				<DialogContent>
					<Stack spacing={2}>
						{AVAILABLE_MODELS.map((model) => (
							<Box
								key={model.id}
								sx={{
									p: 2,
									border: 1,
									borderColor: model.id === selectedModelId ? 'primary.main' : 'divider',
									borderRadius: 1,
									bgcolor: model.id === selectedModelId ? 'primary.light' : 'background.paper',
									cursor: 'pointer'
								}}
								onClick={() => {
									handleModelChange(model.id);
									handleCloseModelInfo();
								}}
							>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
									{getPerformanceIcon(model.performanceLevel)}
									<Typography variant="h6">{model.name}</Typography>
									<Chip
										label={model.parameters}
										size="small"
										color={getPerformanceColor(model.performanceLevel)}
									/>
								</Box>
								<Typography variant="body2" color="text.secondary">
									{model.description}
								</Typography>
								<Typography variant="caption" display="block" sx={{ mt: 1 }}>
									Performance: {model.performanceLevel}
								</Typography>
							</Box>
						))}
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseModelInfo}>Close</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}