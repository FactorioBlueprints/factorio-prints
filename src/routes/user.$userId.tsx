import React from 'react';
import {createFileRoute} from '@tanstack/react-router';
import UserGrid from '../components/UserGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/user/$userId')({
	component: UserComponent,
});

function UserComponent() {
	return (
		<ErrorBoundary>
			<UserGrid />
		</ErrorBoundary>
	);
}
