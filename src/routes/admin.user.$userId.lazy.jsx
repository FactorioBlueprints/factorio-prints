import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import AdminUserView from '../components/AdminUserView';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/admin/user/$userId')({
	component: AdminUserViewComponent,
});

function AdminUserViewComponent()
{
	const { userId } = Route.useParams();

	return (
		<ErrorBoundary>
			<AdminUserView userId={userId} />
		</ErrorBoundary>
	);
}
