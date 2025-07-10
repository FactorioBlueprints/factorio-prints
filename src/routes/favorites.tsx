import React from 'react';
import {createFileRoute} from '@tanstack/react-router';
import FavoritesGrid from '../components/MyFavoritesGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/favorites')({
	component: FavoritesComponent,
});

function FavoritesComponent() {
	return (
		<ErrorBoundary>
			<FavoritesGrid />
		</ErrorBoundary>
	);
}
