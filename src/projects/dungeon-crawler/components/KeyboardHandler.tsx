import { useEffect } from 'react';

export interface KeyboardShortcut {
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	action: () => void;
	description: string;
}

interface KeyboardHandlerProps {
	shortcuts: KeyboardShortcut[];
	disabled?: boolean;
}

export function KeyboardHandler({ shortcuts, disabled = false }: KeyboardHandlerProps) {
	useEffect(() => {
		if (disabled) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			// Don't handle shortcuts if user is typing in an input or textarea
			const target = event.target as HTMLElement;
			if (
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable
			) {
				return;
			}

			const matchingShortcut = shortcuts.find(shortcut => {
				const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
				const ctrlMatch = (shortcut.ctrl || false) === (event.ctrlKey || event.metaKey);
				const shiftMatch = (shortcut.shift || false) === event.shiftKey;
				const altMatch = (shortcut.alt || false) === event.altKey;

				return keyMatch && ctrlMatch && shiftMatch && altMatch;
			});

			if (matchingShortcut) {
				event.preventDefault();
				matchingShortcut.action();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [shortcuts, disabled]);

	return null; // This component doesn't render anything
}

// Common keyboard shortcuts for the game
export const createGameShortcuts = (handlers: {
	onCommand: (command: string) => void;
	onShowSpellBook?: () => void;
	onShowSave?: () => void;
	onShowLoad?: () => void;
	onCombatAction?: (action: any) => void;
}): KeyboardShortcut[] => [
	// Movement shortcuts
	{
		key: 'ArrowUp',
		action: () => handlers.onCommand('north'),
		description: 'Move North'
	},
	{
		key: 'ArrowDown',
		action: () => handlers.onCommand('south'),
		description: 'Move South'
	},
	{
		key: 'ArrowLeft',
		action: () => handlers.onCommand('west'),
		description: 'Move West'
	},
	{
		key: 'ArrowRight',
		action: () => handlers.onCommand('east'),
		description: 'Move East'
	},
	{
		key: 'w',
		action: () => handlers.onCommand('north'),
		description: 'Move North'
	},
	{
		key: 's',
		action: () => handlers.onCommand('south'),
		description: 'Move South'
	},
	{
		key: 'a',
		action: () => handlers.onCommand('west'),
		description: 'Move West'
	},
	{
		key: 'd',
		action: () => handlers.onCommand('east'),
		description: 'Move East'
	},

	// Action shortcuts
	{
		key: 'l',
		action: () => handlers.onCommand('look'),
		description: 'Look around'
	},
	{
		key: 'i',
		action: () => handlers.onCommand('inventory'),
		description: 'Open inventory'
	},
	{
		key: 'r',
		action: () => handlers.onCommand('rest'),
		description: 'Rest'
	},
	{
		key: 'Enter',
		action: () => handlers.onCommand('look'),
		description: 'Look around'
	},

	// Combat shortcuts (when in combat)
	{
		key: 'Space',
		action: () => handlers.onCombatAction?.('attack'),
		description: 'Attack in combat'
	},
	{
		key: 'f',
		action: () => handlers.onCombatAction?.('flee'),
		description: 'Flee from combat'
	},

	// UI shortcuts
	{
		key: 'c',
		action: () => handlers.onShowSpellBook?.(),
		description: 'Open spell book'
	},
	{
		key: 's',
		ctrl: true,
		action: () => handlers.onShowSave?.(),
		description: 'Save game'
	},
	{
		key: 'l',
		ctrl: true,
		action: () => handlers.onShowLoad?.(),
		description: 'Load game'
	},
	{
		key: 'Escape',
		action: () => {
			// Close any open dialogs or modals
			const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
			document.dispatchEvent(escapeEvent);
		},
		description: 'Close dialogs'
	}
];

// Utility function to format shortcut display
export function formatShortcut(shortcut: KeyboardShortcut): string {
	const parts: string[] = [];

	if (shortcut.ctrl) parts.push('Ctrl');
	if (shortcut.shift) parts.push('Shift');
	if (shortcut.alt) parts.push('Alt');

	// Format key names for display
	let keyName = shortcut.key;
	switch (shortcut.key) {
		case 'ArrowUp':
			keyName = '↑';
			break;
		case 'ArrowDown':
			keyName = '↓';
			break;
		case 'ArrowLeft':
			keyName = '←';
			break;
		case 'ArrowRight':
			keyName = '→';
			break;
		case 'Enter':
			keyName = 'Enter';
			break;
		case 'Space':
			keyName = 'Space';
			break;
		case 'Escape':
			keyName = 'Esc';
			break;
		default:
			keyName = shortcut.key.toUpperCase();
	}

	parts.push(keyName);

	return parts.join('+');
}