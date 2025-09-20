import type {
	DungeonMap,
	Room,
	Corridor,
	Position,
	GenerationSettings,
	ConnectionPoint,
	RoomTemplate,
	ExteriorDoor,
} from '../types';
import {
	RoomType,
	ExitDirection,
	CorridorType,
	CorridorDirection,
} from '../types';
import { CorridorGenerator } from './corridorGenerator';
import {
	getRandomRoomTemplate,
} from '../data/roomTemplates';
import { isConnectionPointConnected, connectConnectionPoint } from './connectionHelpers';

interface DungeonState {
	rooms: Room[];
	corridors: Corridor[];
	entranceDoor: ExteriorDoor | undefined;
	occupiedPositions: Set<string>;
	corridorGenerator: CorridorGenerator;
}

function createInitialState(settings: GenerationSettings): DungeonState {
	return {
		rooms: [],
		corridors: [],
		entranceDoor: undefined,
		occupiedPositions: new Set(),
		corridorGenerator: new CorridorGenerator(settings.gridSize),
	};
}

function determineRoomCount(settings: GenerationSettings): number {
	const { minRooms, maxRooms } = settings;
	return minRooms + Math.floor(Math.random() * (maxRooms - minRooms + 1));
}

function calculateDistance(pos1: Position, pos2: Position): number {
	return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

function hasReasonablePath(from: Position, to: Room, occupiedPositions: Set<string>): boolean {
	const roomCenter = {
		x: to.position.x + Math.floor(to.width / 2),
		y: to.position.y + Math.floor(to.height / 2)
	};

	const dx = roomCenter.x - from.x;
	const dy = roomCenter.y - from.y;
	const steps = Math.max(Math.abs(dx), Math.abs(dy));

	if (steps === 0) return true;

	let blockedCount = 0;
	const maxBlockedAllowed = Math.floor(steps * 0.3);

	for (let i = 1; i < steps; i++) {
		const t = i / steps;
		const checkX = Math.round(from.x + dx * t);
		const checkY = Math.round(from.y + dy * t);

		if (occupiedPositions.has(`${checkX},${checkY}`)) {
			blockedCount++;
			if (blockedCount > maxBlockedAllowed) {
				return false;
			}
		}
	}

	return true;
}

function findViableEntrancePositions(room: Room, settings: GenerationSettings, occupiedPositions: Set<string>): Array<{ position: Position; direction: ExitDirection }> {
	const positions: Array<{ position: Position; direction: ExitDirection }> = [];
	const roomCenter = {
		x: room.position.x + Math.floor(room.width / 2),
		y: room.position.y + Math.floor(room.height / 2)
	};

	const edgeChecks = [
		{ edge: 'north', pos: { x: roomCenter.x, y: 0 }, dir: ExitDirection.South },
		{ edge: 'south', pos: { x: roomCenter.x, y: settings.gridSize - 1 }, dir: ExitDirection.North },
		{ edge: 'east', pos: { x: settings.gridSize - 1, y: roomCenter.y }, dir: ExitDirection.West },
		{ edge: 'west', pos: { x: 0, y: roomCenter.y }, dir: ExitDirection.East },
	];

	for (const check of edgeChecks) {
		check.pos.x = Math.max(0, Math.min(settings.gridSize - 1, check.pos.x));
		check.pos.y = Math.max(0, Math.min(settings.gridSize - 1, check.pos.y));

		const distance = calculateDistance(check.pos, roomCenter);
		if (distance > settings.gridSize * 0.7) continue;

		if (hasReasonablePath(check.pos, room, occupiedPositions)) {
			positions.push({ position: check.pos, direction: check.dir });
		}
	}

	return positions;
}

function findConnectableRooms(state: DungeonState, settings: GenerationSettings): Array<{ room: Room; entrancePositions: Array<{ position: Position; direction: ExitDirection }> }> {
	const results: Array<{ room: Room; entrancePositions: Array<{ position: Position; direction: ExitDirection }> }> = [];

	for (const room of state.rooms) {
		const entrancePositions = findViableEntrancePositions(room, settings, state.occupiedPositions);
		if (entrancePositions.length > 0) {
			results.push({ room, entrancePositions });
		}
	}

	results.sort((a, b) => b.entrancePositions.length - a.entrancePositions.length);
	return results;
}

function findClosestConnectionPoint(room: Room, position: Position): ConnectionPoint | null {
	let closestConnectionPoint: ConnectionPoint | null = null;
	let minDistance = Infinity;
	let foundUnconnected = false;

	for (const cp of room.connectionPoints) {
		if (!isConnectionPointConnected(cp)) {
			const distance = calculateDistance(position, cp.position);
			if (distance < minDistance) {
				minDistance = distance;
				closestConnectionPoint = cp;
				foundUnconnected = true;
			}
		}
	}

	if (!foundUnconnected) {
		minDistance = Infinity;
		for (const cp of room.connectionPoints) {
			const distance = calculateDistance(position, cp.position);
			if (distance < minDistance) {
				minDistance = distance;
				closestConnectionPoint = cp;
			}
		}
	}

	return closestConnectionPoint;
}

function attemptEntranceConnection(state: DungeonState, room: Room, entrancePosition: Position, direction: ExitDirection): boolean {
	const closestConnectionPoint = findClosestConnectionPoint(room, entrancePosition);

	if (!closestConnectionPoint) return false;

	const corridorSegments = state.corridorGenerator.generateCorridor(
		entrancePosition,
		closestConnectionPoint.position
	);

	if (corridorSegments.length === 0) {
		return false;
	}

	state.entranceDoor = {
		position: entrancePosition,
		direction: direction,
		connectedElementId: room.id,
	};

	state.corridors.push(...corridorSegments);

	if (!isConnectionPointConnected(closestConnectionPoint)) {
		connectConnectionPoint(closestConnectionPoint, state.entranceDoor.connectedElementId!);
	}

	return true;
}

function tryCreateEntranceForRoom(state: DungeonState, room: Room, entrancePositions: Array<{ position: Position; direction: ExitDirection }>): boolean {
	for (const entrancePos of entrancePositions) {
		if (attemptEntranceConnection(state, room, entrancePos.position, entrancePos.direction)) {
			return true;
		}
	}
	return false;
}

function createLinearPath(start: Position, end: Position): Position[] {
	const path: Position[] = [];
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const steps = Math.max(Math.abs(dx), Math.abs(dy));

	for (let i = 0; i <= steps; i++) {
		const t = steps > 0 ? i / steps : 0;
		path.push({
			x: Math.round(start.x + dx * t),
			y: Math.round(start.y + dy * t)
		});
	}

	return path;
}

function forceEntranceConnection(state: DungeonState, entrance: ExteriorDoor, room: Room): void {
	const closestConnectionPoint = findClosestConnectionPoint(room, entrance.position);

	if (!closestConnectionPoint) return;

	const start = entrance.position;
	const end = closestConnectionPoint.position;

	const corridorSegments: Corridor[] = [];

	if (start.x !== end.x) {
		const horizontalId = `corridor-entrance-h-${Date.now()}`;
		corridorSegments.push({
			id: horizontalId,
			type: CorridorType.Straight,
			direction: CorridorDirection.Horizontal,
			position: { x: Math.min(start.x, end.x), y: start.y },
			length: Math.abs(end.x - start.x) + 1,
			width: 1,
			connectionPoints: [],
			path: createLinearPath(
				{ x: start.x, y: start.y },
				{ x: end.x, y: start.y }
			)
		});
	}

	if (start.y !== end.y) {
		const verticalId = `corridor-entrance-v-${Date.now()}`;
		corridorSegments.push({
			id: verticalId,
			type: CorridorType.Straight,
			direction: CorridorDirection.Vertical,
			position: { x: end.x, y: Math.min(start.y, end.y) },
			length: Math.abs(end.y - start.y) + 1,
			width: 1,
			connectionPoints: [],
			path: createLinearPath(
				{ x: end.x, y: start.y },
				{ x: end.x, y: end.y }
			)
		});
	}

	state.corridors.push(...corridorSegments);

	if (!isConnectionPointConnected(closestConnectionPoint)) {
		connectConnectionPoint(closestConnectionPoint, 'entrance-corridor');
	}
}

function createEntranceWithFallback(state: DungeonState, settings: GenerationSettings, rooms: Room[]): void {
	let closestRoom: Room | null = null;
	let closestDistance = Infinity;

	for (const room of rooms) {
		const roomCenter = {
			x: room.position.x + Math.floor(room.width / 2),
			y: room.position.y + Math.floor(room.height / 2)
		};

		const distances = [
			roomCenter.y,
			settings.gridSize - 1 - roomCenter.y,
			roomCenter.x,
			settings.gridSize - 1 - roomCenter.x,
		];

		const minDistanceToEdge = Math.min(...distances);
		if (minDistanceToEdge < closestDistance) {
			closestDistance = minDistanceToEdge;
			closestRoom = room;
		}
	}

	if (!closestRoom) return;

	const roomCenter = {
		x: closestRoom.position.x + Math.floor(closestRoom.width / 2),
		y: closestRoom.position.y + Math.floor(closestRoom.height / 2)
	};

	const edgeOptions = [
		{ pos: { x: roomCenter.x, y: 0 }, dir: ExitDirection.South },
		{ pos: { x: roomCenter.x, y: settings.gridSize - 1 }, dir: ExitDirection.North },
		{ pos: { x: 0, y: roomCenter.y }, dir: ExitDirection.East },
		{ pos: { x: settings.gridSize - 1, y: roomCenter.y }, dir: ExitDirection.West },
	];

	edgeOptions.sort((a, b) => {
		const distA = calculateDistance(a.pos, roomCenter);
		const distB = calculateDistance(b.pos, roomCenter);
		return distA - distB;
	});

	const bestEdge = edgeOptions[0];
	if (!bestEdge) {
		throw new Error('No valid edge options for entrance creation');
	}
	state.entranceDoor = {
		position: bestEdge.pos,
		direction: bestEdge.dir,
		connectedElementId: closestRoom.id,
	};

	forceEntranceConnection(state, state.entranceDoor, closestRoom);
}

function createExteriorEntrance(state: DungeonState, settings: GenerationSettings): void {
	if (state.rooms.length === 0) return;

	const connectableRooms = findConnectableRooms(state, settings);

	if (connectableRooms.length === 0) {
		const allRooms = [...state.rooms];
		if (allRooms.length > 0) {
			createEntranceWithFallback(state, settings, allRooms);
		}
		return;
	}

	for (const roomInfo of connectableRooms) {
		if (tryCreateEntranceForRoom(state, roomInfo.room, roomInfo.entrancePositions)) {
			return;
		}
	}

	createEntranceWithFallback(state, settings, [...state.rooms]);
}

function isValidRoomPosition(template: RoomTemplate, position: Position, settings: GenerationSettings, occupiedPositions: Set<string>): boolean {
	if (position.x + template.width >= settings.gridSize ||
			position.y + template.height >= settings.gridSize) {
		return false;
	}

	const padding = settings.roomSpacing;
	for (let x = position.x - padding; x < position.x + template.width + padding; x++) {
		for (let y = position.y - padding; y < position.y + template.height + padding; y++) {
			if (occupiedPositions.has(`${x},${y}`)) {
				return false;
			}
		}
	}

	return true;
}

function findValidRoomPosition(template: RoomTemplate, settings: GenerationSettings, occupiedPositions: Set<string>): Position | null {
	const attempts = 50;

	for (let i = 0; i < attempts; i++) {
		const position: Position = {
			x: Math.floor(Math.random() * (settings.gridSize - template.width - 2)) + 1,
			y: Math.floor(Math.random() * (settings.gridSize - template.height - 2)) + 1,
		};

		if (isValidRoomPosition(template, position, settings, occupiedPositions)) {
			return position;
		}
	}

	return null;
}

function createRoomFromTemplate(template: RoomTemplate, position: Position): Room {
	const connectionPoints: ConnectionPoint[] = template.connectionPoints.map(cp => ({
		...cp,
		position: {
			x: position.x + cp.position.x,
			y: position.y + cp.position.y,
		},
	}));

	return {
		id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		shape: template.shape,
		type: template.type,
		size: template.size,
		position,
		width: template.width,
		height: template.height,
		connectionPoints,
		templateId: template.id,
	};
}

function markRoomAsOccupied(state: DungeonState, room: Room): void {
	for (let x = room.position.x; x < room.position.x + room.width; x++) {
		for (let y = room.position.y; y < room.position.y + room.height; y++) {
			state.occupiedPositions.add(`${x},${y}`);
		}
	}

	state.corridorGenerator.markRoomAsOccupied(room);
}

function generateMainRooms(state: DungeonState, settings: GenerationSettings, count: number): void {
	let attempts = 0;
	const maxAttempts = count * 10;

	while (state.rooms.length < count && attempts < maxAttempts) {
		attempts++;

		const template = getRandomRoomTemplate(RoomType.Standard);
		const position = findValidRoomPosition(template, settings, state.occupiedPositions);

		if (position) {
			const room = createRoomFromTemplate(template, position);
			state.rooms.push(room);
			markRoomAsOccupied(state, room);
		}
	}
}

function markCorridorConnectionPoint(corridor: Corridor, targetPosition: Position): void {
	for (const cp of corridor.connectionPoints) {
		if (cp.position.x === targetPosition.x && cp.position.y === targetPosition.y) {
			connectConnectionPoint(cp, corridor.id);
			break;
		}
	}
}

function markCorridorConnectionsBetween(corridor1: Corridor, corridor2: Corridor): void {
	for (const cp1 of corridor1.connectionPoints) {
		for (const cp2 of corridor2.connectionPoints) {
			if (cp1.position.x === cp2.position.x && cp1.position.y === cp2.position.y) {
				connectConnectionPoint(cp1, corridor2.id);
				connectConnectionPoint(cp2, corridor1.id);
			}
		}
	}
}

function linkCorridorToRooms(corridorSegments: Corridor[], roomPoint1: ConnectionPoint, roomPoint2: ConnectionPoint): void {
	if (corridorSegments.length === 0) return;

	const firstCorridor = corridorSegments[0];
	const lastCorridor = corridorSegments[corridorSegments.length - 1];

	if (firstCorridor) {
		markCorridorConnectionPoint(firstCorridor, roomPoint1.position);
	}
	if (lastCorridor) {
		markCorridorConnectionPoint(lastCorridor, roomPoint2.position);
	}

	for (let i = 0; i < corridorSegments.length - 1; i++) {
		const currentCorridor = corridorSegments[i];
		const nextCorridor = corridorSegments[i + 1];

		if (currentCorridor && nextCorridor) {
			markCorridorConnectionsBetween(currentCorridor, nextCorridor);
		}
	}
}

function connectTwoRooms(state: DungeonState, room1: Room, room2: Room): void {
	let bestConnection: {
		point1: ConnectionPoint;
		point2: ConnectionPoint;
		distance: number;
	} | null = null;

	for (const cp1 of room1.connectionPoints) {
		if (isConnectionPointConnected(cp1)) continue;

		for (const cp2 of room2.connectionPoints) {
			if (isConnectionPointConnected(cp2)) continue;

			const distance = calculateDistance(cp1.position, cp2.position);

			if (!bestConnection || distance < bestConnection.distance) {
				bestConnection = {
					point1: cp1,
					point2: cp2,
					distance,
				};
			}
		}
	}

	if (bestConnection) {
		const corridorSegments = state.corridorGenerator.generateCorridor(
			bestConnection.point1.position,
			bestConnection.point2.position
		);

		if (corridorSegments.length > 0) {
			state.corridors.push(...corridorSegments);

			const firstCorridor = corridorSegments[0];
			const lastCorridor = corridorSegments[corridorSegments.length - 1];
			if (firstCorridor && lastCorridor) {
				connectConnectionPoint(bestConnection.point1, firstCorridor.id);
				connectConnectionPoint(bestConnection.point2, lastCorridor.id);
			}

			linkCorridorToRooms(corridorSegments, bestConnection.point1, bestConnection.point2);
		}
	}
}

function connectRoomsWithCorridors(state: DungeonState): void {
	if (state.rooms.length < 2) return;

	const connectedRooms = new Set<string>();
	const firstRoom = state.rooms[0];
	if (!firstRoom) {
		throw new Error('No rooms available for connection');
	}
	connectedRooms.add(firstRoom.id);

	while (connectedRooms.size < state.rooms.length) {
		let bestConnection: { from: Room; to: Room; distance: number } | null = null;

		for (const unconnectedRoom of state.rooms) {
			if (connectedRooms.has(unconnectedRoom.id)) continue;

			for (const connectedRoom of state.rooms) {
				if (!connectedRooms.has(connectedRoom.id)) continue;

				const distance = calculateDistance(
					unconnectedRoom.position,
					connectedRoom.position
				);

				if (!bestConnection || distance < bestConnection.distance) {
					bestConnection = {
						from: connectedRoom,
						to: unconnectedRoom,
						distance,
					};
				}
			}
		}

		if (bestConnection) {
			connectTwoRooms(state, bestConnection.from, bestConnection.to);
			connectedRooms.add(bestConnection.to.id);
		} else {
			break;
		}
	}

	const additionalConnections = Math.floor(state.rooms.length / 3);
	for (let i = 0; i < additionalConnections; i++) {
		const room1 = state.rooms[Math.floor(Math.random() * state.rooms.length)];
		const room2 = state.rooms[Math.floor(Math.random() * state.rooms.length)];

		if (room1 && room2 && room1.id !== room2.id) {
			connectTwoRooms(state, room1, room2);
		}
	}
}

function getRandomDirection(): { x: number; y: number } {
	const directions = [
		{ x: 0, y: -1 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
		{ x: -1, y: 0 },
	];

	const direction = directions[Math.floor(Math.random() * directions.length)];

	if(!direction) throw Error('Direction undefined')

	return direction;
}

function isValidPosition(position: Position, settings: GenerationSettings): boolean {
	return position.x >= 0 &&
		position.x < settings.gridSize &&
		position.y >= 0 &&
		position.y < settings.gridSize;
}

function addExplorationCorridors(state: DungeonState, settings: GenerationSettings): void {
	const explorationCount = Math.floor(state.rooms.length / 2);

	for (let i = 0; i < explorationCount; i++) {
		const availablePoints: { room: Room; point: ConnectionPoint }[] = [];

		for (const room of state.rooms) {
			for (const cp of room.connectionPoints) {
				if (!isConnectionPointConnected(cp)) {
					availablePoints.push({ room, point: cp });
				}
			}
		}

		if (availablePoints.length > 0) {
			const selected = availablePoints[Math.floor(Math.random() * availablePoints.length)];

			if(!selected) throw Error("'selected' undefined");

			const deadEndLength = 3 + Math.floor(Math.random() * 5);
			const direction = getRandomDirection();

			const endPosition: Position = {
				x: selected.point.position.x + (direction.x * deadEndLength),
				y: selected.point.position.y + (direction.y * deadEndLength),
			};

			if (isValidPosition(endPosition, settings)) {
				const corridorSegments = state.corridorGenerator.generateCorridor(
					selected.point.position,
					endPosition
				);

				const [corridorSegment] = corridorSegments;
				if (corridorSegment) {
					state.corridors.push(...corridorSegments);
					connectConnectionPoint(selected.point, corridorSegment.id);

					markCorridorConnectionPoint(corridorSegment, selected.point.position);
				}
			}
		}
	}
}

function createDungeonMap(state: DungeonState, settings: GenerationSettings): DungeonMap {
	return {
		id: `geomorph-dungeon-${Date.now()}`,
		name: `Geomorph Dungeon ${new Date().toLocaleDateString()}`,
		rooms: state.rooms,
		corridors: state.corridors,
		entranceDoor: state.entranceDoor,
		createdAt: new Date(),
		gridSize: settings.gridSize,
		totalRooms: state.rooms.length,
	};
}

export function generateGeomorphDungeon(settings: GenerationSettings): DungeonMap {
	const state = createInitialState(settings);

	const targetRoomCount = determineRoomCount(settings);
	generateMainRooms(state, settings, targetRoomCount);

	connectRoomsWithCorridors(state);

	addExplorationCorridors(state, settings);

	createExteriorEntrance(state, settings);

	return createDungeonMap(state, settings);
}