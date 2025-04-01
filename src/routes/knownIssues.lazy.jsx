import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import KnownIssues from '../components/KnownIssues';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/knownIssues')({
	component: KnownIssuesComponent,
});

function KnownIssuesComponent()
{
	return (
		<ErrorBoundary>
			<KnownIssues />
		</ErrorBoundary>
	);
}
