import type { Enemy, Attack, LootTable, LootEntry } from '../models/Enemy';
import { EnemyType } from '../models/Enemy';
import type { Item } from '../models/Character';
import type { EnemyAbility } from '../models/EnemyAbility';
import { RandomGenerator } from '../utils/RandomGenerator';
import enemyData from '../data/enemies.json';
import enemyAbilitiesData from '../data/enemy-abilities.json';

interface EnemyTemplate {
	name: string;
	baseStats: {
		strength: number;
		dexterity: number;
		constitution: number;
		intelligence: number;
		wisdom: number;
		charisma: number;
	};
	baseHp: number;
	baseAc: number;
	attacks: Attack[];
	loot: {
		gold: { min: number; max: number };
		items: Array<{ template: string; chance: number }>;
	};
	minLevel: number;
	maxLevel: number;
	immunities?: string[];
	resistances?: string[];
	pack?: boolean;
	packSize?: { min: number; max: number };
	boss?: boolean;
	legendary?: boolean;
}

export class EnemyGenerator {
	private rng: RandomGenerator;
	private templates: Record<string, EnemyTemplate>;
	private enemyAbilities: Record<string, EnemyAbility>;
	private abilityMappings: Record<string, string[]>;

	constructor(rng: RandomGenerator) {
		this.rng = rng;
		this.templates = enemyData.templates as Record<string, EnemyTemplate>;
		this.enemyAbilities = enemyAbilitiesData.abilities as Record<string, EnemyAbility>;
		this.abilityMappings = (enemyAbilitiesData as any).enemyAbilityMappings;
	}

	generateEncounter(roomDepth: number, isBossRoom: boolean = false): Enemy[] {
		const enemies: Enemy[] = [];

		if (isBossRoom) {
			// Generate boss encounter
			const bossEnemy = this.generateBoss(roomDepth);
			if (bossEnemy) {
				enemies.push(bossEnemy);
			}
		} else {
			// Generate regular encounter based on depth
			const encounterType = this.selectEncounterType(roomDepth);
			const enemyCount = this.determineEnemyCount(roomDepth);

			for (let i = 0; i < enemyCount; i++) {
				const enemy = this.generateEnemy(encounterType, roomDepth);
				if (enemy) {
					enemies.push(enemy);
				}
			}
		}

		return enemies;
	}

	generateEnemy(enemyType: string, level: number): Enemy | null {
		const template = this.templates[enemyType];
		if (!template) {
			console.warn(`Enemy template not found: ${enemyType}`);
			return null;
		}

		// Scale enemy to appropriate level
		const scaledTemplate = this.scaleEnemyToLevel(template, level);

		const enemy: Enemy = {
			id: `${enemyType}-${Date.now()}-${Math.random()}`,
			name: template.name,
			type: this.getEnemyType(enemyType),
			stats: scaledTemplate.baseStats,
			hp: {
				current: scaledTemplate.baseHp,
				max: scaledTemplate.baseHp
			},
			ac: scaledTemplate.baseAc,
			attacks: scaledTemplate.attacks,
			loot: this.generateLootTable(template.loot),
			abilities: this.assignAbilities(enemyType, level),
			resources: this.generateResources(enemyType, level)
		};

		return enemy;
	}

	private generateBoss(roomDepth: number): Enemy | null {
		const bossTemplates = Object.entries(this.templates)
			.filter(([_, template]) => template.boss)
			.filter(([_, template]) => roomDepth >= template.minLevel);

		if (bossTemplates.length === 0) {
			// Fallback to scaled regular enemy
			return this.generateEnemy('orc', Math.max(3, roomDepth));
		}

		const [bossType] = this.rng.choose(bossTemplates);
		return this.generateEnemy(bossType, roomDepth);
	}

	private selectEncounterType(roomDepth: number): string {
		const level = Math.min(3, Math.max(1, Math.ceil(roomDepth / 3)));
		const encounterTable = (enemyData.encounterTables as any)[`level${level}`];

		if (!encounterTable) {
			return 'goblin'; // Fallback
		}

		// Roll for encounter rarity
		const rarityRoll = this.rng.next();
		let enemyPool: string[];

		if (rarityRoll < 0.7) { // 70% common
			enemyPool = encounterTable.common || [];
		} else if (rarityRoll < 0.9) { // 20% uncommon
			enemyPool = encounterTable.uncommon || [];
		} else { // 10% rare
			enemyPool = encounterTable.rare || [];
		}

		// Fallback to common if pool is empty
		if (enemyPool.length === 0) {
			enemyPool = encounterTable.common || ['goblin'];
		}

		return this.rng.choose(enemyPool);
	}

	private determineEnemyCount(roomDepth: number): number {
		// Base chance for multiple enemies
		const multipleEnemyChance = Math.min(0.6, roomDepth * 0.1);

		if (this.rng.chance(multipleEnemyChance)) {
			// 1-3 enemies based on depth
			return this.rng.nextInt(1, Math.min(3, Math.max(1, Math.floor(roomDepth / 2))));
		}

		return 1;
	}

