import type { Corridor, MergedCorridor, Position, ConnectionPoint } from '../types';

function positionKey(pos: Position): string {
	return `${pos.x},${pos.y}`;
}

function areCorridorsConnected(corridor1: Corridor, corridor2: Corridor, spatialIndex: Map<string, Set<string>>): boolean {
	// Check if corridors share any positions - simplified approach
	// since pathfinding creates continuous paths where connected corridors
	// will share at least one position
	for (const pos of corridor1.path) {
		const key = positionKey(pos);
		const corridorsAtPosition = spatialIndex.get(key);
		if (corridorsAtPosition?.has(corridor2.id)) {
			return true;
		}
	}
	return false;
}

function buildSpatialIndex(corridors: Corridor[]): Map<string, Set<string>> {
	const spatialIndex = new Map<string, Set<string>>();

	for (const corridor of corridors) {
		for (const pos of corridor.path) {
			const key = positionKey(pos);
			if (!spatialIndex.has(key)) {
				spatialIndex.set(key, new Set());
			}
			spatialIndex.get(key)!.add(corridor.id);
		}
	}

	return spatialIndex;
}

function findConnectedGroups(corridors: Corridor[]): Corridor[][] {
	const visited = new Set<string>();
	const groups: Corridor[][] = [];
	const spatialIndex = buildSpatialIndex(corridors);

	function dfs(corridor: Corridor, currentGroup: Corridor[]) {
		if (visited.has(corridor.id)) return;

		visited.add(corridor.id);
		currentGroup.push(corridor);

		// Find all connected corridors
		for (const otherCorridor of corridors) {
			if (!visited.has(otherCorridor.id) && areCorridorsConnected(corridor, otherCorridor, spatialIndex)) {
				dfs(otherCorridor, currentGroup);
			}
		}
	}

	for (const corridor of corridors) {
		if (!visited.has(corridor.id)) {
			const group: Corridor[] = [];
			dfs(corridor, group);
			groups.push(group);
		}
	}

	return groups;
}

function mergePaths(corridors: Corridor[]): Position[] {
	const allPositions = new Set<string>();
	const positionMap = new Map<string, Position>();

	// Collect all unique positions
	for (const corridor of corridors) {
		for (const pos of corridor.path) {
			const key = positionKey(pos);
			if (!allPositions.has(key)) {
				allPositions.add(key);
				positionMap.set(key, pos);
			}
		}
	}

	// Convert back to position array, maintaining original position objects
	return Array.from(positionMap.values());
}

function mergeConnectionPoints(corridors: Corridor[]): ConnectionPoint[] {
	const connectionPoints: ConnectionPoint[] = [];
	const seenConnections = new Set<string>();

	for (const corridor of corridors) {
		for (const cp of corridor.connectionPoints) {
			const key = `${cp.position.x},${cp.position.y}-${cp.direction}`;
			if (!seenConnections.has(key)) {
				seenConnections.add(key);
				connectionPoints.push({ ...cp });
			}
		}
	}

	return connectionPoints;
}

function createMergedCorridor(corridors: Corridor[], groupIndex: number): MergedCorridor {
	const mergedPath = mergePaths(corridors);
	const mergedConnectionPoints = mergeConnectionPoints(corridors);

	return {
		id: `merged-corridor-${groupIndex}`,
		segments: [...corridors],
		path: mergedPath,
		connectionPoints: mergedConnectionPoints,
		// Computed properties for better type consistency
		get totalLength(): number {
			return mergedPath.length;
		},
		get segmentCount(): number {
			return corridors.length;
		},
		get boundingBox() {
			if (mergedPath.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

			let minX = mergedPath[0].x, maxX = mergedPath[0].x;
			let minY = mergedPath[0].y, maxY = mergedPath[0].y;

			for (const pos of mergedPath) {
				minX = Math.min(minX, pos.x);
				maxX = Math.max(maxX, pos.x);
				minY = Math.min(minY, pos.y);
				maxY = Math.max(maxY, pos.y);
			}

			return { minX, minY, maxX, maxY };
		}
	};
}

export function mergeAdjacentCorridors(corridors: Corridor[]): MergedCorridor[] {
	if (corridors.length === 0) return [];

	const connectedGroups = findConnectedGroups(corridors);

	return connectedGroups.map((group, index) =>
		createMergedCorridor(group, index)
	);
}