import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import MostFavoritedGrid from '../components/MostFavoritedGrid';

export const Route = createFileRoute('/top')({
	component: TopComponent,
});

function TopComponent() {
	return (
		<ErrorBoundary>
			<MostFavoritedGrid />
		</ErrorBoundary>
	);
}
