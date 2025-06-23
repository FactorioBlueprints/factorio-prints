import React from 'react';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import * as Sentry from '@sentry/react';
import { routeTree } from './routeTree.gen.js';

const router = createRouter({
	routeTree,
	defaultPreload         : 'intent',
	defaultPreloadStaleTime: 0,
	defaultOnError         : (error) => {
		if (error.message && (
			error.message.includes('Failed to fetch dynamically imported module') ||
			error.message.includes('is not a valid JavaScript MIME type')
		)) {
			Sentry.captureException(error, {
				tags: {
					error_type: 'lazy_load_failure',
				},
				extra: {
					message: 'Module import failed, likely due to outdated code',
				},
			});
			window.location.reload();
			return;
		}
		Sentry.captureException(error);
	},
});

export function Router()
{
	return <RouterProvider router={router} />;
}
