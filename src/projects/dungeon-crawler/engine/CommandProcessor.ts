import type { Command } from '../models/Command';
import { ActionType } from '../models/Command';
import type { GameState } from '../models/Room';
import { MessageType } from '../models/Room';
import { MovementProcessor } from './processors/MovementProcessor';
import { InventoryProcessor } from './processors/InventoryProcessor';
import { CombatProcessor } from './processors/CombatProcessor';
import { InteractionProcessor } from './processors/InteractionProcessor';

export interface CommandResult {
	success: boolean;
	message?: string;
	messageType?: MessageType;
}

/**
 * Refactored CommandProcessor using modular processors
 */
export class CommandProcessor {
	private movementProcessor: MovementProcessor;
	private inventoryProcessor: InventoryProcessor;
	private combatProcessor: CombatProcessor;
	private interactionProcessor: InteractionProcessor;

	constructor() {
		this.movementProcessor = new MovementProcessor();
		this.inventoryProcessor = new InventoryProcessor();
		this.combatProcessor = new CombatProcessor();
		this.interactionProcessor = new InteractionProcessor();
	}

	parseCommand(input: string): Command {
		const words = input.toLowerCase().trim().split(/\s+/);
		const verb = words[0] || '';
		const target = words.slice(1).join(' ');

		// Movement commands
		if (this.movementProcessor.isDirectionCommand(verb)) {
			return {
				action: ActionType.MOVE,
				direction: this.movementProcessor.parseDirection(verb)
			};
		}

		// Other commands
		switch (verb) {
			case 'look':
			case 'l':
				return { action: ActionType.LOOK };

			case 'search':
				return { action: ActionType.SEARCH };

			case 'inventory':
			case 'inv':
			case 'i':
				return { action: ActionType.INVENTORY };

			case 'get':
			case 'take':
				return { action: ActionType.GET, target };

			case 'drop':
				return { action: ActionType.DROP, target };

			case 'examine':
			case 'exam':
			case 'x':
				return { action: ActionType.EXAMINE, target };

			case 'equip':
			case 'wield':
				return { action: ActionType.EQUIP, target };

			case 'unequip':
			case 'unwield':
				return { action: ActionType.UNEQUIP, target };

			case 'use':
				return { action: ActionType.USE, target };

			case 'attack':
			case 'kill':
			case 'fight':
				return { action: ActionType.ATTACK, target };

			case 'defend':
			case 'block':
				return { action: ActionType.DEFEND };

			case 'flee':
			case 'run':
			case 'escape':
				return { action: ActionType.FLEE };

			case 'cast':
			case 'spell':
				return { action: ActionType.CAST, spellId: target };

			case 'pick':
			case 'lockpick':
				if (words[1] === 'lock' || words.includes('lock')) {
					return { action: ActionType.PICK_LOCK, target };
				}
				return { action: ActionType.GET, target };

			case 'detect':
				if (words[1] === 'traps' || words.includes('traps')) {
					return { action: ActionType.DETECT_TRAPS };
				}
				return { action: ActionType.SEARCH };

			case 'disarm':
				return { action: ActionType.DISARM_TRAP, target };

			case 'solve':
			case 'answer':
				return { action: ActionType.SOLVE_PUZZLE, answer: target };

			case 'activate':
				if (words.includes('lever') || words.includes('switch') || words.includes('altar') || words.includes('fountain')) {
					return { action: ActionType.ACTIVATE, target };
				}
				return { action: ActionType.USE, target };

			case 'pull':
				return { action: ActionType.PULL, target };

			case 'push':
				return { action: ActionType.PUSH, target };

			case 'touch':
				return { action: ActionType.TOUCH, target };

			case 'wait':
				return { action: ActionType.WAIT };

			case 'rest':
			case 'sleep':
				return { action: ActionType.REST };

			case 'help':
			case '?':
				return { action: ActionType.HELP };

			default:
				throw new Error(`Unknown command: ${verb}. Type 'help' for available commands.`);
		}
	}

	async executeCommand(command: Command, gameState: GameState): Promise<CommandResult> {
		switch (command.action) {
			// Movement commands
			case ActionType.MOVE:
				return await this.movementProcessor.executeMove(command.direction!, gameState);

			// Interaction commands
			case ActionType.LOOK:
				return await this.interactionProcessor.executeLook(gameState);
			case ActionType.SEARCH:
				return this.interactionProcessor.executeSearch(gameState);
			case ActionType.EXAMINE:
				return this.interactionProcessor.executeExamine(command.target || '', gameState);
			case ActionType.USE:
				return this.interactionProcessor.executeUse(command.target || '', gameState);
			case ActionType.PICK_LOCK:
				return this.interactionProcessor.executePickLock(command.target || '', gameState);
			case ActionType.DETECT_TRAPS:
				return this.interactionProcessor.executeDetectTraps(gameState);
			case ActionType.DISARM_TRAP:
				return this.interactionProcessor.executeDisarmTrap(command.target || '', gameState);
			case ActionType.SOLVE_PUZZLE:
				return this.interactionProcessor.executeSolvePuzzle(command.answer || '', gameState);
			case ActionType.ACTIVATE:
				return this.interactionProcessor.executeActivate(command.target || '', gameState);
			case ActionType.PULL:
				return this.interactionProcessor.executePull(command.target || '', gameState);
			case ActionType.PUSH:
				return this.interactionProcessor.executePush(command.target || '', gameState);
			case ActionType.TOUCH:
				return this.interactionProcessor.executeTouch(command.target || '', gameState);
			case ActionType.WAIT:
				return this.interactionProcessor.executeWait(gameState);
			case ActionType.REST:
				return this.interactionProcessor.executeRest(gameState);
			case ActionType.HELP:
				return this.interactionProcessor.executeHelp();

			// Inventory commands
			case ActionType.INVENTORY:
				return this.inventoryProcessor.executeInventory(gameState);
			case ActionType.GET:
				return this.inventoryProcessor.executeGet(command.target || '', gameState);
			case ActionType.DROP:
				return this.inventoryProcessor.executeDrop(command.target || '', gameState);
			case ActionType.EQUIP:
				return this.inventoryProcessor.executeEquip(command.target || '', gameState);
			case ActionType.UNEQUIP:
				return this.inventoryProcessor.executeUnequip(command.target || '', gameState);

			// Combat commands
			case ActionType.ATTACK:
				return this.combatProcessor.executeAttack(command.target, gameState);
			case ActionType.DEFEND:
				return this.combatProcessor.executeDefend(gameState);
			case ActionType.FLEE:
				return this.combatProcessor.executeFlee(gameState);

			// Magic commands (handled separately in GameEngine)
			case ActionType.CAST:
				return {
					success: false,
					message: 'Spell casting is handled by the magic system.',
					messageType: MessageType.ERROR
				};

			default:
				return {
					success: false,
					message: `Command not implemented: ${command.action}`,
					messageType: MessageType.ERROR
				};
		}
	}
}