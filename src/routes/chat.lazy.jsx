import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import Chat from '../components/Chat';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/chat')({
	component: ChatComponent,
});

function ChatComponent()
{
	return (
		<ErrorBoundary>
			<Chat />
		</ErrorBoundary>
	);
}
