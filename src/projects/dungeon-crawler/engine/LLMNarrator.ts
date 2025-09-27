import type { Room, RoomType } from '../models/Room';
import type { GameState } from '../models/Room';
import type { Enemy } from '../models/Enemy';
import type { Item } from '../models/Character';

// Type definitions for transformers.js
interface TextGenerator {
	(prompt: string, options?: Record<string, unknown>): Promise<TextGenerationResult[]>;
}

interface TextGenerationResult {
	generated_text: string;
}

interface RoomContext {
	roomType: RoomType;
	exits: string[];
	enemies: Enemy[];
	items: Item[];
	hasHazards: boolean;
	hasInteractiveElements: boolean;
	visited: boolean;
}

export class LLMNarrator {
	private generator: TextGenerator | null = null;
	private isInitialized = false;
	private initializationPromise: Promise<void> | null = null;

	async initialize(): Promise<void> {
		if (this.isInitialized) return;
		if (this.initializationPromise) return this.initializationPromise;

		this.initializationPromise = this.performInitialization();
		await this.initializationPromise;
	}

	private async performInitialization(): Promise<void> {
		// Check if we're in a browser environment
		if (typeof window === 'undefined') {
			throw new Error('LLM Narrator requires browser environment');
		}

		// Import official Hugging Face transformers library
		const { pipeline } = await import('@huggingface/transformers');

		// Initialize the pipeline directly with official HF library using specific ONNX model
		const generatorPipeline = await pipeline('text-generation', 'onnx-community/TinyLlama-1.1B-Chat-v1.0-ONNX', {
			device: 'wasm'
		});

		// Type guard to ensure we have a working generator
		if (typeof generatorPipeline !== 'function') {
			throw new Error('Failed to create text generation pipeline');
		}

		this.generator = generatorPipeline as TextGenerator;
		this.isInitialized = true;
	}

	async describeRoom(room: Room, gameState: GameState): Promise<string> {
		await this.initialize();

		const context = this.extractRoomContext(room);
		const prompt = this.buildRoomPrompt(context, gameState);

		if (!this.generator) {
			throw new Error('LLM generator not initialized');
		}

		// Generate text using the pipeline
		const result = await this.generator(prompt, {
			max_new_tokens: 150,
			temperature: 0.7,
			do_sample: true,
			top_p: 0.9,
			repetition_penalty: 1.1
		});

		// Handle result format
		const generatedText = Array.isArray(result) && result.length > 0 && result[0]
			? result[0].generated_text
			: '';

		if (!generatedText) {
			throw new Error('LLM failed to generate description');
		}

		return this.cleanGeneratedText(generatedText, prompt);
	}

	private extractRoomContext(room: Room): RoomContext {
		return {
			roomType: room.roomType,
			exits: Array.from(room.exits.keys()),
			enemies: room.contents.enemies,
			items: room.contents.items,
			hasHazards: Boolean(room.hazards && room.hazards.length > 0),
			hasInteractiveElements: Boolean(room.interactiveElements && room.interactiveElements.length > 0),
			visited: room.visited
		};
	}

	private buildRoomPrompt(context: RoomContext, _gameState: GameState): string {
		const roomTypeDescriptor = this.getRoomTypeDescriptor(context.roomType);
		const exitList = context.exits.length > 0 ? context.exits.join(', ') : 'none';

		let contentDescription = '';
		if (context.enemies.length > 0) {
			const enemyTypes = context.enemies.map(e => e.type).join(', ');
			contentDescription += ` There are ${context.enemies.length} enemies here: ${enemyTypes}.`;
		}
		if (context.items.length > 0) {
			contentDescription += ` You can see ${context.items.length} items scattered about.`;
		}
		if (context.hasHazards) {
			contentDescription += ' Environmental hazards are present.';
		}
		if (context.hasInteractiveElements) {
			contentDescription += ' Interactive elements are visible.';
		}

		const revisitNote = context.visited ? ' You have been here before.' : ' This is your first time in this area.';

		return `<|system|>
You are a dungeon master describing a room in a fantasy dungeon. Provide a vivid, atmospheric description in 2-3 sentences. Focus on what the character sees, hears, and feels. Be immersive but concise.

<|user|>
Room type: ${roomTypeDescriptor}
Exits: ${exitList}${contentDescription}${revisitNote}

Describe this room as a dungeon master would:

<|assistant|>`;
	}

	private getRoomTypeDescriptor(roomType: RoomType): string {
		const descriptors = {
			entrance: 'dungeon entrance',
			corridor: 'narrow stone corridor',
			chamber: 'large chamber',
			armory: 'old armory',
			library: 'ancient library',
			throne_room: 'grand throne room',
			treasure_room: 'treasure chamber',
			generic: 'stone room'
		} as const;

		return descriptors[roomType] || 'mysterious room';
	}

	private cleanGeneratedText(fullText: string, prompt: string): string {
		// Remove the prompt from the generated text
		const generatedPart = fullText.replace(prompt, '').trim();

		// Remove any remaining chat markers or system tokens
		const cleaned = generatedPart
			.replace(/<\|.*?\|>/g, '')
			.replace(/^\s*[\[\](){}]+\s*/, '')
			.trim();

		// If the result is empty or too short, provide a fallback
		if (!cleaned || cleaned.length < 10) {
			return "You find yourself in a mysterious chamber, shadows dancing in the dim light.";
		}

		// Ensure it ends with proper punctuation
		const withPunctuation = cleaned.endsWith('.') || cleaned.endsWith('!') || cleaned.endsWith('?')
			? cleaned
			: cleaned + '.';

		return withPunctuation;
	}
}