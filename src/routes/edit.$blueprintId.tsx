import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import EditBlueprint from '../components/EditBlueprint';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/edit/$blueprintId')({
	component: EditBlueprintComponent,
});

function EditBlueprintComponent() {
	return (
		<ErrorBoundary>
			<EditBlueprint />
		</ErrorBoundary>
	);
}
