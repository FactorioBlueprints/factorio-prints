import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import SingleBlueprintWithQuery from '../components/SingleBlueprintWithQuery';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/view/$blueprintId')({
	component: ViewBlueprintComponent,
});

function ViewBlueprintComponent()
{
	return (
		<ErrorBoundary>
			<SingleBlueprintWithQuery />
		</ErrorBoundary>
	);
}
