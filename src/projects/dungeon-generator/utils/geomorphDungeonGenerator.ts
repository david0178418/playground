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

export class GeomorphDungeonGenerator {
	private settings: GenerationSettings;
	private rooms: Room[] = [];
	private corridors: Corridor[] = [];
	private entranceDoor: ExteriorDoor | undefined;
	private corridorGenerator: CorridorGenerator;
	private occupiedPositions: Set<string> = new Set();

	constructor(settings: GenerationSettings) {
		this.settings = settings;
		this.corridorGenerator = new CorridorGenerator(settings.gridSize);
	}

	generateDungeon(): DungeonMap {
		this.reset();

		// Step 1: Generate main rooms (no entrance room)
		const targetRoomCount = this.determineRoomCount();
		this.generateMainRooms(targetRoomCount);

		// Step 2: Connect rooms with corridors
		this.connectRoomsWithCorridors();

		// Step 3: Add some dead-end corridors for exploration
		this.addExplorationCorridors();

		// Step 4: Create exterior entrance door
		this.createExteriorEntrance();

		return this.createDungeonMap();
	}

	private reset(): void {
		this.rooms = [];
		this.corridors = [];
		this.entranceDoor = undefined;
		this.occupiedPositions.clear();
		this.corridorGenerator = new CorridorGenerator(this.settings.gridSize);
	}

	private determineRoomCount(): number {
		const { minRooms, maxRooms } = this.settings;
		return minRooms + Math.floor(Math.random() * (maxRooms - minRooms + 1));
	}

	private createExteriorEntrance(): void {
		if (this.rooms.length === 0) return;

		// Find rooms that can be connected from map edges
		const connectableRooms = this.findConnectableRooms();

		if (connectableRooms.length === 0) {
			// Fallback: use any room if no "connectable" rooms found
			const allRooms = [...this.rooms];
			if (allRooms.length > 0) {
				this.createEntranceWithFallback(allRooms);
			}
			return;
		}

		// Try to create entrance with connectable rooms first
		for (const roomInfo of connectableRooms) {
			if (this.tryCreateEntranceForRoom(roomInfo.room, roomInfo.entrancePositions)) {
				return; // Success!
			}
		}

		// If all connectable rooms failed, try fallback
		this.createEntranceWithFallback([...this.rooms]);
	}

	private findConnectableRooms(): Array<{ room: Room; entrancePositions: Array<{ position: Position; direction: ExitDirection }> }> {
		const results: Array<{ room: Room; entrancePositions: Array<{ position: Position; direction: ExitDirection }> }> = [];

		for (const room of this.rooms) {
			const entrancePositions = this.findViableEntrancePositions(room);
			if (entrancePositions.length > 0) {
				results.push({ room, entrancePositions });
			}
		}

		// Sort by number of viable entrance positions (more options = better)
		results.sort((a, b) => b.entrancePositions.length - a.entrancePositions.length);
		return results;
	}

	private findViableEntrancePositions(room: Room): Array<{ position: Position; direction: ExitDirection }> {
		const positions: Array<{ position: Position; direction: ExitDirection }> = [];
		const roomCenter = {
			x: room.position.x + Math.floor(room.width / 2),
			y: room.position.y + Math.floor(room.height / 2)
		};

		// Check all four edges of the map
		const edgeChecks = [
			{ edge: 'north', pos: { x: roomCenter.x, y: 0 }, dir: ExitDirection.South },
			{ edge: 'south', pos: { x: roomCenter.x, y: this.settings.gridSize - 1 }, dir: ExitDirection.North },
			{ edge: 'east', pos: { x: this.settings.gridSize - 1, y: roomCenter.y }, dir: ExitDirection.West },
			{ edge: 'west', pos: { x: 0, y: roomCenter.y }, dir: ExitDirection.East },
		];

		for (const check of edgeChecks) {
			// Ensure the position is within bounds
			check.pos.x = Math.max(0, Math.min(this.settings.gridSize - 1, check.pos.x));
			check.pos.y = Math.max(0, Math.min(this.settings.gridSize - 1, check.pos.y));

			// Quick distance check - if too far, skip expensive pathfinding
			const distance = this.calculateDistance(check.pos, roomCenter);
			if (distance > this.settings.gridSize * 0.7) continue; // Skip if more than 70% of map size

			// Test if pathfinding would likely succeed (simple line-of-sight check)
			if (this.hasReasonablePath(check.pos, room)) {
				positions.push({ position: check.pos, direction: check.dir });
			}
		}

		return positions;
	}

