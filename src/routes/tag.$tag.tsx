import React from 'react';
import {createFileRoute} from '@tanstack/react-router';
import SingleTagGrid from '../components/SingleTagGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/tag/$tag')({
	component: TagComponent,
});

function TagComponent() {
	return (
		<ErrorBoundary>
			<SingleTagGrid />
		</ErrorBoundary>
	);
}
