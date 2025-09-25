import { Box, Paper, Typography, Tooltip } from '@mui/material';
import {
	Room as RoomIcon,
	Home as EntranceIcon,
	Store as TreasureIcon,
	Build as WorkshopIcon,
	MenuBook as LibraryIcon,
	Dangerous as BossIcon,
	MyLocation as CurrentIcon
} from '@mui/icons-material';
import type { GameState, Room } from '../models/Room';
import type { RoomType } from '../models/Room';

interface MinimapProps {
	gameState: GameState;
	maxWidth?: number;
	maxHeight?: number;
}

interface MinimapRoom {
	id: string;
	room: Room;
	x: number;
	y: number;
	isVisited: boolean;
	isCurrent: boolean;
}

export function Minimap({ gameState, maxWidth = 300, maxHeight = 200 }: MinimapProps) {
	// Get all visited rooms from the dungeon
	const visitedRooms = Array.from(gameState.dungeon.rooms.entries())
		.map(([id, room]) => ({
			id,
			room,
			x: room.coordinates.x,
			y: room.coordinates.y,
			isVisited: true, // All rooms in dungeon.rooms are considered visited
			isCurrent: id === gameState.currentRoomId
		}));

	if (visitedRooms.length === 0) {
		return (
			<Paper sx={{ p: 2, width: maxWidth, height: maxHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<Typography variant="body2" color="text.secondary">
					No map data
				</Typography>
			</Paper>
		);
	}

	// Calculate bounds for the minimap grid
	const minX = Math.min(...visitedRooms.map(r => r.x));
	const maxX = Math.max(...visitedRooms.map(r => r.x));
	const minY = Math.min(...visitedRooms.map(r => r.y));
	const maxY = Math.max(...visitedRooms.map(r => r.y));

	const gridWidth = maxX - minX + 1;
	const gridHeight = maxY - minY + 1;

	// Create a 2D grid for positioning
	const grid: (MinimapRoom | null)[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(null));

	visitedRooms.forEach(room => {
		const gridX = room.x - minX;
		const gridY = room.y - minY;
		if (gridY >= 0 && gridY < gridHeight && gridX >= 0 && gridX < gridWidth) {
			grid[gridY]![gridX] = room;
		}
	});

	const getRoomIcon = (roomType: RoomType) => {
		switch (roomType) {
			case 'entrance':
				return <EntranceIcon fontSize="small" />;
			case 'treasure_room':
				return <TreasureIcon fontSize="small" />;
			case 'armory':
				return <WorkshopIcon fontSize="small" />;
			case 'library':
				return <LibraryIcon fontSize="small" />;
			case 'throne_room':
				return <BossIcon fontSize="small" />;
			default:
				return <RoomIcon fontSize="small" />;
		}
	};

	const getRoomColor = (roomType: RoomType, isCurrent: boolean) => {
		if (isCurrent) return 'primary.main';

		switch (roomType) {
			case 'entrance':
				return 'success.main';
			case 'treasure_room':
				return 'warning.main';
			case 'armory':
				return 'secondary.main';
			case 'library':
				return 'info.dark';
			case 'throne_room':
				return 'error.dark';
			default:
				return 'text.secondary';
		}
	};

	const getRoomTooltip = (room: MinimapRoom) => {
		const enemies = room.room.contents.enemies.length;
		const items = room.room.contents.items.length;
		const exits = room.room.exits && room.room.exits instanceof Map ?
			Array.from(room.room.exits.keys()).join(', ') : 'None';

		return (
			<Box>
				<Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
					{room.room.roomType.charAt(0).toUpperCase() + room.room.roomType.slice(1)} Room
				</Typography>
				<Typography variant="caption" display="block">
					Coordinates: ({room.x}, {room.y})
				</Typography>
				{exits !== 'None' && (
					<Typography variant="caption" display="block">
						Exits: {exits}
					</Typography>
				)}
				{enemies > 0 && (
					<Typography variant="caption" display="block" color="error.main">
						Enemies: {enemies}
					</Typography>
				)}
				{items > 0 && (
					<Typography variant="caption" display="block" color="success.main">
						Items: {items}
					</Typography>
				)}
				{room.room.hazards && room.room.hazards.length > 0 && (
					<Typography variant="caption" display="block" color="warning.main">
						Hazards present
					</Typography>
				)}
			</Box>
		);
	};

	const cellSize = Math.min(
		Math.floor((maxWidth - 32) / gridWidth),
		Math.floor((maxHeight - 64) / gridHeight),
		32
	);

	return (
		<Paper sx={{ p: 2, width: maxWidth, height: maxHeight }}>
			<Typography variant="h6" gutterBottom sx={{ fontSize: '0.875rem', mb: 1 }}>
				Dungeon Map
			</Typography>

			<Box
				sx={{
					display: 'grid',
					gridTemplateColumns: `repeat(${gridWidth}, ${cellSize}px)`,
					gridTemplateRows: `repeat(${gridHeight}, ${cellSize}px)`,
					gap: '1px',
					justifyContent: 'center',
					maxWidth: maxWidth - 32,
					maxHeight: maxHeight - 64,
					overflow: 'hidden'
				}}
			>
				{grid.flat().map((cell, index) => {
					const gridX = index % gridWidth;
					const gridY = Math.floor(index / gridWidth);

					if (!cell) {
						return (
							<Box
								key={`${gridX}-${gridY}`}
								sx={{
									width: cellSize,
									height: cellSize,
									backgroundColor: 'grey.100',
									border: '1px solid',
									borderColor: 'grey.300'
								}}
							/>
						);
					}

					return (
						<Tooltip key={cell.id} title={getRoomTooltip(cell)} placement="top">
							<Box
								sx={{
									width: cellSize,
									height: cellSize,
									backgroundColor: 'background.paper',
									border: '2px solid',
									borderColor: getRoomColor(cell.room.roomType, cell.isCurrent),
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									position: 'relative',
									cursor: 'pointer',
									'&:hover': {
										backgroundColor: 'action.hover'
									}
								}}
							>
								<Box sx={{ color: getRoomColor(cell.room.roomType, cell.isCurrent) }}>
									{getRoomIcon(cell.room.roomType)}
								</Box>

								{cell.isCurrent && (
									<CurrentIcon
										sx={{
											position: 'absolute',
											top: -2,
											right: -2,
											fontSize: 12,
											color: 'primary.main',
											backgroundColor: 'background.paper',
											borderRadius: '50%'
										}}
									/>
								)}
							</Box>
						</Tooltip>
					);
				})}
			</Box>

			{/* Legend */}
			<Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
				<Typography variant="caption" sx={{
					px: 0.5,
					py: 0.25,
					backgroundColor: 'primary.main',
					color: 'primary.contrastText',
					borderRadius: 0.5,
					fontSize: '0.6rem'
				}}>
					Current
				</Typography>
				<Typography variant="caption" sx={{
					px: 0.5,
					py: 0.25,
					backgroundColor: 'success.main',
					color: 'success.contrastText',
					borderRadius: 0.5,
					fontSize: '0.6rem'
				}}>
					Entrance
				</Typography>
				<Typography variant="caption" sx={{
					px: 0.5,
					py: 0.25,
					backgroundColor: 'warning.main',
					color: 'warning.contrastText',
					borderRadius: 0.5,
					fontSize: '0.6rem'
				}}>
					Treasure
				</Typography>
				<Typography variant="caption" sx={{
					px: 0.5,
					py: 0.25,
					backgroundColor: 'error.main',
					color: 'error.contrastText',
					borderRadius: 0.5,
					fontSize: '0.6rem'
				}}>
					Boss
				</Typography>
			</Box>
		</Paper>
	);
}