	private hasReasonablePath(from: Position, to: Room): boolean {
		// Simple heuristic: check if there's a reasonable path
		// This is much faster than full pathfinding but gives a good estimate
		const roomCenter = {
			x: to.position.x + Math.floor(to.width / 2),
			y: to.position.y + Math.floor(to.height / 2)
		};

		// Check major obstacles along a straight line
		const dx = roomCenter.x - from.x;
		const dy = roomCenter.y - from.y;
		const steps = Math.max(Math.abs(dx), Math.abs(dy));

		if (steps === 0) return true;

		let blockedCount = 0;
		const maxBlockedAllowed = Math.floor(steps * 0.3); // Allow up to 30% blocked

		for (let i = 1; i < steps; i++) {
			const t = i / steps;
			const checkX = Math.round(from.x + dx * t);
			const checkY = Math.round(from.y + dy * t);

			if (this.occupiedPositions.has(`${checkX},${checkY}`)) {
				blockedCount++;
				if (blockedCount > maxBlockedAllowed) {
					return false;
				}
			}
		}

		return true;
	}

	private tryCreateEntranceForRoom(room: Room, entrancePositions: Array<{ position: Position; direction: ExitDirection }>): boolean {
		// Try each entrance position until one works
		for (const entrancePos of entrancePositions) {
			if (this.attemptEntranceConnection(room, entrancePos.position, entrancePos.direction)) {
				return true;
			}
		}
		return false;
	}

	private attemptEntranceConnection(room: Room, entrancePosition: Position, direction: ExitDirection): boolean {
		// Find the closest connection point on the room
		const closestConnectionPoint = this.findClosestConnectionPoint(room, entrancePosition);

		if (!closestConnectionPoint) return false;

		// Try to create a corridor
		const corridorSegments = this.corridorGenerator.generateCorridor(
			entrancePosition,
			closestConnectionPoint.position
		);

		// Check if pathfinding succeeded
		if (corridorSegments.length === 0) {
			return false; // Pathfinding failed
		}

		// Success! Create the entrance
		this.entranceDoor = {
			position: entrancePosition,
			direction: direction,
			connectedElementId: room.id,
		};

		this.corridors.push(...corridorSegments);

		// Mark connection point as connected if it wasn't already
		if (!isConnectionPointConnected(closestConnectionPoint)) {
			connectConnectionPoint(closestConnectionPoint, this.entranceDoor.connectedElementId!);
		}

		return true;
	}

	private createEntranceWithFallback(rooms: Room[]): void {
		// Last resort: try to force a connection with the closest room
		let closestRoom: Room | null = null;
		let closestDistance = Infinity;

		// Find the room closest to any map edge
		for (const room of rooms) {
			const roomCenter = {
				x: room.position.x + Math.floor(room.width / 2),
				y: room.position.y + Math.floor(room.height / 2)
			};

			// Check distance to all edges
			const distances = [
				roomCenter.y, // distance to north edge
				this.settings.gridSize - 1 - roomCenter.y, // distance to south edge
				roomCenter.x, // distance to west edge
				this.settings.gridSize - 1 - roomCenter.x, // distance to east edge
			];

			const minDistanceToEdge = Math.min(...distances);
			if (minDistanceToEdge < closestDistance) {
				closestDistance = minDistanceToEdge;
				closestRoom = room;
			}
		}

		if (!closestRoom) return;

		// Force create an entrance close to this room
		const roomCenter = {
			x: closestRoom.position.x + Math.floor(closestRoom.width / 2),
			y: closestRoom.position.y + Math.floor(closestRoom.height / 2)
		};

		// Find the closest edge and create entrance there
		const edgeOptions = [
			{ pos: { x: roomCenter.x, y: 0 }, dir: ExitDirection.South },
			{ pos: { x: roomCenter.x, y: this.settings.gridSize - 1 }, dir: ExitDirection.North },
			{ pos: { x: 0, y: roomCenter.y }, dir: ExitDirection.East },
			{ pos: { x: this.settings.gridSize - 1, y: roomCenter.y }, dir: ExitDirection.West },
		];

		// Sort by distance to room center
		edgeOptions.sort((a, b) => {
			const distA = this.calculateDistance(a.pos, roomCenter);
			const distB = this.calculateDistance(b.pos, roomCenter);
			return distA - distB;
		});

		// Create entrance at closest edge
		const bestEdge = edgeOptions[0];
		if (!bestEdge) {
			throw new Error('No valid edge options for entrance creation');
		}
		this.entranceDoor = {
			position: bestEdge.pos,
			direction: bestEdge.dir,
			connectedElementId: closestRoom.id,
		};

		// Force create a connection (may create overlapping corridors, but ensures connection)
		this.forceEntranceConnection(this.entranceDoor, closestRoom);
	}