	private scaleEnemyToLevel(template: EnemyTemplate, targetLevel: number): EnemyTemplate {
		const scaleFactor = Math.max(0.5, targetLevel / template.minLevel);

		return {
			...template,
			baseHp: Math.floor(template.baseHp * scaleFactor),
			baseAc: Math.floor(template.baseAc + (targetLevel - template.minLevel) * 0.5),
			baseStats: {
				strength: Math.floor(template.baseStats.strength + (targetLevel - template.minLevel) * 0.5),
				dexterity: Math.floor(template.baseStats.dexterity + (targetLevel - template.minLevel) * 0.5),
				constitution: Math.floor(template.baseStats.constitution + (targetLevel - template.minLevel) * 0.5),
				intelligence: template.baseStats.intelligence,
				wisdom: template.baseStats.wisdom,
				charisma: template.baseStats.charisma
			},
			attacks: template.attacks.map(attack => ({
				...attack,
				hitBonus: attack.hitBonus + Math.floor((targetLevel - template.minLevel) * 0.5)
			}))
		};
	}

	private generateLootTable(lootTemplate: EnemyTemplate['loot']): LootTable {
		const items: LootEntry[] = [];

		// Process item drops
		for (const itemDrop of lootTemplate.items) {
			if (this.rng.chance(itemDrop.chance)) {
				// For now, create placeholder items
				// This will be replaced when ItemGenerator is implemented
				const item: Item = {
					id: `loot-${itemDrop.template}-${Date.now()}`,
					name: this.getItemNameFromTemplate(itemDrop.template),
					baseType: 'treasure' as any,
					properties: [],
					rarity: 'common' as any
				};

				items.push({
					item,
					chance: itemDrop.chance
				});
			}
		}

		return {
			items,
			gold: lootTemplate.gold
		};
	}

	private getItemNameFromTemplate(template: string): string {
		// Convert template names to display names
		const nameMap: Record<string, string> = {
			'rusty_scimitar': 'Rusty Scimitar',
			'leather_armor': 'Leather Armor',
			'greataxe': 'Greataxe',
			'studded_leather': 'Studded Leather Armor',
			'bone_dust': 'Bone Dust',
			'shortsword': 'Shortsword',
			'rat_tail': 'Rat Tail',
			'spider_silk': 'Spider Silk',
			'poison_gland': 'Poison Gland',
			'scimitar': 'Scimitar',
			'health_potion': 'Health Potion',
			'dragon_scale': 'Dragon Scale',
			'magic_sword': 'Magic Sword',
			'treasure_hoard': 'Treasure Hoard'
		};

		return nameMap[template] || template.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
	}

	private getEnemyType(enemyTemplate: string): EnemyType {
		const typeMap: Record<string, EnemyType> = {
			'goblin': EnemyType.GOBLIN,
			'orc': EnemyType.ORC,
			'skeleton': EnemyType.SKELETON,
			'rat': EnemyType.RAT,
			'spider': EnemyType.SPIDER,
			'bandit': EnemyType.BANDIT,
			'dragon_wyrmling': EnemyType.DRAGON
		};

		return typeMap[enemyTemplate] || EnemyType.GOBLIN;
	}

	// Utility method for determining room encounter chance
	shouldHaveEncounter(roomDepth: number, roomType: string): boolean {
		let baseChance = 0.4; // 40% base chance

		// Modify by room type
		switch (roomType) {
			case 'entrance':
				return false; // Never enemies in entrance
			case 'treasure_room':
				baseChance = 0.8; // High chance in treasure rooms
				break;
			case 'armory':
			case 'library':
				baseChance = 0.6; // Medium-high chance in special rooms
				break;
			case 'corridor':
				baseChance = 0.2; // Low chance in corridors
				break;
		}

		// Increase chance with depth
		baseChance += roomDepth * 0.05;
		baseChance = Math.min(0.8, baseChance); // Cap at 80%

		return this.rng.chance(baseChance);
	}

	private assignAbilities(enemyType: string, level: number): EnemyAbility[] {
		const abilities: EnemyAbility[] = [];
		const abilityIds = this.abilityMappings[enemyType] || [];

		for (const abilityId of abilityIds) {
			const abilityTemplate = this.enemyAbilities[abilityId];
			if (abilityTemplate) {
				// Create a copy of the ability for this enemy instance
				const ability: EnemyAbility = {
					...abilityTemplate,
					id: `${abilityId}-${Date.now()}-${Math.random()}`,
					// Scale ability based on enemy level
					priority: abilityTemplate.priority + (level * 2)
				};

				// Scale damage/healing based on level
				if (ability.effect.damage) {
					ability.effect.damage = this.scaleDiceRoll(ability.effect.damage, level);
				}
				if (ability.effect.healing) {
					ability.effect.healing = this.scaleDiceRoll(ability.effect.healing, level);
				}

				abilities.push(ability);
			}
		}

		return abilities;
	}

	private generateResources(enemyType: string, level: number) {
		const resources: any = {};

		// Assign resources based on enemy type
		switch (enemyType) {
			case 'dragon_wyrmling':
				resources.energy = {
					current: 20 + (level * 5),
					max: 20 + (level * 5)
				};
				break;
			case 'skeleton':
			case 'bandit':
				// Some enemies might have mana for abilities
				if (this.rng.chance(0.3)) {
					resources.mana = {
						current: 10 + (level * 2),
						max: 10 + (level * 2)
					};
				}
				break;
			case 'orc':
				resources.rage = {
					current: 0, // Rage builds up during combat
					max: 15 + (level * 3)
				};
				break;
		}

		return Object.keys(resources).length > 0 ? resources : undefined;
	}

	private scaleDiceRoll(diceRoll: string, level: number): string {
		// Simple scaling: add level/3 to modifier
		const modifier = Math.floor(level / 3);
		if (modifier > 0) {
			return diceRoll.includes('+') ?
				diceRoll.replace(/\+(\d+)/, (_, p1) => `+${parseInt(p1) + modifier}`) :
				`${diceRoll}+${modifier}`;
		}
		return diceRoll;
	}
}