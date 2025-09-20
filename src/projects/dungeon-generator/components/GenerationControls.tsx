import { useState } from 'react';
import {
	Box,
	Button,
	Paper,
	Typography,
	TextField,
	Divider,
} from '@mui/material';
import type { GenerationSettings } from '../types';
import { GENERATION_LIMITS } from '../constants';
import { generateRandomSeed } from '../utils/seededRandom';

interface Props {
	onGenerate: (settings: GenerationSettings) => void;
	onReset: () => void;
	onExport: () => void;
	isGenerating: boolean;
	hasMap: boolean;
	initialSettings: GenerationSettings;
}

export function GenerationControls(props: Props) {
	const {
		onGenerate,
		onReset,
		onExport,
		isGenerating,
		hasMap,
		initialSettings,
	} = props;
	const [settings, setSettings] = useState<GenerationSettings>(initialSettings);

	const handleSettingChange = <K extends keyof GenerationSettings>(
		key: K,
		value: GenerationSettings[K]
	) => {
		setSettings(prev => ({ ...prev, [key]: value }));
	};

	const handleGenerate = () => {
		// Generate seed if not provided and update UI
		const finalSettings = { ...settings };
		if (!finalSettings.seed || finalSettings.seed.trim() === '') {
			finalSettings.seed = generateRandomSeed();
			setSettings(finalSettings);
		}
		onGenerate(finalSettings);
	};

	return (
		<Paper elevation={3} sx={{ p: 3 }}>
			<Typography variant="h5" gutterBottom>
				Dungeon Generator
			</Typography>
			
			<Box sx={{ 
				display: 'grid', 
				gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
				gap: 2 
			}}>
				<TextField
					label="Room Count"
					type="number"
					value={settings.roomCount}
					onChange={(e) => handleSettingChange('roomCount', parseInt(e.target.value) || 1)}
					inputProps={{ min: GENERATION_LIMITS.MIN_ROOMS_LIMIT, max: GENERATION_LIMITS.MAX_ROOMS_LIMIT }}
					fullWidth
					size="small"
				/>

				<TextField
					label="Seed"
					type="text"
					value={settings.seed || ''}
					onChange={(e) => handleSettingChange('seed', e.target.value)}
					placeholder="Leave blank for random"
					fullWidth
					size="small"
				/>
				
				<TextField
					label="Grid Size"
					type="number"
					value={settings.gridSize}
					onChange={(e) => handleSettingChange('gridSize', parseInt(e.target.value) || 20)}
					inputProps={{ min: GENERATION_LIMITS.MIN_GRID_SIZE, max: GENERATION_LIMITS.MAX_GRID_SIZE }}
					fullWidth
					size="small"
					helperText="Grid squares (20-50)"
				/>
				
				<TextField
					label="Room Spacing"
					type="number"
					value={settings.roomSpacing}
					onChange={(e) => handleSettingChange('roomSpacing', parseInt(e.target.value) || 1)}
					inputProps={{ min: GENERATION_LIMITS.MIN_ROOM_SPACING, max: GENERATION_LIMITS.MAX_ROOM_SPACING }}
					fullWidth
					size="small"
					helperText="Grid squares between rooms"
				/>
				
				<TextField
					label="Max Exits per Room"
					type="number"
					value={settings.maxExitsPerRoom}
					onChange={(e) => handleSettingChange('maxExitsPerRoom', parseInt(e.target.value) || 1)}
					inputProps={{ min: GENERATION_LIMITS.MIN_ROOMS_LIMIT, max: GENERATION_LIMITS.MAX_EXITS_LIMIT }}
					fullWidth
					size="small"
				/>
				
			</Box>
			
			<Divider sx={{ my: 3 }} />
			
			<Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
				<Button
					variant="contained"
					color="primary"
					onClick={handleGenerate}
					disabled={isGenerating}
					size="large"
				>
					{isGenerating ? 'Generating...' : 'Generate Dungeon'}
				</Button>
				
				<Button
					variant="outlined"
					onClick={onReset}
					disabled={!hasMap || isGenerating}
				>
					Reset
				</Button>
				
				<Button
					variant="outlined"
					color="secondary"
					onClick={onExport}
					disabled={!hasMap || isGenerating}
				>
					Export JSON
				</Button>
			</Box>
		</Paper>
	);
};