	private forceEntranceConnection(entrance: ExteriorDoor, room: Room): void {
		// This is a fallback that creates a direct connection, possibly overlapping other elements
		const closestConnectionPoint = this.findClosestConnectionPoint(room, entrance.position);

		if (!closestConnectionPoint) return;

		// Create a simple direct corridor (may overlap, but ensures connection)
		const start = entrance.position;
		const end = closestConnectionPoint.position;

		// Create corridor segments in a simple L-shape
		const corridorSegments: Corridor[] = [];

		if (start.x !== end.x) {
			// Horizontal segment
			const horizontalId = `corridor-entrance-h-${Date.now()}`;
			corridorSegments.push({
				id: horizontalId,
				type: CorridorType.Straight,
				direction: CorridorDirection.Horizontal,
				position: { x: Math.min(start.x, end.x), y: start.y },
				length: Math.abs(end.x - start.x) + 1,
				width: 1,
				connectionPoints: [],
				path: this.createLinearPath(
					{ x: start.x, y: start.y },
					{ x: end.x, y: start.y }
				)
			});
		}

		if (start.y !== end.y) {
			// Vertical segment
			const verticalId = `corridor-entrance-v-${Date.now()}`;
			corridorSegments.push({
				id: verticalId,
				type: CorridorType.Straight,
				direction: CorridorDirection.Vertical,
				position: { x: end.x, y: Math.min(start.y, end.y) },
				length: Math.abs(end.y - start.y) + 1,
				width: 1,
				connectionPoints: [],
				path: this.createLinearPath(
					{ x: end.x, y: start.y },
					{ x: end.x, y: end.y }
				)
			});
		}

		this.corridors.push(...corridorSegments);

		if (!isConnectionPointConnected(closestConnectionPoint)) {
			connectConnectionPoint(closestConnectionPoint, 'entrance-corridor');
		}
	}

