import type { GameState } from '../../models/Room';
import { MessageType } from '../../models/Room';
import type { Item, Character } from '../../models/Character';
import { ItemType } from '../../models/Character';
import type { CommandResult } from '../CommandProcessor';

/**
 * Handles inventory-related commands
 */
export class InventoryProcessor {
	/**
	 * Show character's inventory
	 */
	executeInventory(gameState: GameState): CommandResult {
		const { character } = gameState;
		const { inventory } = character;

		if (inventory.length === 0) {
			return {
				success: true,
				message: 'Your inventory is empty.',
				messageType: MessageType.ACTION
			};
		}

		let inventoryList = 'Inventory:\n';
		inventory.forEach((item, index) => {
			inventoryList += `  ${index + 1}. ${item.name}`;
			if (item.description) {
				inventoryList += ` - ${item.description}`;
			}
			inventoryList += '\n';
		});

		// Add equipped items
		inventoryList += '\nEquipped:\n';
		if (character.equipment.weapon) {
			inventoryList += `  Weapon: ${character.equipment.weapon.name}\n`;
		}
		if (character.equipment.armor) {
			inventoryList += `  Armor: ${character.equipment.armor.name}\n`;
		}
		if (character.equipment.shield) {
			inventoryList += `  Shield: ${character.equipment.shield.name}\n`;
		}

		return {
			success: true,
			message: inventoryList,
			messageType: MessageType.ACTION
		};
	}

	/**
	 * Get an item from the current room
	 */
	executeGet(target: string, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return {
				success: false,
				message: 'Cannot get items from here.',
				messageType: MessageType.ERROR
			};
		}

		if (!target) {
			return {
				success: false,
				message: 'What do you want to get?',
				messageType: MessageType.ERROR
			};
		}

		// Find item in room
		const itemIndex = currentRoom.contents.items.findIndex(item =>
			item.name.toLowerCase().includes(target.toLowerCase())
		);

		if (itemIndex === -1) {
			return {
				success: false,
				message: `There is no ${target} here.`,
				messageType: MessageType.ACTION
			};
		}

		const item = currentRoom.contents.items[itemIndex];
		if (!item) {
			return {
				success: false,
				message: 'Item not found.',
				messageType: MessageType.ERROR
			};
		}

		// Check if character can carry more items
		if (!this.canCarryItem(gameState.character, item)) {
			return {
				success: false,
				message: 'Your inventory is full.',
				messageType: MessageType.ACTION
			};
		}

		// Remove from room, add to inventory
		currentRoom.contents.items.splice(itemIndex, 1);
		gameState.character.inventory.push(item);

