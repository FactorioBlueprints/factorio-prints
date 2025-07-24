import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import UserGrid from '../components/UserGrid';

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
