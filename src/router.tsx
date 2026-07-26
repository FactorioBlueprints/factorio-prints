import {captureException} from '@sentry/react';
import {createRouter, RouterProvider} from '@tanstack/react-router';
import type React from 'react';
import {routeTree} from './routeTree.gen';

type RouterMatchDiagnostic = string;

interface RouterDiagnosticEntry {
	phase: string;
	timestamp: string;
	fromPath?: string;
	toPath: string;
	durationMilliseconds?: number;
	activeMatches: RouterMatchDiagnostic[];
	preloadedMatches?: RouterMatchDiagnostic[];
}

interface RouterNavigationDiagnosticEvent {
	type: string;
	fromLocation?: {pathname: string};
	toLocation: {pathname: string};
}

const maximumRouterDiagnosticEntries = 20;
const routerDiagnostics: RouterDiagnosticEntry[] = [];

// TODO: Remove this assertion once strictNullChecks is enabled project-wide
export const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	defaultPreloadStaleTime: 0,
	defaultOnError: (error: Error) => {
		// Network errors should be handled at source, but check just in case
		if (error instanceof TypeError && error.message === 'Failed to fetch') {
			return;
		}
		captureException(error);
	},
} as any);

function summarizeMatches(matches: typeof router.state.matches): RouterMatchDiagnostic[] {
	return matches.map(
		(match) =>
			`${match.id} route=${match.routeId} status=${match.status} fetching=${String(match.isFetching)} cause=${match.cause} preload=${match.preload} invalid=${match.invalid}`,
	);
}

function recordRouterDiagnostic(entry: Omit<RouterDiagnosticEntry, 'timestamp' | 'activeMatches'>): void {
	routerDiagnostics.push({
		...entry,
		timestamp: new Date().toISOString(),
		activeMatches: summarizeMatches(router.state.matches),
	});
	if (routerDiagnostics.length > maximumRouterDiagnosticEntries) {
		routerDiagnostics.shift();
	}
}

function recordNavigationDiagnostic(event: RouterNavigationDiagnosticEvent): void {
	recordRouterDiagnostic({
		phase: event.type,
		fromPath: event.fromLocation?.pathname,
		toPath: event.toLocation.pathname,
	});
}

router.subscribe('onBeforeNavigate', recordNavigationDiagnostic);
router.subscribe('onBeforeLoad', recordNavigationDiagnostic);
router.subscribe('onLoad', recordNavigationDiagnostic);
router.subscribe('onResolved', recordNavigationDiagnostic);

const preloadRoute = router.preloadRoute.bind(router);
router.preloadRoute = (async (options) => {
	const startedAt = Date.now();
	const builtLocation =
		(options as {_builtLocation?: {pathname: string}})._builtLocation ?? router.buildLocation(options as any);
	recordRouterDiagnostic({
		phase: 'preload-start',
		fromPath: router.state.location.pathname,
		toPath: builtLocation.pathname,
	});

	try {
		const matches = await preloadRoute(options);
		recordRouterDiagnostic({
			phase: 'preload-complete',
			fromPath: router.state.location.pathname,
			toPath: builtLocation.pathname,
			durationMilliseconds: Date.now() - startedAt,
			preloadedMatches: matches ? summarizeMatches(matches) : [],
		});
		return matches;
	} catch (error) {
		recordRouterDiagnostic({
			phase: 'preload-rejected',
			fromPath: router.state.location.pathname,
			toPath: builtLocation.pathname,
			durationMilliseconds: Date.now() - startedAt,
		});
		throw error;
	}
}) as typeof router.preloadRoute;

export function getRouterDiagnostics(): {
	currentPath: string;
	activeMatches: RouterMatchDiagnostic[];
	entries: RouterDiagnosticEntry[];
} {
	return {
		currentPath: router.state.location.pathname,
		activeMatches: summarizeMatches(router.state.matches),
		entries: routerDiagnostics.map((entry) => ({
			...entry,
			activeMatches: [...entry.activeMatches],
			preloadedMatches: entry.preloadedMatches ? [...entry.preloadedMatches] : undefined,
		})),
	};
}

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}

export function Router(): React.ReactElement {
	return <RouterProvider router={router} />;
}
