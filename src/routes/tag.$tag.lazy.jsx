import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import SingleTagGrid from '../components/SingleTagGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/tag/$tag')({
	component: TagComponent,
});

function TagComponent()
{
	return (
		<ErrorBoundary>
			<SingleTagGrid />
		</ErrorBoundary>
	);
}
