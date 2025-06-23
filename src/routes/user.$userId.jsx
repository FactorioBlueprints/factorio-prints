import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import UserGrid from '../components/UserGrid';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/user/$userId')({
	component: UserComponent,
	// This route could have a loader that fetches the user data
	// loader: ({ params }) => {
	//   return fetchUserById(params.userId)
	// }
});

function UserComponent()
{
	return (
		<ErrorBoundary>
			<UserGrid />
		</ErrorBoundary>
	);
}
