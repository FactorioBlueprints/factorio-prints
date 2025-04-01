import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import NoMatch from '../components/NoMatch';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/__not-found')({
	component: NotFoundComponent,
});

function NotFoundComponent()
{
	return (
		<ErrorBoundary>
			<NoMatch />
		</ErrorBoundary>
	);
}