		return {
			success: true,
			message: `You take the ${item.name}.`,
			messageType: MessageType.ACTION
		};
	}

	/**
	 * Drop an item from inventory
	 */
	executeDrop(target: string, gameState: GameState): CommandResult {
		const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
		if (!currentRoom) {
			return {
				success: false,
				message: 'Cannot drop items here.',
				messageType: MessageType.ERROR
			};
		}

		if (!target) {
			return {
				success: false,
				message: 'What do you want to drop?',
				messageType: MessageType.ERROR
			};
		}

		// Find item in inventory
		const itemIndex = gameState.character.inventory.findIndex(item =>
			item.name.toLowerCase().includes(target.toLowerCase())
		);

		if (itemIndex === -1) {
			return {
				success: false,
				message: `You don't have a ${target}.`,
				messageType: MessageType.ACTION
			};
		}

		const item = gameState.character.inventory[itemIndex];
		if (!item) {
			return {
				success: false,
				message: 'Item not found in inventory.',
				messageType: MessageType.ERROR
			};
		}

		// Remove from inventory, add to room
		gameState.character.inventory.splice(itemIndex, 1);
		currentRoom.contents.items.push(item);

		return {
			success: true,
			message: `You drop the ${item.name}.`,
			messageType: MessageType.ACTION
		};
	}

	/**
	 * Equip an item from inventory
	 */
	executeEquip(target: string, gameState: GameState): CommandResult {
		if (!target) {
			return {
				success: false,
				message: 'What do you want to equip?',
				messageType: MessageType.ERROR
			};
		}

		// Find item in inventory
		const item = gameState.character.inventory.find(item =>
			item.name.toLowerCase().includes(target.toLowerCase())
		);

		if (!item) {
			return {
				success: false,
				message: `You don't have a ${target}.`,
				messageType: MessageType.ACTION
			};
		}

		// Check if item is equippable
		if (!this.isEquippable(item)) {
			return {
				success: false,
				message: `You cannot equip the ${item.name}.`,
				messageType: MessageType.ACTION
			};
		}

		const result = this.equipItem(gameState.character, item);
		return {
			success: true,
			message: result.message,
			messageType: MessageType.ACTION
		};
	}

	/**
	 * Unequip an equipped item
	 */
	executeUnequip(target: string, gameState: GameState): CommandResult {
		if (!target) {
			return {
				success: false,
				message: 'What do you want to unequip?',
				messageType: MessageType.ERROR
			};
		}

		const character = gameState.character;
		let unequippedItem: Item | null = null;

		// Check each equipment slot
		if (character.equipment.weapon?.name.toLowerCase().includes(target.toLowerCase())) {
			unequippedItem = character.equipment.weapon;
			character.equipment.weapon = undefined;
		} else if (character.equipment.armor?.name.toLowerCase().includes(target.toLowerCase())) {
			unequippedItem = character.equipment.armor;
			character.equipment.armor = undefined;
		} else if (character.equipment.shield?.name.toLowerCase().includes(target.toLowerCase())) {
			unequippedItem = character.equipment.shield;
			character.equipment.shield = undefined;
		}

		if (!unequippedItem) {
			return {
				success: false,
				message: `You don't have a ${target} equipped.`,
				messageType: MessageType.ACTION
			};
		}

		// Add back to inventory if there's space
		if (this.canCarryItem(character, unequippedItem)) {
			character.inventory.push(unequippedItem);
			return {
				success: true,
				message: `You unequip the ${unequippedItem.name}.`,
				messageType: MessageType.ACTION
			};
		} else {
			// Drop to current room if inventory is full
			const currentRoom = gameState.dungeon.rooms.get(gameState.currentRoomId);
			if (currentRoom) {
				currentRoom.contents.items.push(unequippedItem);
			}
			return {
				success: true,
				message: `You unequip the ${unequippedItem.name} and drop it (inventory full).`,
				messageType: MessageType.ACTION
			};
		}
	}

	/**
	 * Check if character can carry more items
	 */
	private canCarryItem(character: Character, _item: Item): boolean {
		const maxItems = 20; // Base carrying capacity
		return character.inventory.length < maxItems;
	}

	/**
	 * Check if an item is equippable
	 */
	private isEquippable(item: Item): boolean {
		return [ItemType.WEAPON, ItemType.ARMOR, ItemType.SHIELD].includes(item.baseType);
	}

	/**
	 * Equip an item and handle slot conflicts
	 */
	private equipItem(character: Character, item: Item): { message: string } {
		let message = `You equip the ${item.name}.`;

		switch (item.baseType) {
			case ItemType.WEAPON:
				if (character.equipment.weapon) {
					// Replace existing weapon
					character.inventory.push(character.equipment.weapon);
					message = `You unequip the ${character.equipment.weapon.name} and equip the ${item.name}.`;
				}
				character.equipment.weapon = item;
				break;

			case ItemType.ARMOR:
				if (character.equipment.armor) {
					character.inventory.push(character.equipment.armor);
					message = `You remove the ${character.equipment.armor.name} and equip the ${item.name}.`;
				}
				character.equipment.armor = item;
				break;

			case ItemType.SHIELD:
				if (character.equipment.shield) {
					character.inventory.push(character.equipment.shield);
					message = `You lower the ${character.equipment.shield.name} and equip the ${item.name}.`;
				}
				character.equipment.shield = item;
				break;

			default:
				return { message: `Cannot equip the ${item.name}.` };
		}

		// Remove item from inventory
		const itemIndex = character.inventory.findIndex(invItem => invItem === item);
		if (itemIndex > -1) {
			character.inventory.splice(itemIndex, 1);
		}

		return { message };
	}
}