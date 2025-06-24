import React from 'react';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import * as Sentry from '@sentry/react';
import { routeTree } from './routeTree.gen';

// Create the router instance with type assertion to work around strictNullChecks requirement
// TODO: Remove this assertion once strictNullChecks is enabled project-wide
const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	defaultPreloadStaleTime: 0,
	defaultOnError         : (error) =>
	{
		Sentry.captureException(error);
	},
} as any);

// Register the router instance for type safety
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}

export function Router(): React.ReactElement {
	return <RouterProvider router={router} />;
}
