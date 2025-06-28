import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import SingleBlueprint from '../components/SingleBlueprint';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/view/$blueprintId')({
	component: ViewBlueprintComponent,
	// This route could have a loader that fetches the blueprint data
	// loader: ({ params }) => {
	//   return fetchBlueprintById(params.blueprintId)
	// }
});

function ViewBlueprintComponent()
{
	return (
		<ErrorBoundary>
			<SingleBlueprint />
		</ErrorBoundary>
	);
}
