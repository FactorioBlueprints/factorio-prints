import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import MostFavoritedGrid from '../components/MostFavoritedGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/top')({
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
