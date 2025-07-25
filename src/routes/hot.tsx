import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import HotBlueprintsGrid from '../components/HotBlueprintsGrid';

export const Route = createFileRoute('/hot')({
	component: HotComponent,
});

function HotComponent() {
	return (
		<ErrorBoundary>
			<HotBlueprintsGrid />
		</ErrorBoundary>
	);
}
