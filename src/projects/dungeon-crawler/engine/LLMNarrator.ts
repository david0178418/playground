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

interface ModelConfig {
	id: string;
	name: string;
	modelPath: string;
	parameters: string;
	description: string;
	performanceLevel: 'fast' | 'balanced' | 'quality';
}

const AVAILABLE_MODELS: ModelConfig[] = [
	{
		id: 'tinyllama-1.1b',
		name: 'TinyLlama 1.1B',
		modelPath: 'onnx-community/TinyLlama-1.1B-Chat-v1.0-ONNX',
		parameters: '1.1B',
		description: 'Larger model with better text quality',
		performanceLevel: 'quality'
	},
	{
		id: 'gemma-3-1b',
		name: 'Gemma 3 1B IT',
		modelPath: 'onnx-community/gemma-3-1b-it-ONNX',
		parameters: '1B',
		description: 'Google\'s latest Gemma 3 model for instruction following',
		performanceLevel: 'quality'
	},
	{
		id: 'gemma-2-2b',
		name: 'Gemma 2 2B IT',
		modelPath: 'onnx-community/gemma-2-2b-it-ONNX',
		parameters: '2B',
		description: 'Google\'s Gemma 2 2B instruction-tuned model with better quality',
		performanceLevel: 'quality'
	},
	{
		id: 'qwen-0.5b',
		name: 'Qwen2.5 0.5B',
		modelPath: 'onnx-community/Qwen2.5-0.5B-Instruct',
		parameters: '500M',
		description: 'Smaller, faster model with good quality',
		performanceLevel: 'fast'
	}
] as const;

type ModelId = typeof AVAILABLE_MODELS[number]['id'];

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
	private currentModelId: ModelId | null = null;
	private isInitialized = false;
	private initializationPromise: Promise<void> | null = null;

	static getAvailableModels(): ModelConfig[] {
		return [...AVAILABLE_MODELS];
	}

	static getModelConfig(modelId: ModelId): ModelConfig | undefined {
		return AVAILABLE_MODELS.find(model => model.id === modelId);
	}

	getCurrentModelId(): ModelId | null {
		return this.currentModelId;
	}

	async initialize(modelId: ModelId = 'tinyllama-1.1b'): Promise<void> {
		// If already initialized with the same model, return
		if (this.isInitialized && this.currentModelId === modelId) {
			console.log(`✅ LLM: Already initialized with ${modelId}`);
			return;
		}

		// If switching models, reset initialization
		if (this.currentModelId !== modelId) {
			if (this.currentModelId) {
				console.log(`🔄 LLM: Switching from ${this.currentModelId} to ${modelId}`);
			} else {
				console.log(`🚀 LLM: First-time initialization with ${modelId}`);
			}
			this.isInitialized = false;
			this.initializationPromise = null;
			this.generator = null;
		}

		if (this.initializationPromise) {
			console.log(`⏳ LLM: Waiting for ongoing ${modelId} initialization...`);
			return this.initializationPromise;
		}

		this.initializationPromise = this.performInitialization(modelId);
		await this.initializationPromise;
	}

	private async performInitialization(modelId: ModelId): Promise<void> {
		// Check if we're in a browser environment
		if (typeof window === 'undefined') {
			throw new Error('LLM Narrator requires browser environment');
		}

		const modelConfig = LLMNarrator.getModelConfig(modelId);
		if (!modelConfig) {
			throw new Error(`Unknown model ID: ${modelId}`);
		}

		console.log(`📦 LLM: Loading ${modelConfig.name} (${modelConfig.parameters}) from ${modelConfig.modelPath}`);
		console.log(`⚡ LLM: Performance profile: ${modelConfig.performanceLevel}`);

		try {
			// Import official Hugging Face transformers library
			console.log(`📚 LLM: Importing transformers library...`);
			const { pipeline } = await import('@huggingface/transformers');

			// Initialize the pipeline with the selected model
			console.log(`🔧 LLM: Creating pipeline for ${modelConfig.name}...`);
			const startTime = performance.now();
			const generatorPipeline = await pipeline('text-generation', modelConfig.modelPath, {
				device: 'wasm'
			});
			const loadTime = Math.round(performance.now() - startTime);

			// Type guard to ensure we have a working generator
			if (typeof generatorPipeline !== 'function') {
				throw new Error('Failed to create text generation pipeline');
			}

			this.generator = generatorPipeline as TextGenerator;
			this.currentModelId = modelId;
			this.isInitialized = true;

			console.log(`🎉 LLM: Successfully loaded ${modelConfig.name} in ${loadTime}ms`);
		} catch (error) {
			console.error(`❌ LLM: Failed to load ${modelConfig.name}:`, error);
			throw error;
		}
	}

	async describeRoom(room: Room, gameState: GameState, modelId?: ModelId): Promise<string> {
		const targetModelId = modelId || this.currentModelId || 'tinyllama-1.1b';
		await this.initialize(targetModelId);

		const modelConfig = LLMNarrator.getModelConfig(targetModelId);
		const context = this.extractRoomContext(room);
		const prompt = this.buildRoomPrompt(context, gameState);

		if (!this.generator) {
			throw new Error('LLM generator not initialized');
		}

		console.log(`💭 LLM: Generating room description using ${modelConfig?.name} (${targetModelId})`);
		const startTime = performance.now();

		try {
			// Generate text using the pipeline
			const result = await this.generator(prompt, {
				max_new_tokens: 150,
				temperature: 0.7,
				do_sample: true,
				top_p: 0.9,
				repetition_penalty: 1.1
			});

			const generationTime = Math.round(performance.now() - startTime);

			// Handle result format
			const generatedText = Array.isArray(result) && result.length > 0 && result[0]
				? result[0].generated_text
				: '';

			if (!generatedText) {
				throw new Error('LLM failed to generate description');
			}

			const cleanedText = this.cleanGeneratedText(generatedText, prompt);
			console.log(`✨ LLM: Generated description in ${generationTime}ms: "${cleanedText.substring(0, 50)}..."`);
			return cleanedText;
		} catch (error) {
			const generationTime = Math.round(performance.now() - startTime);
			console.error(`❌ LLM: Generation failed after ${generationTime}ms:`, error);
			throw error;
		}
	}

	async switchModel(modelId: ModelId): Promise<void> {
		if (this.currentModelId === modelId) {
			console.log(`🔄 LLM: Model switch requested but already using ${modelId}`);
			return;
		}

		const fromModel = this.currentModelId;
		console.log(`🔄 LLM: Switching model from ${fromModel || 'none'} to ${modelId}...`);

		// Reset current state
		this.isInitialized = false;
		this.initializationPromise = null;
		this.generator = null;
		this.currentModelId = null;

		// Initialize with new model
		await this.initialize(modelId);
		console.log(`✅ LLM: Model switch complete - now using ${modelId}`);
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

export { AVAILABLE_MODELS };
export type { ModelConfig, ModelId };