import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import FavoritesGrid from '../components/MyFavoritesGrid';

export const Route = createFileRoute('/favorites/')({
	component: FavoritesComponent,
});

function FavoritesComponent() {
	return (
		<ErrorBoundary>
			<FavoritesGrid />
		</ErrorBoundary>
	);
}
