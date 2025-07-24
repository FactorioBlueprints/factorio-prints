import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import KnownIssues from '../components/KnownIssues';

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
