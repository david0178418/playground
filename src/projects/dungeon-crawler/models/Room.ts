// Re-exports for backward compatibility during transition
export type { Room, RoomContents, BaseDescription, Feature, Lock, Dungeon } from './RoomCore';
export { LockType, Direction, RoomType } from './RoomCore';
export type { Trap } from './RoomTraps';
export { TrapType, TrapEffect } from './RoomTraps';
export type { Puzzle } from './RoomPuzzles';
export { PuzzleType } from './RoomPuzzles';
export type { EnvironmentalHazard } from './EnvironmentalHazards';
export { HazardType, HazardSeverity, EnvironmentalEffect } from './EnvironmentalHazards';
export type { InteractiveElement, InteractiveEffect, RoomModification, CharacterStatusEffect } from './InteractiveElements';
export { InteractiveType, EffectTargetType, ModificationType, StatusEffectType } from './InteractiveElements';
export type { GameState, Message } from './GameState';
export { MessageType } from './GameState';