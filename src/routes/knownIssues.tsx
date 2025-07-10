import React from 'react';
import {createFileRoute} from '@tanstack/react-router';
import KnownIssues from '../components/KnownIssues';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/knownIssues')({
	component: KnownIssuesComponent,
});

function KnownIssuesComponent() {
	return (
		<ErrorBoundary>
			<KnownIssues />
		</ErrorBoundary>
	);
}
