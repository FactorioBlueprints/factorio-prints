import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import AdminUserView from '../components/AdminUserView';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/admin/user/$userId')({
	component: AdminUserViewComponent,
});

function AdminUserViewComponent() {
	return (
		<ErrorBoundary>
			<AdminUserView />
		</ErrorBoundary>
	);
}
