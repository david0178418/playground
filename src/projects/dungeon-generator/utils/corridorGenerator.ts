import type {
	Corridor,
	Position,
} from '../types';
import {
	CorridorType,
	CorridorDirection,
	ExitDirection,
} from '../types';

export interface PathfindingNode {
	position: Position;
	gCost: number;
	hCost: number;
	fCost: number;
	parent?: PathfindingNode;
}

function calculateHeuristic(from: Position, to: Position): number {
	return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
}

function isValidPosition(position: Position, gridSize: number): boolean {
	return (
		position.x >= 0 &&
		position.x < gridSize &&
		position.y >= 0 &&
		position.y < gridSize
	);
}

function isBlocked(position: Position, start: Position, end: Position, occupiedPositions: Set<string>): boolean {
	const positionKey = `${position.x},${position.y}`;

	if ((position.x === start.x && position.y === start.y) ||
			(position.x === end.x && position.y === end.y)) {
		return false;
	}

	return occupiedPositions.has(positionKey);
}

function getNeighbors(position: Position, gridSize: number): Position[] {
	const neighbors: Position[] = [];
	const directions = [
		{ x: 0, y: -1 }, // North
		{ x: 1, y: 0 },	// East
		{ x: 0, y: 1 },	// South
		{ x: -1, y: 0 }, // West
	];

	for (const dir of directions) {
		const newPos = {
			x: position.x + dir.x,
			y: position.y + dir.y,
		};

		if (isValidPosition(newPos, gridSize)) {
			neighbors.push(newPos);
		}
	}

	return neighbors;
}

function reconstructPath(node: PathfindingNode): Position[] {
	const path: Position[] = [];
	let current: PathfindingNode | undefined = node;

	while (current) {
		path.unshift(current.position);
		current = current.parent;
	}

	return path;
}

function findPath(start: Position, end: Position, occupiedPositions: Set<string>, gridSize: number): Position[] {
	const openSet: PathfindingNode[] = [];
	const closedSet: Set<string> = new Set();

	const startNode: PathfindingNode = {
		position: start,
		gCost: 0,
		hCost: calculateHeuristic(start, end),
		fCost: 0,
	};
	startNode.fCost = startNode.gCost + startNode.hCost;

	openSet.push(startNode);

	while (openSet.length > 0) {
		const firstNode = openSet[0];
		if (!firstNode) {
			throw new Error('Pathfinding error: openSet corrupted');
		}
		let currentNode = firstNode;
		let currentIndex = 0;

		for (let i = 1; i < openSet.length; i++) {
			const node = openSet[i];
			if (!node) {
				throw new Error('Pathfinding error: openSet corrupted');
			}
			if (node.fCost < currentNode.fCost) {
				currentNode = node;
				currentIndex = i;
			}
		}

		openSet.splice(currentIndex, 1);
		const positionKey = `${currentNode.position.x},${currentNode.position.y}`;
		closedSet.add(positionKey);

		if (currentNode.position.x === end.x && currentNode.position.y === end.y) {
			return reconstructPath(currentNode);
		}

		const neighbors = getNeighbors(currentNode.position, gridSize);

		for (const neighbor of neighbors) {
			const neighborKey = `${neighbor.x},${neighbor.y}`;

			if (closedSet.has(neighborKey) || isBlocked(neighbor, start, end, occupiedPositions)) {
				continue;
			}

			const gCost = currentNode.gCost + 1;
			const hCost = calculateHeuristic(neighbor, end);
			const fCost = gCost + hCost;

			const existingNode = openSet.find(node =>
				node.position.x === neighbor.x && node.position.y === neighbor.y
			);

			if (!existingNode) {
				openSet.push({
					position: neighbor,
					gCost,
					hCost,
					fCost,
					parent: currentNode,
				});
			} else if (gCost < existingNode.gCost) {
				existingNode.gCost = gCost;
				existingNode.fCost = gCost + existingNode.hCost;
				existingNode.parent = currentNode;
			}
		}
	}

	return [];
}

function getDirection(from: Position, to: Position): CorridorDirection {
	if (to.x > from.x) return CorridorDirection.Horizontal;
	if (to.x < from.x) return CorridorDirection.Horizontal;
	if (to.y > from.y) return CorridorDirection.Vertical;
	if (to.y < from.y) return CorridorDirection.Vertical;
	return CorridorDirection.Horizontal;
}

function positionToExitDirection(from: Position, to: Position): ExitDirection {
	const dx = to.x - from.x;
	const dy = to.y - from.y;

	if (Math.abs(dx) > Math.abs(dy)) {
		return dx > 0 ? ExitDirection.East : ExitDirection.West;
	} else {
		return dy > 0 ? ExitDirection.South : ExitDirection.North;
	}
}

function createCorridorFromPath(path: Position[]): Corridor | null {
	if (path.length < 2) return null;

	const start = path[0];
	const end = path[path.length - 1];
	if (!start || !end) {
		throw new Error('Corridor creation error: invalid path endpoints');
	}
	const direction = getDirection(start, end);
	const length = path.length;

	const corridor: Corridor = {
		id: `corridor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		type: CorridorType.Straight,
		direction,
		position: start,
		length,
		width: 1,
		connectionPoints: [
			{
				direction: positionToExitDirection(start, end),
				position: start,
			},
			{
				direction: positionToExitDirection(end, start),
				position: end,
			},
		],
		path,
	};

	return corridor;
}

function pathToCorridors(path: Position[], occupiedPositions: Set<string>): Corridor[] {
	if (path.length < 2) return [];

	const corridors: Corridor[] = [];
	let currentSegmentStart = 0;

	for (let i = 1; i < path.length; i++) {
		const current = path[i];
		const previous = path[i - 1];
		if (!current || !previous) {
			throw new Error('Path generation error: invalid path structure');
		}
		const next = i + 1 < path.length ? path[i + 1] : null;

		const shouldCreateSegment = !next ||
			(next && getDirection(previous, current) !== getDirection(current, next));
		if (shouldCreateSegment) {
			const segmentPath = path.slice(currentSegmentStart, i + 1);
			const corridor = createCorridorFromPath(segmentPath);
			if (corridor) {
				corridors.push(corridor);
				for (const pos of segmentPath) {
					occupiedPositions.add(`${pos.x},${pos.y}`);
				}
			}
			currentSegmentStart = i;
		}
	}

	return corridors;
}

export function generateCorridor(start: Position, end: Position, occupiedPositions: Set<string>, gridSize: number): Corridor[] {
	const path = findPath(start, end, occupiedPositions, gridSize);
	if (path.length === 0) {
		return [];
	}

	return pathToCorridors(path, occupiedPositions);
}
