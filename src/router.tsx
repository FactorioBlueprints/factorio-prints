import React from 'react';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import * as Sentry from '@sentry/react';
import { routeTree } from './routeTree.gen.ts';

// @ts-expect-error TanStack Router requires strictNullChecks which we haven't enabled yet
const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	defaultPreloadStaleTime: 0,
	defaultOnError         : (error) =>
	{
		Sentry.captureException(error);
	},
});

export function Router(): React.ReactElement {
	return <RouterProvider router={router} />;
}
