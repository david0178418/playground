import { useState, type KeyboardEvent } from 'react';
import { TextField, Box, Typography } from '@mui/material';

interface CommandInputProps {
	onCommand: (command: string) => void;
	disabled?: boolean;
	placeholder?: string;
}

export function CommandInput({ onCommand, disabled = false, placeholder = "Enter command..." }: CommandInputProps) {
	const [input, setInput] = useState('');
	const [commandHistory, setCommandHistory] = useState<string[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);

	const handleSubmit = () => {
		if (input.trim()) {
			onCommand(input.trim());
			setCommandHistory(prev => [...prev, input.trim()]);
			setInput('');
			setHistoryIndex(-1);
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSubmit();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (commandHistory.length > 0) {
				const newIndex = historyIndex === -1
					? commandHistory.length - 1
					: Math.max(0, historyIndex - 1);
				setHistoryIndex(newIndex);
				setInput(commandHistory[newIndex] || '');
			}
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (historyIndex !== -1) {
				const newIndex = historyIndex + 1;
				if (newIndex >= commandHistory.length) {
					setHistoryIndex(-1);
					setInput('');
				} else {
					setHistoryIndex(newIndex);
					setInput(commandHistory[newIndex] || '');
				}
			}
		}
	};

	return (
		<Box bgcolor="white" p={2} borderRadius={1} boxShadow={3}>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
				Type commands like: "north", "look", "get sword", "attack goblin", "inventory"
			</Typography>
			<TextField
				fullWidth
				value={input}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={handleKeyDown}
				disabled={disabled}
				placeholder={placeholder}
				variant="outlined"
				sx={{
					'& .MuiInputBase-input': {
						fontFamily: 'monospace'
					}
				}}
			/>
		</Box>
	);
}