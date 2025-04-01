import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import AdminUsersGrid from '../components/AdminUsersGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/users')({
	component: UsersComponent,
});

function UsersComponent()
{
	return (
		<ErrorBoundary>
			<AdminUsersGrid />
		</ErrorBoundary>
	);
}
