import React, { useState, useCallback } from 'react';
import { Container, Box, Alert, Snackbar } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import type { DungeonMap, GenerationSettings } from '../types';
import { generateDungeon, DEFAULT_GENERATION_SETTINGS } from '../utils/dungeonGenerator';
import { DungeonCanvas } from './DungeonCanvas';
import { GenerationControls } from './GenerationControls';
import { RoomDetails } from './RoomDetails';
import { theme } from '../theme';


export const DungeonGenerator: React.FC = () => {
	const [dungeonMap, setDungeonMap] = useState<DungeonMap | null>(null);
	const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [notification, setNotification] = useState<{
		open: boolean;
		message: string;
		severity: 'success' | 'error' | 'info' | 'warning';
	}>({
		open: false,
		message: '',
		severity: 'info',
	});

	const showNotification = useCallback((message: string, severity: typeof notification.severity = 'info') => {
		setNotification({
			open: true,
			message,
			severity,
		});
	}, []);

	const handleGenerate = useCallback(async (settings: GenerationSettings) => {
		setIsGenerating(true);
		setSelectedRoomId(null);
		
		try {
			// Add a small delay to show the generating state
			await new Promise(resolve => setTimeout(resolve, 500));
			
			const newDungeon = generateDungeon(settings);
			setDungeonMap(newDungeon);
			showNotification(`Generated dungeon with ${newDungeon.totalRooms} rooms!`, 'success');
		} catch (error) {
			console.error('Error generating dungeon:', error);
			showNotification('Failed to generate dungeon. Please try again.', 'error');
		} finally {
			setIsGenerating(false);
		}
	}, [showNotification]);

	const handleReset = useCallback(() => {
		setDungeonMap(null);
		setSelectedRoomId(null);
		showNotification('Dungeon cleared', 'info');
	}, [showNotification]);

	const handleExport = useCallback(() => {
		if (!dungeonMap) return;

		try {
			const exportData = {
				...dungeonMap,
				exportedAt: new Date().toISOString(),
			};
			
			const dataStr = JSON.stringify(exportData, null, 2);
			const dataBlob = new Blob([dataStr], { type: 'application/json' });
			
			const link = document.createElement('a');
			link.href = URL.createObjectURL(dataBlob);
			link.download = `${dungeonMap.name.replace(/\s+/g, '_')}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			
			showNotification('Dungeon exported successfully!', 'success');
		} catch (error) {
			console.error('Error exporting dungeon:', error);
			showNotification('Failed to export dungeon', 'error');
		}
	}, [dungeonMap, showNotification]);

	const handleRoomSelect = useCallback((roomId: string) => {
		setSelectedRoomId(prevSelected => prevSelected === roomId ? null : roomId);
	}, []);

	const selectedRoom = dungeonMap?.rooms.find(room => room.id === selectedRoomId) || null;

	const handleCloseNotification = () => {
		setNotification(prev => ({ ...prev, open: false }));
	};

	return (
		<>
			<CssBaseline />
			<Container maxWidth="xl" sx={{ py: 4 }}>
				<Box sx={{ 
					display: 'flex', 
					flexDirection: { xs: 'column', lg: 'row' },
					gap: 3 
				}}>
					<Box sx={{ flex: { xs: '1', lg: '0 0 300px' } }}>
						<GenerationControls
							onGenerate={handleGenerate}
							onReset={handleReset}
							onExport={handleExport}
							isGenerating={isGenerating}
							hasMap={!!dungeonMap}
							initialSettings={DEFAULT_GENERATION_SETTINGS}
						/>
					</Box>
					
					<Box sx={{ flex: '1' }}>
						<DungeonCanvas
							dungeonMap={dungeonMap}
							selectedRoomId={selectedRoomId}
							onRoomSelect={handleRoomSelect}
						/>
					</Box>
					
					<Box sx={{ flex: { xs: '1', lg: '0 0 300px' } }}>
						<RoomDetails
							room={selectedRoom}
							dungeonMap={dungeonMap}
						/>
					</Box>
				</Box>

				<Snackbar
					open={notification.open}
					autoHideDuration={4000}
					onClose={handleCloseNotification}
					anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
				>
					<Alert
						onClose={handleCloseNotification}
						severity={notification.severity}
						variant="filled"
						sx={{ width: '100%' }}
					>
						{notification.message}
					</Alert>
				</Snackbar>
			</Container>
		</>
	);
};