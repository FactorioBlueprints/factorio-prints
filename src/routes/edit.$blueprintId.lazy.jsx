import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import EditBlueprint from '../components/EditBlueprint';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/edit/$blueprintId')({
	component: EditBlueprintComponent,
});

function EditBlueprintComponent()
{
	return (
		<ErrorBoundary>
			<EditBlueprint />
		</ErrorBoundary>
	);
}
