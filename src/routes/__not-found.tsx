import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import NoMatch from '../components/NoMatch';

export const Route = createFileRoute('/__not-found')({
	component: NotFoundComponent,
});

function NotFoundComponent() {
	return (
		<ErrorBoundary>
			<NoMatch />
		</ErrorBoundary>
	);
}
