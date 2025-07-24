import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import BlueprintGrid from '../components/BlueprintGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/blueprints')({
	component: BlueprintsComponent,
});

function BlueprintsComponent() {
	return (
		<ErrorBoundary>
			<BlueprintGrid />
		</ErrorBoundary>
	);
}
