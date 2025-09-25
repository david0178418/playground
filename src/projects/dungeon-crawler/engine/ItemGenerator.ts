import type { Item, ItemProperty } from '../models/Character';
import { ItemType, Rarity } from '../models/Character';
import { RandomGenerator } from '../utils/RandomGenerator';
import itemData from '../data/itemTemplates.json';

interface ItemTemplate {
	name: string;
	baseType: string;
	weight: number;
	value: number;
	rarity: string;
	properties: ItemProperty[];
	damage?: string;
	ac?: number;
	consumable?: boolean;
	useDescription?: string;
	duration?: number;
	stackable?: boolean;
}

interface MagicAffix {
	name: string;
	rarity: string;
	applicableTo: string[];
	properties: ItemProperty[];
	valueMultiplier: number;
}

export class ItemGenerator {
	private rng: RandomGenerator;
	private weaponTemplates: Record<string, ItemTemplate>;
	private armorTemplates: Record<string, ItemTemplate>;
	private shieldTemplates: Record<string, ItemTemplate>;
	private consumableTemplates: Record<string, ItemTemplate>;
	private treasureTemplates: Record<string, ItemTemplate>;
	private magicPrefixes: MagicAffix[];
	private magicSuffixes: MagicAffix[];
	private lootTables: Record<string, Record<string, number>>;

	constructor(rng: RandomGenerator) {
		this.rng = rng;

		// Load templates from JSON data
		this.weaponTemplates = itemData.weapons as Record<string, ItemTemplate>;
		this.armorTemplates = itemData.armor as Record<string, ItemTemplate>;
		this.shieldTemplates = itemData.shields as Record<string, ItemTemplate>;
		this.consumableTemplates = itemData.consumables as Record<string, ItemTemplate>;
		this.treasureTemplates = itemData.treasures as Record<string, ItemTemplate>;
		this.magicPrefixes = itemData.magic_prefixes as MagicAffix[];
		this.magicSuffixes = itemData.magic_suffixes as MagicAffix[];
		this.lootTables = itemData.loot_tables as Record<string, Record<string, number>>;
	}

	generateRandomItem(targetRarity: Rarity = Rarity.COMMON, roomDepth: number = 1): Item {
		// Select item category based on loot table
		const category = this.selectItemCategory(targetRarity);
		const template = this.selectItemTemplate(category, targetRarity);

		if (!template) {
			// Fallback to gold
			return this.generateGold(this.rng.nextInt(1, 10));
		}

		return this.createItemFromTemplate(template, targetRarity, roomDepth);
	}

	generateSpecificItem(templateKey: string, category: string): Item | null {
		let template: ItemTemplate | undefined;

		switch (category) {
			case 'weapons':
				template = this.weaponTemplates[templateKey];
				break;
			case 'armor':
				template = this.armorTemplates[templateKey];
				break;
			case 'shields':
				template = this.shieldTemplates[templateKey];
				break;
			case 'consumables':
				template = this.consumableTemplates[templateKey];
				break;
			case 'treasures':
				template = this.treasureTemplates[templateKey];
				break;
		}

		if (!template) return null;

		return this.createItemFromTemplate(template, this.parseRarity(template.rarity));
	}

	generateLoot(enemyLevel: number, isBoss: boolean = false): Item[] {
		const items: Item[] = [];
		const lootRarity = this.determineLootRarity(enemyLevel, isBoss);
		const itemCount = this.determineItemCount(lootRarity, isBoss);

		for (let i = 0; i < itemCount; i++) {
			const item = this.generateRandomItem(lootRarity, enemyLevel);
			items.push(item);
		}

		// Always add some gold
		const goldAmount = this.rng.nextInt(
			enemyLevel * 2,
			enemyLevel * 10 + (isBoss ? 50 : 0)
		);
		if (goldAmount > 0) {
			items.push(this.generateGold(goldAmount));
		}

		return items;
	}

	generateTreasureHoard(roomDepth: number): Item[] {
		const items: Item[] = [];
		const hoardSize = this.rng.nextInt(3, 8);

		// High chance of valuable items
		const rarityWeights = {
			[Rarity.COMMON]: 0.2,
			[Rarity.UNCOMMON]: 0.4,
			[Rarity.RARE]: 0.3,
			[Rarity.EPIC]: 0.08,
			[Rarity.LEGENDARY]: 0.02
		};

		for (let i = 0; i < hoardSize; i++) {
			const rarity = this.rollWeightedRarity(rarityWeights);
			const item = this.generateRandomItem(rarity, roomDepth);
			items.push(item);
		}

		// Large amount of gold
		const goldAmount = this.rng.nextInt(50, 200) + roomDepth * 20;
		items.push(this.generateGold(goldAmount));

		return items;
	}

	private selectItemCategory(targetRarity: Rarity): string {
		const lootTable = this.lootTables[targetRarity] || this.lootTables['common'];
		const roll = this.rng.next();
		let cumulative = 0;

		for (const category in lootTable) {
			const weight = lootTable[category];
			if (typeof weight === 'number') {
				cumulative += weight;
				if (roll <= cumulative) {
					return category;
				}
			}
		}

		return 'consumables'; // Fallback
	}

	private selectItemTemplate(category: string, targetRarity: Rarity): ItemTemplate | null {
		let templates: Record<string, ItemTemplate>;

		switch (category) {
			case 'weapons':
				templates = this.weaponTemplates;
				break;
			case 'armor':
				templates = this.armorTemplates;
				break;
			case 'shields':
				templates = this.shieldTemplates;
				break;
			case 'consumables':
				templates = this.consumableTemplates;
				break;
			case 'treasures':
				templates = this.treasureTemplates;
				break;
			default:
				return null;
		}

		// Filter by rarity compatibility
		const suitableTemplates = Object.values(templates).filter(template => {
			const templateRarity = this.parseRarity(template.rarity);
			const targetRarityValue = this.getRarityValue(targetRarity);
			const templateRarityValue = this.getRarityValue(templateRarity);
			return templateRarityValue <= targetRarityValue;
		});

		if (suitableTemplates.length === 0) {
			return Object.values(templates)[0] || null;
		}

		return this.rng.choose(suitableTemplates);
	}

