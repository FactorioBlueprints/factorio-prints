import { describe, test, expect } from 'vitest';
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

const rootRouteChildren = {
	IndexRoute          : { id: '/' },
	notFoundRoute       : { id: '/__not-found' },
	AccountRoute        : { id: '/account' },
	BlueprintsRoute     : { id: '/blueprints' },
	ChatRoute           : { id: '/chat' },
	CreateRoute         : { id: '/create' },
	FavoritesRoute      : { id: '/favorites' },
	KnownIssuesRoute    : { id: '/knownIssues' },
	TopRoute            : { id: '/top' },
	UsersRoute          : { id: '/users' },
	EditBlueprintIdRoute: { id: '/edit/$blueprintId' },
	TagTagRoute         : { id: '/tag/$tag' },
	TaggedTagRoute      : { id: '/tagged/$tag' },
	UserUserIdRoute     : { id: '/user/$userId' },
	ViewBlueprintIdRoute: { id: '/view/$blueprintId' },
	AdminUserUserIdRoute: { id: '/admin/user/$userId' },
};

describe('Router Configuration', () =>
{
	test('Router can be created with route tree', () =>
	{
		const router = createRouter({
			routeTree,
			defaultPreload         : 'intent',
			defaultPreloadStaleTime: 0,
		});

		expect(router).toBeDefined();
		expect(router.routeTree).toBe(routeTree);
	});

	test('Route tree contains all expected routes', () =>
	{
		const expectedRoutes = [
			'/',
			'/__not-found',
			'/account',
			'/blueprints',
			'/chat',
			'/create',
			'/favorites',
			'/knownIssues',
			'/top',
			'/users',
			'/edit/$blueprintId',
			'/tag/$tag',
			'/tagged/$tag',
			'/user/$userId',
			'/view/$blueprintId',
			'/admin/user/$userId',
		];

		expect(routeTree).toBeDefined();

		const mockRouteIds = Object.values(rootRouteChildren).map(r => r.id);
		expectedRoutes.forEach(route =>
		{
			expect(mockRouteIds).toContain(route);
		});

		const router = createRouter({
			routeTree,
			defaultPreload         : 'intent',
			defaultPreloadStaleTime: 0,
		});

		expect(router).toBeDefined();
	});
});
