import { useEffect, useRef } from 'react';
import { Paper, Box, Typography } from '@mui/material';
import type { Message } from '../models/Room';
import { MessageType } from '../models/Room';

interface MessageLogProps {
	messages: Message[];
	maxMessages?: number;
}

export function MessageLog({ messages, maxMessages = 50 }: MessageLogProps) {
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const recentMessages = messages.slice(-maxMessages);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (messagesContainerRef.current) {
			const container = messagesContainerRef.current;
			container.scrollTop = container.scrollHeight;
		}
	}, [messages.length, messages[messages.length - 1]?.id]);

	const getMessageColor = (type: MessageType) => {
		switch (type) {
			case MessageType.SYSTEM:
				return 'primary.main';
			case MessageType.ACTION:
				return 'text.primary';
			case MessageType.COMBAT:
				return 'error.main';
			case MessageType.DESCRIPTION:
				return 'text.secondary';
			case MessageType.ERROR:
				return 'error.main';
			default:
				return 'text.primary';
		}
	};

	return (
		<Paper
			ref={messagesContainerRef}
			sx={{ p: 2, height: '400px', overflow: 'auto' }}
		>
			<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
				{recentMessages.map((message) => (
					<Typography
						key={message.id}
						variant="body2"
						sx={{
							color: getMessageColor(message.type),
							fontFamily: 'monospace',
							whiteSpace: 'pre-wrap'
						}}
					>
						{message.text}
					</Typography>
				))}
			</Box>
		</Paper>
	);
}