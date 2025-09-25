import type { Room, Dungeon } from '../models/Room';
import { Direction, RoomType } from '../models/Room';
import { RandomGenerator } from '../utils/RandomGenerator';
import { EnemyGenerator } from './EnemyGenerator';
import { ItemGenerator } from './ItemGenerator';

export class DungeonGenerator {
	private rng: RandomGenerator;
	private enemyGenerator: EnemyGenerator;
	private itemGenerator: ItemGenerator;

	constructor(rng: RandomGenerator) {
		this.rng = rng;
		this.enemyGenerator = new EnemyGenerator(rng);
		this.itemGenerator = new ItemGenerator(rng);
	}

	generateDungeon(size: number = 15): Dungeon {
		const rooms = new Map<string, Room>();

		// Start with entrance room at (0,0)
		const entranceRoom = this.createRoom("entrance", 0, 0, RoomType.ENTRANCE);
		rooms.set(entranceRoom.id, entranceRoom);

		// Use recursive backtracking to generate connected rooms
		const roomPositions = new Set<string>();
		roomPositions.add("0,0");

		this.generateRoomsRecursively(
			rooms,
			roomPositions,
			entranceRoom,
			size - 1,
			0
		);

		// Place special rooms and content
		this.placeSpecialRooms(rooms);
		this.distributeContent(rooms, entranceRoom.id);

		return {
			id: `dungeon-${Date.now()}`,
			seed: this.rng.toString(),
			rooms,
			entranceRoomId: entranceRoom.id
		};
	}

	private generateRoomsRecursively(
		rooms: Map<string, Room>,
		roomPositions: Set<string>,
		currentRoom: Room,
		remainingRooms: number,
		depth: number
	): void {
		if (remainingRooms <= 0) return;

		const directions = this.shuffleDirections();
		const maxBranches = Math.max(1, 4 - depth); // Fewer branches as we go deeper

		for (const direction of directions) {
			if (remainingRooms <= 0) break;

			const { x, y } = this.getAdjacentCoordinates(currentRoom.coordinates, direction);
			const positionKey = `${x},${y}`;

			if (roomPositions.has(positionKey)) continue;

			// Probability of creating a room decreases with depth
			const roomProbability = Math.max(0.3, 1 - (depth * 0.1));
			if (!this.rng.chance(roomProbability)) continue;

			// Create new room
			const roomType = depth > 5 ? this.selectSpecialRoomType() : RoomType.CHAMBER;
			const newRoom = this.createRoom(`room-${x}-${y}`, x, y, roomType);

			rooms.set(newRoom.id, newRoom);
			roomPositions.add(positionKey);

			// Connect the rooms
			currentRoom.exits.set(direction, newRoom.id);
			newRoom.exits.set(this.getOppositeDirection(direction), currentRoom.id);

			remainingRooms--;

			// Recursively generate from this room (but limit branching)
			if (depth < 8 && remainingRooms > 0) {
				this.generateRoomsRecursively(
					rooms,
					roomPositions,
					newRoom,
					Math.min(remainingRooms, maxBranches),
					depth + 1
				);
			}
		}
	}

	private createRoom(id: string, x: number, y: number, roomType: RoomType): Room {
		return {
			id,
			coordinates: { x, y },
			exits: new Map<Direction, string>(),
			roomType,
			description: {
				template: this.getRoomTemplate(roomType)
			},
			contents: {
				enemies: [],
				items: [],
				features: [],
				searched: false
			},
			visited: false
		};
	}

	private getRoomTemplate(roomType: RoomType): string {
		switch (roomType) {
			case RoomType.ENTRANCE:
				return "dungeon_entrance";
			case RoomType.CORRIDOR:
				return "narrow_corridor";
			case RoomType.CHAMBER:
				return "stone_chamber";
			case RoomType.ARMORY:
				return "old_armory";
			case RoomType.LIBRARY:
				return "ancient_library";
			case RoomType.THRONE_ROOM:
				return "grand_throne_room";
			case RoomType.TREASURE_ROOM:
				return "treasure_chamber";
			default:
				return "generic_room";
		}
	}

	private selectSpecialRoomType(): RoomType {
		const specialRooms = [
			RoomType.ARMORY,
			RoomType.LIBRARY,
			RoomType.CHAMBER,
			RoomType.CHAMBER, // More likely to get chambers
			RoomType.GENERIC
		];
		return this.rng.choose(specialRooms);
	}

	private shuffleDirections(): Direction[] {
		const directions = [Direction.NORTH, Direction.SOUTH, Direction.EAST, Direction.WEST];
		return this.rng.shuffle(directions);
	}

	private getAdjacentCoordinates(current: { x: number; y: number }, direction: Direction) {
		switch (direction) {
			case Direction.NORTH:
				return { x: current.x, y: current.y - 1 };
			case Direction.SOUTH:
				return { x: current.x, y: current.y + 1 };
			case Direction.EAST:
				return { x: current.x + 1, y: current.y };
			case Direction.WEST:
				return { x: current.x - 1, y: current.y };
			default:
				throw new Error(`Invalid direction: ${direction}`);
		}
	}

