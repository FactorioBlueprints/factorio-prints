import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import MostFavoritedGrid from '../components/MostFavoritedGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/top')({
	component: TopComponent,
});

function TopComponent()
{
	return (
		<ErrorBoundary>
			<MostFavoritedGrid />
		</ErrorBoundary>
	);
}
