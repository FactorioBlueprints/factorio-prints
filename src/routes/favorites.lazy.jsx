import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import FavoritesGrid from '../components/MyFavoritesGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/favorites')({
	component: FavoritesComponent,
});

function FavoritesComponent()
{
	return (
		<ErrorBoundary>
			<FavoritesGrid />
		</ErrorBoundary>
	);
}
