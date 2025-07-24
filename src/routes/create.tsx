import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import Create from '../components/Create';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/create')({
	component: CreateComponent,
});

function CreateComponent() {
	return (
		<ErrorBoundary>
			<Create />
		</ErrorBoundary>
	);
}