	private createItemFromTemplate(
		template: ItemTemplate,
		targetRarity: Rarity,
		_roomDepth: number = 1
	): Item {
		let name = template.name;
		let properties = [...template.properties];
		let value = template.value;

		// Apply magic affixes for higher rarities
		if (targetRarity >= Rarity.UNCOMMON) {
			const affixResult = this.applyMagicAffixes(template, targetRarity);
			name = affixResult.name;
			properties = affixResult.properties;
			value = Math.floor(value * affixResult.valueMultiplier);
		}

		const item: Item = {
			id: `item-${Date.now()}-${Math.random()}`,
			name,
			baseType: this.parseItemType(template.baseType),
			properties,
			rarity: targetRarity
		};

		return item;
	}

	private applyMagicAffixes(template: ItemTemplate, rarity: Rarity): {
		name: string;
		properties: ItemProperty[];
		valueMultiplier: number;
	} {
		let name = template.name;
		let properties = [...template.properties];
		let valueMultiplier = 1;

		const applicablePrefixes = this.magicPrefixes.filter(prefix =>
			prefix.applicableTo.includes(template.baseType) &&
			this.parseRarity(prefix.rarity) <= rarity
		);

		const applicableSuffixes = this.magicSuffixes.filter(suffix =>
			suffix.applicableTo.includes(template.baseType) &&
			this.parseRarity(suffix.rarity) <= rarity
		);

		// Apply prefix
		if (applicablePrefixes.length > 0 && this.rng.chance(0.6)) {
			const prefix = this.rng.choose(applicablePrefixes);
			name = `${prefix.name} ${name}`;
			properties.push(...prefix.properties);
			valueMultiplier *= prefix.valueMultiplier;
		}

		// Apply suffix
		if (applicableSuffixes.length > 0 && this.rng.chance(0.4)) {
			const suffix = this.rng.choose(applicableSuffixes);
			name = `${name} ${suffix.name}`;
			properties.push(...suffix.properties);
			valueMultiplier *= suffix.valueMultiplier;
		}

		return { name, properties, valueMultiplier };
	}

	private determineLootRarity(enemyLevel: number, isBoss: boolean): Rarity {
		const rarityWeights = {
			[Rarity.COMMON]: Math.max(0.1, 0.7 - enemyLevel * 0.05),
			[Rarity.UNCOMMON]: 0.2 + enemyLevel * 0.02,
			[Rarity.RARE]: 0.08 + enemyLevel * 0.01,
			[Rarity.EPIC]: Math.min(0.05, enemyLevel * 0.005),
			[Rarity.LEGENDARY]: Math.min(0.02, enemyLevel * 0.002)
		};

		// Bosses get better loot
		if (isBoss) {
			rarityWeights[Rarity.COMMON] *= 0.5;
			rarityWeights[Rarity.RARE] *= 1.5;
			rarityWeights[Rarity.EPIC] *= 2;
			rarityWeights[Rarity.LEGENDARY] *= 3;
		}

		return this.rollWeightedRarity(rarityWeights);
	}

	private rollWeightedRarity(weights: Record<Rarity, number>): Rarity {
		const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
		const roll = this.rng.next() * totalWeight;
		let cumulative = 0;

		for (const [rarity, weight] of Object.entries(weights)) {
			cumulative += weight;
			if (roll <= cumulative) {
				return rarity as Rarity;
			}
		}

		return Rarity.COMMON;
	}

	private determineItemCount(rarity: Rarity, isBoss: boolean): number {
		let baseCount = 1;

		if (rarity >= Rarity.UNCOMMON) baseCount++;
		if (rarity >= Rarity.RARE) baseCount++;
		if (isBoss) baseCount += 2;

		return this.rng.nextInt(1, baseCount + 1);
	}

	private generateGold(amount: number): Item {
		return {
			id: `gold-${Date.now()}-${Math.random()}`,
			name: `${amount} Gold Coins`,
			baseType: ItemType.TREASURE,
			properties: [],
			rarity: Rarity.COMMON
		};
	}

	private parseRarity(rarityString: string): Rarity {
		switch (rarityString.toLowerCase()) {
			case 'common': return Rarity.COMMON;
			case 'uncommon': return Rarity.UNCOMMON;
			case 'rare': return Rarity.RARE;
			case 'epic': return Rarity.EPIC;
			case 'legendary': return Rarity.LEGENDARY;
			default: return Rarity.COMMON;
		}
	}

	private getRarityValue(rarity: Rarity): number {
		switch (rarity) {
			case Rarity.COMMON: return 0;
			case Rarity.UNCOMMON: return 1;
			case Rarity.RARE: return 2;
			case Rarity.EPIC: return 3;
			case Rarity.LEGENDARY: return 4;
			default: return 0;
		}
	}

	private parseItemType(typeString: string): ItemType {
		switch (typeString.toLowerCase()) {
			case 'weapon': return ItemType.WEAPON;
			case 'armor': return ItemType.ARMOR;
			case 'shield': return ItemType.SHIELD;
			case 'potion': return ItemType.POTION;
			case 'accessory': return ItemType.ACCESSORY;
			case 'treasure': return ItemType.TREASURE;
			default: return ItemType.TREASURE;
		}
	}
}