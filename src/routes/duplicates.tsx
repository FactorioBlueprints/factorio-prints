import {createFileRoute} from '@tanstack/react-router';
import React from 'react';

import DuplicatesGrid from '../components/DuplicatesGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/duplicates')({
	component: DuplicatesPage,
});

function DuplicatesPage() {
	return (
		<ErrorBoundary>
			<DuplicatesGrid />
		</ErrorBoundary>
	);
}
