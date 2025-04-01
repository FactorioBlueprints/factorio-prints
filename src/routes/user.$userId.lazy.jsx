import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import UserGrid from '../components/UserGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/user/$userId')({
	component: UserComponent,
});

function UserComponent()
{
	return (
		<ErrorBoundary>
			<UserGrid />
		</ErrorBoundary>
	);
}