	private getOppositeDirection(direction: Direction): Direction {
		switch (direction) {
			case Direction.NORTH:
				return Direction.SOUTH;
			case Direction.SOUTH:
				return Direction.NORTH;
			case Direction.EAST:
				return Direction.WEST;
			case Direction.WEST:
				return Direction.EAST;
			default:
				throw new Error(`Invalid direction: ${direction}`);
		}
	}

	private placeSpecialRooms(rooms: Map<string, Room>): void {
		const roomArray = Array.from(rooms.values());

		// Find the room furthest from entrance for boss/treasure
		const entranceRoom = roomArray.find(r => r.roomType === RoomType.ENTRANCE);
		if (!entranceRoom) return;

		let furthestRoom = entranceRoom;
		let maxDistance = 0;

		for (const room of roomArray) {
			const distance = Math.abs(room.coordinates.x - entranceRoom.coordinates.x) +
							Math.abs(room.coordinates.y - entranceRoom.coordinates.y);
			if (distance > maxDistance) {
				maxDistance = distance;
				furthestRoom = room;
			}
		}

		// Make the furthest room a treasure room
		if (furthestRoom !== entranceRoom) {
			furthestRoom.roomType = RoomType.TREASURE_ROOM;
		}
	}

	private distributeContent(rooms: Map<string, Room>, entranceRoomId: string): void {
		const entranceRoom = rooms.get(entranceRoomId);
		if (!entranceRoom) return;

		for (const room of rooms.values()) {
			if (room.id === entranceRoomId) continue; // Skip entrance room

			const roomDepth = this.calculateRoomDepth(room, entranceRoom);

			// Distribute enemies
			if (this.enemyGenerator.shouldHaveEncounter(roomDepth, room.roomType)) {
				const isBossRoom = room.roomType === RoomType.TREASURE_ROOM;
				const enemies = this.enemyGenerator.generateEncounter(roomDepth, isBossRoom);
				room.contents.enemies = enemies;
			}

			// Distribute items based on room type
			this.distributeRoomItems(room, roomDepth);
		}
	}

	private calculateRoomDepth(room: Room, entranceRoom: Room): number {
		// Manhattan distance from entrance
		return Math.abs(room.coordinates.x - entranceRoom.coordinates.x) +
			   Math.abs(room.coordinates.y - entranceRoom.coordinates.y);
	}

	private distributeRoomItems(room: Room, roomDepth: number): void {
		switch (room.roomType) {
			case RoomType.TREASURE_ROOM:
				// Treasure rooms always have valuable items
				const treasureItems = this.itemGenerator.generateTreasureHoard(roomDepth);
				room.contents.items = treasureItems;
				break;

			case RoomType.ARMORY:
				// Armories have weapons and armor
				if (this.rng.chance(0.8)) {
					const weapon = this.itemGenerator.generateSpecificItem(
						this.rng.choose(['shortsword', 'longsword', 'greataxe', 'warhammer']),
						'weapons'
					);
					if (weapon) room.contents.items.push(weapon);
				}
				if (this.rng.chance(0.6)) {
					const armor = this.itemGenerator.generateSpecificItem(
						this.rng.choose(['leather_armor', 'studded_leather', 'chain_mail']),
						'armor'
					);
					if (armor) room.contents.items.push(armor);
				}
				break;

			case RoomType.LIBRARY:
				// Libraries might have scrolls or potions
				if (this.rng.chance(0.5)) {
					const potion = this.itemGenerator.generateSpecificItem(
						this.rng.choose(['health_potion', 'strength_potion']),
						'consumables'
					);
					if (potion) room.contents.items.push(potion);
				}
				break;

			case RoomType.CHAMBER:
			case RoomType.GENERIC:
				// Regular rooms have a chance for random loot
				if (this.rng.chance(0.3)) {
					const randomItem = this.itemGenerator.generateRandomItem(
						this.rng.choose(['common', 'uncommon'] as any),
						roomDepth
					);
					room.contents.items.push(randomItem);
				}
				break;

			default:
				// Small chance for items in other room types
				if (this.rng.chance(0.15)) {
					const randomItem = this.itemGenerator.generateRandomItem('common' as any, roomDepth);
					room.contents.items.push(randomItem);
				}
				break;
		}

		// Add hidden items that can be found by searching
		if (this.rng.chance(0.2)) {
			room.contents.features.push({
				id: `hidden-${room.id}`,
				name: 'Hidden Compartment',
				description: 'A small hidden compartment in the wall.',
				searchable: true,
				searched: false,
				hidden_items: [this.itemGenerator.generateRandomItem('common' as any, roomDepth)]
			});
		}
	}
}