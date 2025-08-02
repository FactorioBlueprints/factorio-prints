import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import BlueprintGrid from '../components/BlueprintGrid';
import ErrorBoundary from '../components/ErrorBoundary';
import WelcomeBanner from '../components/WelcomeBanner';

export const Route = createFileRoute('/')({
	component: IndexComponent,
});

function IndexComponent() {
	return (
		<ErrorBoundary>
			<div>
				<WelcomeBanner />
				<BlueprintGrid />
			</div>
		</ErrorBoundary>
	);
}
