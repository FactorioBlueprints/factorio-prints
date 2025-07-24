import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import SingleTagGrid from '../components/SingleTagGrid';

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
