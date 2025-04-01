import React from 'react';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen.js';

const router = createRouter({
	routeTree,
	defaultPreload         : 'intent',
	defaultPreloadStaleTime: 0,
});

export function Router()
{
	return <RouterProvider router={router} />;
}
