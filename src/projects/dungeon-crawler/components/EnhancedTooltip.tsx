import type { ReactElement } from 'react';
import { Tooltip, Typography, Box, Divider } from '@mui/material';
import type { TooltipProps } from '@mui/material';
import {
	Info as InfoIcon,
	Help as HelpIcon,
	Error as ErrorIcon,
	Warning as WarningIcon,
	CheckCircle as SuccessIcon,
	Keyboard as KeyboardIcon
} from '@mui/icons-material';

export type TooltipType = 'info' | 'help' | 'error' | 'warning' | 'success' | 'keyboard';

interface EnhancedTooltipProps extends Omit<TooltipProps, 'title'> {
	title: string;
	description?: string;
	type?: TooltipType;
	shortcut?: string;
	children: ReactElement;
}

export function EnhancedTooltip({
	title,
	description,
	type = 'info',
	shortcut,
	children,
	...tooltipProps
}: EnhancedTooltipProps) {
	const getIcon = () => {
		switch (type) {
			case 'help':
				return <HelpIcon fontSize="small" />;
			case 'error':
				return <ErrorIcon fontSize="small" />;
			case 'warning':
				return <WarningIcon fontSize="small" />;
			case 'success':
				return <SuccessIcon fontSize="small" />;
			case 'keyboard':
				return <KeyboardIcon fontSize="small" />;
			default:
				return <InfoIcon fontSize="small" />;
		}
	};

	const getColor = () => {
		switch (type) {
			case 'help':
				return 'info.main';
			case 'error':
				return 'error.main';
			case 'warning':
				return 'warning.main';
			case 'success':
				return 'success.main';
			case 'keyboard':
				return 'secondary.main';
			default:
				return 'info.main';
		}
	};

	const tooltipContent = (
		<Box sx={{ maxWidth: 300 }}>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: description ? 1 : 0 }}>
				<Box sx={{ color: getColor() }}>
					{getIcon()}
				</Box>
				<Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
					{title}
				</Typography>
			</Box>

			{description && (
				<>
					<Typography variant="body2" sx={{ mb: shortcut ? 1 : 0 }}>
						{description}
					</Typography>
				</>
			)}

			{shortcut && (
				<>
					{description && <Divider sx={{ my: 1 }} />}
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
						<KeyboardIcon fontSize="small" sx={{ color: 'text.secondary' }} />
						<Typography variant="caption" sx={{
							fontFamily: 'monospace',
							backgroundColor: 'action.selected',
							px: 0.5,
							py: 0.25,
							borderRadius: 0.5,
							border: '1px solid',
							borderColor: 'divider'
						}}>
							{shortcut}
						</Typography>
					</Box>
				</>
			)}
		</Box>
	);

	return (
		<Tooltip
			title={tooltipContent}
			arrow
			enterDelay={300}
			leaveDelay={100}
			{...tooltipProps}
		>
			{children}
		</Tooltip>
	);
}

// Common tooltip content for game elements
export const gameTooltips = {
	// Commands
	commands: {
		look: {
			title: 'Look Command',
			description: 'Examine your surroundings, objects, or creatures in detail.',
			shortcut: 'L'
		},
		inventory: {
			title: 'Inventory',
			description: 'View and manage your carried items and equipment.',
			shortcut: 'I'
		},
		move: {
			title: 'Movement',
			description: 'Move in a direction (north, south, east, west) or use arrow keys.',
			shortcut: 'WASD / Arrows'
		},
		attack: {
			title: 'Attack',
			description: 'Engage in combat with enemies in the current room.',
			shortcut: 'A'
		},
		cast: {
			title: 'Cast Spell',
			description: 'Cast a spell from your spellbook if you have mana.',
			shortcut: 'C'
		},
		rest: {
			title: 'Rest',
			description: 'Recover health and mana over time. Cannot rest during combat.',
			shortcut: 'R'
		},
		save: {
			title: 'Save Game',
			description: 'Save your current progress to a save slot.',
			shortcut: 'Ctrl+S'
		},
		load: {
			title: 'Load Game',
			description: 'Load a previously saved game state.',
			shortcut: 'Ctrl+L'
		}
	},

	// Character stats
	stats: {
		hp: {
			title: 'Health Points',
			description: 'Your life force. When it reaches 0, you die. Recovers through rest or healing.',
			type: 'success' as TooltipType
		},
		mana: {
			title: 'Mana Points',
			description: 'Magical energy used to cast spells. Recovers through rest.',
			type: 'info' as TooltipType
		},
		strength: {
			title: 'Strength',
			description: 'Affects melee damage and carrying capacity.',
			type: 'info' as TooltipType
		},
		dexterity: {
			title: 'Dexterity',
			description: 'Affects accuracy, dodge chance, and initiative in combat.',
			type: 'info' as TooltipType
		},
		constitution: {
			title: 'Constitution',
			description: 'Affects maximum health and resistance to effects.',
			type: 'info' as TooltipType
		},
		intelligence: {
			title: 'Intelligence',
			description: 'Affects maximum mana, spell damage, and puzzle-solving.',
			type: 'info' as TooltipType
		},
		wisdom: {
			title: 'Wisdom',
			description: 'Affects spell resistance and perception of traps and secrets.',
			type: 'info' as TooltipType
		},
		charisma: {
			title: 'Charisma',
			description: 'Affects social interactions and some magical abilities.',
			type: 'info' as TooltipType
		}
	},

	// Combat actions
	combat: {
		attack: {
			title: 'Attack',
			description: 'Make a melee or ranged attack against a target.',
			type: 'warning' as TooltipType
		},
		defend: {
			title: 'Defend',
			description: 'Increase your defensive stance, reducing incoming damage.',
			type: 'info' as TooltipType
		},
		flee: {
			title: 'Flee',
			description: 'Attempt to escape from combat. May fail based on enemy speed.',
			type: 'error' as TooltipType
		}
	},

	// Room elements
	room: {
		exits: {
			title: 'Available Exits',
			description: 'Directions you can move from this room.',
			type: 'info' as TooltipType
		},
		enemies: {
			title: 'Enemies Present',
			description: 'Hostile creatures in this room. You must defeat or flee from them.',
			type: 'error' as TooltipType
		},
		items: {
			title: 'Items Available',
			description: 'Objects you can examine or take from this room.',
			type: 'success' as TooltipType
		},
		hazards: {
			title: 'Environmental Hazards',
			description: 'Dangerous environmental effects that may harm you.',
			type: 'warning' as TooltipType
		}
	}
};