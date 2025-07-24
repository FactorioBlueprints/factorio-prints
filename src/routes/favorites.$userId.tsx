import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import UserFavoritesGrid from '../components/UserFavoritesGrid';

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