	private createLinearPath(start: Position, end: Position): Position[] {
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

	private findClosestConnectionPoint(room: Room, position: Position): ConnectionPoint | null {
		let closestConnectionPoint: ConnectionPoint | null = null;
		let minDistance = Infinity;
		let foundUnconnected = false;

		// First pass: try to find an unconnected connection point
		for (const cp of room.connectionPoints) {
			if (!isConnectionPointConnected(cp)) {
				const distance = this.calculateDistance(position, cp.position);
				if (distance < minDistance) {
					minDistance = distance;
					closestConnectionPoint = cp;
					foundUnconnected = true;
				}
			}
		}

		// Second pass: if no unconnected points, use the closest connected one
		if (!foundUnconnected) {
			minDistance = Infinity;
			for (const cp of room.connectionPoints) {
				const distance = this.calculateDistance(position, cp.position);
				if (distance < minDistance) {
					minDistance = distance;
					closestConnectionPoint = cp;
				}
			}
		}

		return closestConnectionPoint;
	}

	private generateMainRooms(count: number): void {
		let attempts = 0;
		const maxAttempts = count * 10;

		while (this.rooms.length < count && attempts < maxAttempts) {
			attempts++;
			
			const template = getRandomRoomTemplate(RoomType.Standard);
			const position = this.findValidRoomPosition(template);
			
			if (position) {
				const room = this.createRoomFromTemplate(template, position);
				this.rooms.push(room);
				this.markRoomAsOccupied(room);
			}
		}
	}

	private findValidRoomPosition(template: RoomTemplate): Position | null {
		const attempts = 50;
		
		for (let i = 0; i < attempts; i++) {
			const position: Position = {
				x: Math.floor(Math.random() * (this.settings.gridSize - template.width - 2)) + 1,
				y: Math.floor(Math.random() * (this.settings.gridSize - template.height - 2)) + 1,
			};
			
			if (this.isValidRoomPosition(template, position)) {
				return position;
			}
		}
		
		return null;
	}

	private isValidRoomPosition(template: RoomTemplate, position: Position): boolean {
		// Check bounds
		if (position.x + template.width >= this.settings.gridSize || 
				position.y + template.height >= this.settings.gridSize) {
			return false;
		}

		// Check for overlaps with some padding
		const padding = this.settings.roomSpacing;
		for (let x = position.x - padding; x < position.x + template.width + padding; x++) {
			for (let y = position.y - padding; y < position.y + template.height + padding; y++) {
				if (this.occupiedPositions.has(`${x},${y}`)) {
					return false;
				}
			}
		}

		return true;
	}

	private createRoomFromTemplate(template: RoomTemplate, position: Position): Room {
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

	private markRoomAsOccupied(room: Room): void {
		// Mark all grid squares occupied by this room
		for (let x = room.position.x; x < room.position.x + room.width; x++) {
			for (let y = room.position.y; y < room.position.y + room.height; y++) {
				this.occupiedPositions.add(`${x},${y}`);
			}
		}
		
		// Also tell the corridor generator
		this.corridorGenerator.markRoomAsOccupied(room);
	}

	private connectRoomsWithCorridors(): void {
		if (this.rooms.length < 2) return;

		// Connect all rooms to ensure reachability
		const connectedRooms = new Set<string>();
		const firstRoom = this.rooms[0];
		if (!firstRoom) {
			throw new Error('No rooms available for connection');
		}
		connectedRooms.add(firstRoom.id); // Start with first room

		// Connect each unconnected room to the nearest connected room
		while (connectedRooms.size < this.rooms.length) {
			let bestConnection: { from: Room; to: Room; distance: number } | null = null;

			for (const unconnectedRoom of this.rooms) {
				if (connectedRooms.has(unconnectedRoom.id)) continue;

				for (const connectedRoom of this.rooms) {
					if (!connectedRooms.has(connectedRoom.id)) continue;

					const distance = this.calculateDistance(
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
				this.connectTwoRooms(bestConnection.from, bestConnection.to);
				connectedRooms.add(bestConnection.to.id);
			} else {
				break; // Safety break
			}
		}

		// Add some additional connections for more interesting layout
		const additionalConnections = Math.floor(this.rooms.length / 3);
		for (let i = 0; i < additionalConnections; i++) {
			const room1 = this.rooms[Math.floor(Math.random() * this.rooms.length)];
			const room2 = this.rooms[Math.floor(Math.random() * this.rooms.length)];

			if (room1 && room2 && room1.id !== room2.id) {
				this.connectTwoRooms(room1, room2);
			}
		}
	}

	private connectTwoRooms(room1: Room, room2: Room): void {
		// Find closest connection points between rooms
		let bestConnection: {
			point1: ConnectionPoint;
			point2: ConnectionPoint;
			distance: number;
		} | null = null;

		for (const cp1 of room1.connectionPoints) {
			if (isConnectionPointConnected(cp1)) continue;
			
			for (const cp2 of room2.connectionPoints) {
				if (isConnectionPointConnected(cp2)) continue;
				
				const distance = this.calculateDistance(cp1.position, cp2.position);
				
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
			// Generate corridor between connection points
			const corridorSegments = this.corridorGenerator.generateCorridor(
				bestConnection.point1.position,
				bestConnection.point2.position
			);

			// Only proceed if corridor generation was successful
			if (corridorSegments.length > 0) {
				// Add corridors to the dungeon
				this.corridors.push(...corridorSegments);

				// Mark connection points as connected
				const firstCorridor = corridorSegments[0];
				const lastCorridor = corridorSegments[corridorSegments.length - 1];
				if (firstCorridor && lastCorridor) {
					connectConnectionPoint(bestConnection.point1, firstCorridor.id);
					connectConnectionPoint(bestConnection.point2, lastCorridor.id);
				}

				// Link corridor endpoints to room connection points
				this.linkCorridorToRooms(corridorSegments, bestConnection.point1, bestConnection.point2);
			}
		}
	}

	private linkCorridorToRooms(corridorSegments: Corridor[], roomPoint1: ConnectionPoint, roomPoint2: ConnectionPoint): void {
		if (corridorSegments.length === 0) return;

		const firstCorridor = corridorSegments[0];
		const lastCorridor = corridorSegments[corridorSegments.length - 1];

		// Find and mark corridor connection points that connect to room points
		if (firstCorridor) {
			this.markCorridorConnectionPoint(firstCorridor, roomPoint1.position);
		}
		if (lastCorridor) {
			this.markCorridorConnectionPoint(lastCorridor, roomPoint2.position);
		}

		// Also mark intermediate corridor connections
		for (let i = 0; i < corridorSegments.length - 1; i++) {
			const currentCorridor = corridorSegments[i];
			const nextCorridor = corridorSegments[i + 1];

			// Find connection points between adjacent corridors
			if (currentCorridor && nextCorridor) {
				this.markCorridorConnectionsBetween(currentCorridor, nextCorridor);
			}
		}
	}

	private markCorridorConnectionPoint(corridor: Corridor, targetPosition: Position): void {
		for (const cp of corridor.connectionPoints) {
			if (cp.position.x === targetPosition.x && cp.position.y === targetPosition.y) {
				connectConnectionPoint(cp, corridor.id);
				break;
			}
		}
	}

	private markCorridorConnectionsBetween(corridor1: Corridor, corridor2: Corridor): void {
		// Find connection points between two adjacent corridors
		for (const cp1 of corridor1.connectionPoints) {
			for (const cp2 of corridor2.connectionPoints) {
				if (cp1.position.x === cp2.position.x && cp1.position.y === cp2.position.y) {
					connectConnectionPoint(cp1, corridor2.id);
					connectConnectionPoint(cp2, corridor1.id);
				}
			}
		}
	}

	private calculateDistance(pos1: Position, pos2: Position): number {
		return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
	}

	private addExplorationCorridors(): void {
		// Add some dead-end corridors and additional branches
		const explorationCount = Math.floor(this.rooms.length / 2);
		
		for (let i = 0; i < explorationCount; i++) {
			// Find an unconnected connection point
			const availablePoints: { room: Room; point: ConnectionPoint }[] = [];
			
			for (const room of this.rooms) {
				for (const cp of room.connectionPoints) {
					if (!isConnectionPointConnected(cp)) {
						availablePoints.push({ room, point: cp });
					}
				}
			}

			if (availablePoints.length > 0) {
				const selected = availablePoints[Math.floor(Math.random() * availablePoints.length)];

				if(!selected) throw Error("'selected' undefined");
				
				// Create a short dead-end corridor
				const deadEndLength = 3 + Math.floor(Math.random() * 5);
				const direction = this.getRandomDirection();
				
				const endPosition: Position = {
					x: selected.point.position.x + (direction.x * deadEndLength),
					y: selected.point.position.y + (direction.y * deadEndLength),
				};

				// Check if the dead-end position is valid
				if (this.isValidPosition(endPosition)) {
					const corridorSegments = this.corridorGenerator.generateCorridor(
						selected.point.position,
						endPosition
					);

					// Only proceed if corridor generation was successful
					const [corridorSegment] = corridorSegments;
					if (corridorSegment) {
						this.corridors.push(...corridorSegments);
						connectConnectionPoint(selected.point, corridorSegment.id);

						// Mark the first corridor's connection point that connects to the room
						this.markCorridorConnectionPoint(corridorSegment, selected.point.position);
					}
				}
			}
		}
	}

	private getRandomDirection(): { x: number; y: number } {
		const directions = [
			{ x: 0, y: -1 }, // North
			{ x: 1, y: 0 },	// East
			{ x: 0, y: 1 },	// South
			{ x: -1, y: 0 }, // West
		];
		
		const direction = directions[Math.floor(Math.random() * directions.length)];

		if(!direction) throw Error('Direction undefined')

		return direction;
	}

	private isValidPosition(position: Position): boolean {
		return position.x >= 0 && 
			position.x < this.settings.gridSize && 
			position.y >= 0 && 
			position.y < this.settings.gridSize;
	}

	private createDungeonMap(): DungeonMap {
		return {
			id: `geomorph-dungeon-${Date.now()}`,
			name: `Geomorph Dungeon ${new Date().toLocaleDateString()}`,
			rooms: this.rooms,
			corridors: this.corridors,
			entranceDoor: this.entranceDoor,
			createdAt: new Date(),
			gridSize: this.settings.gridSize,
			totalRooms: this.rooms.length,
		};
	}
}

export function generateGeomorphDungeon(settings: GenerationSettings): DungeonMap {
	const generator = new GeomorphDungeonGenerator(settings);
	return generator.generateDungeon();
}