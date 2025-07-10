import React from 'react';
import {createFileRoute} from '@tanstack/react-router';
import EditBlueprint from '../components/EditBlueprint';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/edit/$blueprintId')({
	component: EditBlueprintComponent,
	// This route could have a loader that fetches the blueprint data for editing
	// loader: ({ params }) => {
	//   return fetchBlueprintById(params.blueprintId)
	// }
});

function EditBlueprintComponent() {
	return (
		<ErrorBoundary>
			<EditBlueprint />
		</ErrorBoundary>
	);
}
