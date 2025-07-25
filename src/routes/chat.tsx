import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import Chat from '../components/Chat';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/chat')({
	component: ChatComponent,
});

function ChatComponent() {
	return (
		<ErrorBoundary>
			<Chat />
		</ErrorBoundary>
	);
}
