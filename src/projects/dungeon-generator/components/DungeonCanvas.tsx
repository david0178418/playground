import React, { useMemo } from 'react';
import { Box, Paper } from '@mui/material';
import type { DungeonMap, Room, MergedCorridor, ConnectionPoint, ExteriorDoor } from '../types';
import { getRoomTemplateById } from '../data/roomTemplates';
import { isConnectionPointConnected } from '../utils/connectionHelpers';
import {
	calculateDoorDimensions,
	calculateRoomCenter
} from '../utils/renderingHelpers';
import { RENDERING, COLORS } from '../constants';

interface Props {
	dungeonMap: DungeonMap | null;
	selectedRoomId: string | null;
	onRoomSelect: (roomId: string) => void;
}

export function DungeonCanvas(props: Props) {
	const {
		dungeonMap,
		selectedRoomId,
		onRoomSelect,
	} = props;
	const canvasSize = RENDERING.CANVAS_SIZE;
	const gridSquareSize = dungeonMap ? canvasSize / dungeonMap.gridSize : RENDERING.GRID_SQUARE_SIZE;

	// Memoized corridor position calculation for better performance
	const allCorridorPositions = useMemo(() => {
		if (!dungeonMap?.mergedCorridors) return new Set<string>();
		const positions = new Set<string>();
		dungeonMap.mergedCorridors.forEach(mergedCorridor => {
			mergedCorridor.path.forEach(pos => {
				positions.add(`${pos.x},${pos.y}`);
			});
		});
		return positions;
	}, [dungeonMap?.mergedCorridors]);

	const renderRoom = (room: Room) => {
		const x = room.position.x * gridSquareSize;
		const y = room.position.y * gridSquareSize;
		const isSelected = room.id === selectedRoomId;

		// Get room template for accurate rendering
		const template = room.templateId ? getRoomTemplateById(room.templateId) : null;

		// Define colors based on selection state
		const colors = {
			fill: isSelected ? '#e3f2fd' : COLORS.ROOM_FILL,
			stroke: isSelected ? COLORS.ROOM_SELECTED : COLORS.ROOM_STROKE,
			strokeWidth: isSelected ? RENDERING.SELECTED_STROKE_WIDTH : RENDERING.ROOM_STROKE_WIDTH
		};
		let roomElements: React.ReactElement[] = [];
		
		if (template) {
			// Render room squares with light inner grid lines
			for (let row = 0; row < template.gridPattern.length; row++) {
				const gridRow = template.gridPattern[row];
				if (!gridRow) continue;
				for (let col = 0; col < gridRow.length; col++) {
					if (gridRow[col]) {
						roomElements.push(
							<rect
								key={`${room.id}-${row}-${col}`}
								x={x + col * gridSquareSize}
								y={y + row * gridSquareSize}
								width={gridSquareSize}
								height={gridSquareSize}
								fill={colors.fill}
								stroke={COLORS.ROOM_INNER_GRID}
								strokeWidth={RENDERING.INNER_GRID_STROKE_WIDTH}
								style={{ cursor: 'pointer' }}
								onClick={() => onRoomSelect(room.id)}
							/>
						);
					}
				}
			}

			// Draw thick black outer wall edges using helper function
			for (let row = 0; row < template.gridPattern.length; row++) {
				const gridRow = template.gridPattern[row];
				if (!gridRow) continue;
				for (let col = 0; col < gridRow.length; col++) {
					if (gridRow[col]) {
						const wallElements = renderRoomWalls(
							room.id,
							x + col * gridSquareSize,
							y + row * gridSquareSize,
							row,
							col,
							template.gridPattern,
							colors
						);
						roomElements.push(...wallElements);
					}
				}
			}
		} else {
			// Fallback to simple rectangle
			roomElements.push(
				<rect
					key={room.id}
					x={x}
					y={y}
					width={room.width * gridSquareSize}
					height={room.height * gridSquareSize}
					fill={colors.fill}
					stroke={colors.stroke}
					strokeWidth={colors.strokeWidth}
					style={{ cursor: 'pointer' }}
					onClick={() => onRoomSelect(room.id)}
				/>
			);
		}

		// Add doors (connection points as rectangles) - only for connected points
		const doors = room.connectionPoints?.filter(cp => isConnectionPointConnected(cp)).map((cp, index) =>
			renderDoor(room.id, cp, index, gridSquareSize)
		) || [];

		// Add room number
		const center = calculateRoomCenter(x, y, room.width, room.height, gridSquareSize);

		return (
			<g key={room.id}>
				{roomElements}
				{doors}
				<text
					x={center.x}
					y={center.y}
					textAnchor="middle"
					dominantBaseline="central"
					fontSize={Math.max(10, gridSquareSize / 3)}
					fill={COLORS.TEXT_FILL}
					fontWeight="bold"
					pointerEvents="none"
				>
					{room.id.split('-')[1]?.slice(0, 4) || 'R'}
				</text>
			</g>
		);
	};

	const renderDoor = (roomId: string, cp: ConnectionPoint, index: number, gridSquareSize: number) => {
		const doorDims = calculateDoorDimensions(cp, gridSquareSize);

		return (
			<rect
				key={`${roomId}-door-${index}`}
				x={doorDims.x}
				y={doorDims.y}
				width={doorDims.width}
				height={doorDims.height}
				fill={COLORS.ROOM_FILL}
				stroke={COLORS.ROOM_STROKE}
				strokeWidth={RENDERING.STROKE_WIDTH + RENDERING.INNER_GRID_STROKE_WIDTH}
			/>
		);
	};

	// Helper function to render room wall edges
	const renderRoomWalls = (
		roomId: string,
		squareX: number,
		squareY: number,
		row: number,
		col: number,
		gridPattern: boolean[][],
		colors: { stroke: string; strokeWidth: number }
	): React.ReactElement[] => {
		const elements: React.ReactElement[] = [];

		// Define wall edge configurations with their conditions
		const wallEdges = [
			{
				condition: row === 0 || !gridPattern[row - 1]?.[col],
				coords: [squareX, squareY, squareX + gridSquareSize, squareY],
				edgeName: 'top'
			},
			{
				condition: row === gridPattern.length - 1 || !gridPattern[row + 1]?.[col],
				coords: [squareX, squareY + gridSquareSize, squareX + gridSquareSize, squareY + gridSquareSize],
				edgeName: 'bottom'
			},
			{
				condition: col === 0 || !gridPattern[row][col - 1],
				coords: [squareX, squareY, squareX, squareY + gridSquareSize],
				edgeName: 'left'
			},
			{
				condition: col === gridPattern[row].length - 1 || !gridPattern[row][col + 1],
				coords: [squareX + gridSquareSize, squareY, squareX + gridSquareSize, squareY + gridSquareSize],
				edgeName: 'right'
			}
		];

		wallEdges.forEach(({ condition, coords, edgeName }) => {
			if (condition) {
				elements.push(
					<line
						key={`${roomId}-${edgeName}-${row}-${col}`}
						x1={coords[0]}
						y1={coords[1]}
						x2={coords[2]}
						y2={coords[3]}
						stroke={colors.stroke}
						strokeWidth={colors.strokeWidth}
					/>
				);
			}
		});

		return elements;
	};

	// Helper function to render corridor border edges
	const renderCorridorBorder = (
		corridorId: string,
		pos: { x: number; y: number },
		index: number,
		allCorridorPositions: Set<string>
	): React.ReactElement[] => {
		const squareX = pos.x * gridSquareSize;
		const squareY = pos.y * gridSquareSize;
		const elements: React.ReactElement[] = [];

		// Define edge configurations: [offsetX, offsetY, x1, y1, x2, y2, edgeName]
		const edges = [
			[0, -1, squareX, squareY, squareX + gridSquareSize, squareY, 'top'],
			[0, 1, squareX, squareY + gridSquareSize, squareX + gridSquareSize, squareY + gridSquareSize, 'bottom'],
			[-1, 0, squareX, squareY, squareX, squareY + gridSquareSize, 'left'],
			[1, 0, squareX + gridSquareSize, squareY, squareX + gridSquareSize, squareY + gridSquareSize, 'right']
		] as const;

		edges.forEach(([offsetX, offsetY, x1, y1, x2, y2, edgeName]) => {
			// Only draw wall if no corridor exists at adjacent position
			if (!allCorridorPositions.has(`${pos.x + offsetX},${pos.y + offsetY}`)) {
				elements.push(
					<line
						key={`${corridorId}-${edgeName}-${index}`}
						x1={x1}
						y1={y1}
						x2={x2}
						y2={y2}
						stroke={COLORS.CORRIDOR_STROKE}
						strokeWidth={RENDERING.STROKE_WIDTH}
					/>
				);
			}
		});

		return elements;
	};

	const renderCorridorPath = (id: string, path: Position[], allCorridorPositions: Set<string>) => {
		const elements: React.ReactElement[] = [];

		// Render corridor squares with light inner grid lines
		path.forEach((pos, index) => {
			elements.push(
				<rect
					key={`${id}-${index}`}
					x={pos.x * gridSquareSize}
					y={pos.y * gridSquareSize}
					width={gridSquareSize}
					height={gridSquareSize}
					fill={COLORS.CORRIDOR_FILL}
					stroke={COLORS.ROOM_INNER_GRID}
					strokeWidth={RENDERING.INNER_GRID_STROKE_WIDTH}
				/>
			);
		});

		// Draw border walls using the helper function
		path.forEach((pos, index) => {
			const borderElements = renderCorridorBorder(id, pos, index, allCorridorPositions);
			elements.push(...borderElements);
		});

		return <g key={id}>{elements}</g>;
	};

	const renderMergedCorridor = (mergedCorridor: MergedCorridor, allCorridorPositions: Set<string>) =>
		renderCorridorPath(mergedCorridor.id, mergedCorridor.path, allCorridorPositions);

	const renderExteriorEntrance = (entranceDoor: ExteriorDoor) => {
		const x = entranceDoor.position.x * gridSquareSize;
		const y = entranceDoor.position.y * gridSquareSize;

		// Create a larger, more prominent door for the entrance
		let doorWidth, doorHeight, doorX, doorY;

		switch (entranceDoor.direction) {
			case 'south': // Door faces south (into dungeon), so door is on north edge of square
				doorWidth = gridSquareSize * 0.8;
				doorHeight = gridSquareSize * 0.3;
				doorX = x + (gridSquareSize - doorWidth) / 2;
				doorY = y - doorHeight / 2;
				break;
			case 'north': // Door faces north (into dungeon), so door is on south edge of square
				doorWidth = gridSquareSize * 0.8;
				doorHeight = gridSquareSize * 0.3;
				doorX = x + (gridSquareSize - doorWidth) / 2;
				doorY = y + gridSquareSize - doorHeight / 2;
				break;
			case 'west': // Door faces west (into dungeon), so door is on east edge of square
				doorWidth = gridSquareSize * 0.3;
				doorHeight = gridSquareSize * 0.8;
				doorX = x + gridSquareSize - doorWidth / 2;
				doorY = y + (gridSquareSize - doorHeight) / 2;
				break;
			case 'east': // Door faces east (into dungeon), so door is on west edge of square
				doorWidth = gridSquareSize * 0.3;
				doorHeight = gridSquareSize * 0.8;
				doorX = x - doorWidth / 2;
				doorY = y + (gridSquareSize - doorHeight) / 2;
				break;
			default:
				doorWidth = gridSquareSize * 0.4;
				doorHeight = gridSquareSize * 0.4;
				doorX = x + (gridSquareSize - doorWidth) / 2;
				doorY = y + (gridSquareSize - doorHeight) / 2;
		}

		return (
			<g key="exterior-entrance">
				{/* Door opening */}
				<rect
					x={doorX}
					y={doorY}
					width={doorWidth}
					height={doorHeight}
					fill="#4caf50"
					stroke="#2e7d32"
					strokeWidth={3}
				/>
				{/* "ENTRANCE" label */}
				<text
					x={x + gridSquareSize / 2}
					y={y + gridSquareSize / 2}
					textAnchor="middle"
					dominantBaseline="central"
					fontSize={Math.max(8, gridSquareSize / 5)}
					fill="#fff"
					fontWeight="bold"
					pointerEvents="none"
				>
					ENT
				</text>
			</g>
		);
	};


	return (
		<Paper elevation={3} sx={{ p: 2, height: canvasSize + 40, overflow: 'hidden' }}>
			<Box
				sx={{
					width: canvasSize,
					height: canvasSize,
					border: '1px solid #ccc',
					backgroundColor: '#fafafa',
					position: 'relative',
					overflow: 'hidden',
				}}
			>
				{dungeonMap ? (
					<svg width={canvasSize} height={canvasSize}>
						{/* Grid background */}
						<rect width="100%" height="100%" fill="#ffffff" stroke="#000" strokeWidth="2" />
						
						{/* Grid lines - major (every 5 squares) */}
						<defs>
							<pattern id="majorGrid" width={gridSquareSize * 5} height={gridSquareSize * 5} patternUnits="userSpaceOnUse">
								<path
									d={`M ${gridSquareSize * 5} 0 L 0 0 0 ${gridSquareSize * 5}`}
									fill="none"
									stroke="#666666"
									strokeWidth="1"
								/>
							</pattern>
							<pattern id="minorGrid" width={gridSquareSize} height={gridSquareSize} patternUnits="userSpaceOnUse">
								<path
									d={`M ${gridSquareSize} 0 L 0 0 0 ${gridSquareSize}`}
									fill="none"
									stroke="#dddddd"
									strokeWidth={RENDERING.INNER_GRID_STROKE_WIDTH}
								/>
							</pattern>
						</defs>
						
						{/* Apply grid patterns */}
						<rect width="100%" height="100%" fill="url(#minorGrid)" />
						<rect width="100%" height="100%" fill="url(#majorGrid)" />
						
						{/* Grid coordinates */}
						{Array.from({ length: Math.ceil(dungeonMap.gridSize / 5) + 1 }, (_, i) => i * 5).map(i => (
							<g key={`coords-${i}`}>
								{/* X-axis labels */}
								{i <= dungeonMap.gridSize && (
									<text
										x={i * gridSquareSize}
										y={-5}
										textAnchor="middle"
										fontSize="10"
										fill="#666"
									>
										{i}
									</text>
								)}
								{/* Y-axis labels */}
								{i <= dungeonMap.gridSize && (
									<text
										x={-5}
										y={i * gridSquareSize + 4}
										textAnchor="end"
										fontSize="10"
										fill="#666"
									>
										{i}
									</text>
								)}
							</g>
						))}
						
						{/* Corridors (render first so rooms appear on top) */}
						{dungeonMap.mergedCorridors?.map(mergedCorridor => renderMergedCorridor(mergedCorridor, allCorridorPositions))}

						{/* Rooms */}
						{dungeonMap.rooms.map(renderRoom)}

						{/* Exterior entrance door */}
						{dungeonMap.entranceDoor && renderExteriorEntrance(dungeonMap.entranceDoor)}
						
						{/* Grid coordinates overlay */}
						<g transform="translate(-15, -15)">
							{Array.from({ length: Math.ceil(dungeonMap.gridSize / 5) + 1 }, (_, i) => i * 5).map(i => (
								<g key={`overlay-coords-${i}`}>
									{/* X-axis labels */}
									{i <= dungeonMap.gridSize && (
										<text
											x={i * gridSquareSize + 15}
											y={10}
											textAnchor="middle"
											fontSize="12"
											fill="#333"
											fontWeight="bold"
										>
											{i}
										</text>
									)}
									{/* Y-axis labels */}
									{i <= dungeonMap.gridSize && (
										<text
											x={10}
											y={i * gridSquareSize + 19}
											textAnchor="middle"
											fontSize="12"
											fill="#333"
											fontWeight="bold"
										>
											{i}
										</text>
									)}
								</g>
							))}
						</g>
					</svg>
				) : (
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							height: '100%',
							color: 'text.secondary',
							fontSize: '1.2rem',
						}}
					>
						Generate a dungeon to see the map
					</Box>
				)}
			</Box>
		</Paper>
	);
};