import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import Create from '../components/Create';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/create')({
	component: CreateComponent,
});

function CreateComponent()
{
	return (
		<ErrorBoundary>
			<Create />
		</ErrorBoundary>
	);
}
