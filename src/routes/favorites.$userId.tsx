import React from 'react';
import {createFileRoute} from '@tanstack/react-router';
import UserFavoritesGrid from '../components/UserFavoritesGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/favorites/$userId')({
	component: UserFavoritesComponent,
});

function UserFavoritesComponent() {
	return (
		<ErrorBoundary>
			<UserFavoritesGrid />
		</ErrorBoundary>
	);
}
