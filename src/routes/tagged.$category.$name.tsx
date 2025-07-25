import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import SingleTagGrid from '../components/SingleTagGrid';

export const Route = createFileRoute('/tagged/$category/$name')({
	component: TaggedRouteComponent,
});

function TaggedRouteComponent() {
	return (
		<ErrorBoundary>
			<SingleTagGrid />
		</ErrorBoundary>
	);
}
