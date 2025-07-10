import React from 'react';
import {createFileRoute} from '@tanstack/react-router';
import AdminUsersGrid from '../components/AdminUsersGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/users')({
	component: UsersComponent,
});

function UsersComponent() {
	return (
		<ErrorBoundary>
			<AdminUsersGrid />
		</ErrorBoundary>
	);
}
