import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import BlueprintGrid from '../components/BlueprintGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/blueprints')({
	component: BlueprintsComponent,
});

function BlueprintsComponent()
{
	return (
		<ErrorBoundary>
			<BlueprintGrid />
		</ErrorBoundary>
	);
}
