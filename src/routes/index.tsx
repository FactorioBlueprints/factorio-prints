import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import BlueprintGrid from '../components/BlueprintGrid';
import ErrorBoundary from '../components/ErrorBoundary';
import Intro from '../components/Intro';

export const Route = createFileRoute('/')({
	component: IndexComponent,
});

function IndexComponent() {
	return (
		<ErrorBoundary>
			<div>
				<Intro />
				<BlueprintGrid />
			</div>
		</ErrorBoundary>
	);
}
