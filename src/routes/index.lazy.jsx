import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import KnownIssues from '../components/KnownIssues';
import Intro from '../components/Intro';
import BlueprintGrid from '../components/BlueprintGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/')({
	component: IndexComponent,
});

function IndexComponent()
{
	return (
		<ErrorBoundary>
			<div>
				<KnownIssues />
				<Intro />
				<BlueprintGrid />
			</div>
		</ErrorBoundary>
	);
}
