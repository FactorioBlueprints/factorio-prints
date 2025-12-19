import {createFileRoute} from '@tanstack/react-router';
import React from 'react';

import Contributors from '../components/Contributors';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/contributors')({
	component: ContributorsPage,
});

function ContributorsPage() {
	return (
		<ErrorBoundary>
			<Contributors />
		</ErrorBoundary>
	);
}
