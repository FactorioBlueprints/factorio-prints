import * as Sentry from '@sentry/react';
import {createRouter, RouterProvider} from '@tanstack/react-router';
import type React from 'react';
import {routeTree} from './routeTree.gen';

// TODO: Remove this assertion once strictNullChecks is enabled project-wide
const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	defaultPreloadStaleTime: 0,
	defaultOnError: (error: Error) => {
		// Network errors should be handled at source, but check just in case
		if (error instanceof TypeError && error.message === 'Failed to fetch') {
			return;
		}
		Sentry.captureException(error);
	},
} as any);

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}

export function Router(): React.ReactElement {
	return <RouterProvider router={router} />;
}
