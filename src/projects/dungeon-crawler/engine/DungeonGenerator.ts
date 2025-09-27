import type { Room, Dungeon, Lock, Trap } from '../models/Room';
import { Direction, RoomType, LockType, TrapType, TrapEffect } from '../models/Room';
import { RandomGenerator } from '../utils/RandomGenerator';
import { EnemyGenerator } from './EnemyGenerator';
import { ItemGenerator } from './ItemGenerator';
import { InteractionSystem } from './InteractionSystem';
import { HazardSystem } from './HazardSystem';
import { InteractiveElementSystem } from './InteractiveElementSystem';

export class DungeonGenerator {
	private rng: RandomGenerator;
	private enemyGenerator: EnemyGenerator;
	private itemGenerator: ItemGenerator;
	private interactionSystem: InteractionSystem;
	private hazardSystem: HazardSystem;
	private interactiveElementSystem: InteractiveElementSystem;

	constructor(rng: RandomGenerator) {
		this.rng = rng;
		this.enemyGenerator = new EnemyGenerator(rng);
		this.itemGenerator = new ItemGenerator(rng);
		this.interactionSystem = new InteractionSystem();
		this.hazardSystem = new HazardSystem();
		this.interactiveElementSystem = new InteractiveElementSystem();
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

		// Add advanced room features
		this.addAdvancedFeatures(rooms, entranceRoom.id);

		// Add environmental hazards and interactive elements
		this.addEnvironmentalFeatures(rooms, entranceRoom.id);

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
				template: roomType // Just store the room type, LLM will generate description
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

	private addAdvancedFeatures(rooms: Map<string, Room>, entranceRoomId: string): void {

		// Add locked doors (20% chance)
		this.addLockedDoors(rooms);

		// Add traps to rooms (30% chance, excluding entrance)
		this.addTraps(rooms, entranceRoomId);

		// Add puzzles to special rooms (40% chance)
		this.addPuzzles(rooms, entranceRoomId);
	}

	private addLockedDoors(rooms: Map<string, Room>): void {
		for (const room of rooms.values()) {
			// Each exit has a 20% chance of being locked
			const exits = Array.from(room.exits.entries());

			for (const [direction, _targetRoomId] of exits) {
				if (this.rng.chance(0.2)) {
					if (!room.lockedExits) {
						room.lockedExits = new Map();
					}

					const lockType = this.rng.choose([LockType.SIMPLE, LockType.COMPLEX, LockType.MAGICAL]);
					let difficulty = 12; // Base DC

					switch (lockType) {
						case LockType.SIMPLE:
							difficulty = 10 + this.rng.rollDie(6); // DC 11-16
							break;
						case LockType.COMPLEX:
							difficulty = 15 + this.rng.rollDie(6); // DC 16-21
							break;
						case LockType.MAGICAL:
							difficulty = 18 + this.rng.rollDie(8); // DC 19-26
							break;
					}

					const lock: Lock = {
						id: `lock-${room.id}-${direction}`,
						type: lockType,
						difficulty,
						unlocked: false,
						attempts: 0
					};

					// Some locks require keys
					if (this.rng.chance(0.3)) {
						lock.keyId = `key-${lock.id}`;
						// TODO: Place key somewhere in dungeon
					}

					room.lockedExits.set(direction, lock);
				}
			}
		}
	}

	private addTraps(rooms: Map<string, Room>, entranceRoomId: string): void {
		for (const room of rooms.values()) {
			// Skip entrance room
			if (room.id === entranceRoomId) continue;

			// 30% chance for trap
			if (this.rng.chance(0.3)) {
				const trapType = this.rng.choose([
					TrapType.POISON_DART,
					TrapType.PIT,
					TrapType.SPIKE,
					TrapType.FIRE,
					TrapType.ALARM
				]);

				const trap = this.createTrap(room, trapType);
				if (!room.traps) {
					room.traps = [];
				}
				room.traps.push(trap);
			}
		}
	}

	private createTrap(room: Room, trapType: TrapType): Trap {
		let name: string;
		let description: string;
		let damage: string | undefined;
		let effect: TrapEffect | undefined;
		let detectionDC: number;
		let disarmDC: number;

		switch (trapType) {
			case TrapType.POISON_DART:
				name = "Poison Dart Trap";
				description = "Darts shoot from hidden holes in the walls!";
				damage = "1d4+2";
				effect = TrapEffect.POISON;
				detectionDC = 15;
				disarmDC = 13;
				break;
			case TrapType.PIT:
				name = "Pit Trap";
				description = "The floor gives way to a deep pit!";
				damage = "2d6";
				detectionDC = 12;
				disarmDC = 15;
				break;
			case TrapType.SPIKE:
				name = "Spike Trap";
				description = "Sharp spikes spring from the ground!";
				damage = "1d8+3";
				detectionDC = 14;
				disarmDC = 14;
				break;
			case TrapType.FIRE:
				name = "Fire Trap";
				description = "Flames burst from vents in the floor!";
				damage = "2d4";
				detectionDC = 16;
				disarmDC = 16;
				break;
			case TrapType.ALARM:
				name = "Alarm Trap";
				description = "A magical alarm sounds throughout the dungeon!";
				effect = TrapEffect.ALARM;
				detectionDC = 18;
				disarmDC = 12;
				break;
			default:
				name = "Unknown Trap";
				description = "Something dangerous activates!";
				damage = "1d6";
				detectionDC = 15;
				disarmDC = 15;
		}

		return {
			id: `trap-${room.id}-${trapType}`,
			name,
			description,
			type: trapType,
			detected: false,
			disarmed: false,
			triggered: false,
			detectionDC,
			disarmDC,
			damage,
			effect
		};
	}

	private addPuzzles(rooms: Map<string, Room>, entranceRoomId: string): void {
		// Add puzzles primarily to special room types
		for (const room of rooms.values()) {
			// Skip entrance room
			if (room.id === entranceRoomId) continue;

			let puzzleChance = 0.1; // Base 10% chance

			// Higher chance for special rooms
			switch (room.roomType) {
				case RoomType.LIBRARY:
					puzzleChance = 0.6;
					break;
				case RoomType.TREASURE_ROOM:
					puzzleChance = 0.8;
					break;
				case RoomType.THRONE_ROOM:
					puzzleChance = 0.5;
					break;
				case RoomType.CHAMBER:
					puzzleChance = 0.3;
					break;
			}

			if (this.rng.chance(puzzleChance)) {
				const puzzle = this.interactionSystem.generateRandomPuzzle();

				// Add reward for solving puzzle
				if (room.roomType === RoomType.TREASURE_ROOM || room.roomType === RoomType.LIBRARY) {
					const rewardItem = this.itemGenerator.generateRandomItem('uncommon' as any, 3);
					puzzle.reward = [rewardItem];
				}

				if (!room.puzzles) {
					room.puzzles = [];
				}
				room.puzzles.push(puzzle);
			}
		}
	}

	private addEnvironmentalFeatures(rooms: Map<string, Room>, entranceRoomId: string): void {
		for (const room of rooms.values()) {
			// Skip entrance room for hazards
			if (room.id === entranceRoomId) continue;

			const roomDepth = this.calculateRoomDepth(room, rooms.get(entranceRoomId)!);

			// Add environmental hazards (25% chance, higher in deeper rooms)
			const hazardChance = Math.min(0.4, 0.15 + (roomDepth * 0.05));
			if (this.rng.chance(hazardChance)) {
				const hazard = this.hazardSystem.generateHazard(room.roomType, roomDepth, this.rng);
				if (hazard) {
					if (!room.hazards) room.hazards = [];
					room.hazards.push(hazard);
				}
			}

			// Add interactive elements (30% chance, higher for special rooms)
			let interactiveChance = 0.2;
			switch (room.roomType) {
				case RoomType.LIBRARY:
					interactiveChance = 0.7;
					break;
				case RoomType.THRONE_ROOM:
					interactiveChance = 0.8;
					break;
				case RoomType.TREASURE_ROOM:
					interactiveChance = 0.6;
					break;
				case RoomType.CHAMBER:
					interactiveChance = 0.4;
					break;
			}

			if (this.rng.chance(interactiveChance)) {
				const element = this.interactiveElementSystem.generateInteractiveElement(room.roomType, roomDepth, this.rng);
				if (element) {
					if (!room.interactiveElements) room.interactiveElements = [];
					room.interactiveElements.push(element);
				}
			}
		}
	}
}