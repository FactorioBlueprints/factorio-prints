import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useNavigate} from '@tanstack/react-router';
import {renderHook, waitFor} from '@testing-library/react';
import {update as dbUpdate} from 'firebase/database';
import type React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useDeleteBlueprint} from './useUpdateBlueprint';

// Mock Firebase
vi.mock('firebase/database', () => ({
	getDatabase: vi.fn(),
	ref: vi.fn(),
	update: vi.fn(),
}));

// Mock router
vi.mock('@tanstack/react-router', () => ({
	useNavigate: vi.fn(),
}));

// Mock base
vi.mock('../base', () => ({
	app: {},
}));

describe('useDeleteBlueprint user page cache invalidation', () => {
	let queryClient: QueryClient;
	let wrapper: ({children}: {children: React.ReactNode}) => React.JSX.Element;
	let navigateMock: any;

	beforeEach(() => {
		vi.clearAllMocks();
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {retry: false},
				mutations: {retry: false},
			},
		});
		wrapper = ({children}: {children: React.ReactNode}) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		navigateMock = vi.fn();
		vi.mocked(useNavigate).mockReturnValue(navigateMock);
	});

	it('should invalidate user blueprint queries when a blueprint is deleted', async () => {
		vi.mocked(dbUpdate).mockResolvedValue(undefined);

		const blueprintId = 'test-blueprint-id';
		const authorId = 'test-author-id';
		const tags = ['combat', 'logistics'];

		// Set up cache spies to verify operations
		const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

		// Set up user blueprints cache
		const userBlueprintsKey = ['users', 'userId', authorId, 'blueprints'];
		queryClient.setQueryData(userBlueprintsKey, {
			'other-blueprint-1': true,
			[blueprintId]: true,
			'other-blueprint-2': true,
		});

		// Execute deletion
		const {result} = renderHook(() => useDeleteBlueprint(), {wrapper});

		result.current.mutate({
			id: blueprintId,
			authorId,
			tags,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify that user blueprint queries are invalidated
		// This is what's currently missing in the implementation
		expect(invalidateQueriesSpy).toHaveBeenCalledWith({
			queryKey: ['users', 'userId', authorId, 'blueprints'],
		});

		// Should also invalidate the general blueprintSummaries query
		expect(invalidateQueriesSpy).toHaveBeenCalledWith({
			queryKey: ['blueprintSummaries', 'orderByField', 'lastUpdatedDate'],
		});
	});

	it('should ensure UserGrid component refreshes data after blueprint deletion', async () => {
		vi.mocked(dbUpdate).mockResolvedValue(undefined);

		const blueprintId = 'grid-test-blueprint';
		const authorId = 'grid-test-author';
		const tags = ['test-tag'];

		// Set up cache spies
		const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

		// Simulate UserGrid having loaded data
		queryClient.setQueryData(['users', 'userId', authorId, 'blueprints'], {
			[blueprintId]: true,
			'blueprint-1': true,
			'blueprint-2': true,
		});

		// Simulate individual blueprint summaries being cached
		queryClient.setQueryData(['blueprintSummaries', 'blueprintId', blueprintId], {
			title: 'To Be Deleted',
			imgurId: 'test',
		});
		queryClient.setQueryData(['blueprintSummaries', 'blueprintId', 'blueprint-1'], {
			title: 'Blueprint 1',
			imgurId: 'test1',
		});
		queryClient.setQueryData(['blueprintSummaries', 'blueprintId', 'blueprint-2'], {
			title: 'Blueprint 2',
			imgurId: 'test2',
		});

		// Execute deletion
		const {result} = renderHook(() => useDeleteBlueprint(), {wrapper});

		result.current.mutate({
			id: blueprintId,
			authorId,
			tags,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify user blueprint list query is invalidated
		// This ensures UserGrid will refetch the updated list
		expect(invalidateQueriesSpy).toHaveBeenCalledWith({
			queryKey: ['users', 'userId', authorId, 'blueprints'],
		});

		// Verify the deleted blueprint's individual queries are cleaned up
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', blueprintId])).toBeUndefined();
	});

	it('should handle cross-user blueprint display consistency', async () => {
		vi.mocked(dbUpdate).mockResolvedValue(undefined);

		const blueprintId = 'shared-blueprint';
		const authorId = 'original-author';
		const tags = ['shared'];

		// Set up cache spies
		const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

		// Original author has the blueprint
		queryClient.setQueryData(['users', 'userId', authorId, 'blueprints'], {
			[blueprintId]: true,
			'other-blueprint': true,
		});

		// Viewer is looking at author's page
		// This simulates the UserGrid component having fetched the author's blueprints
		queryClient.setQueryData(['users', 'userId', authorId, 'blueprints'], {
			[blueprintId]: true,
			'other-blueprint': true,
		});

		// Execute deletion
		const {result} = renderHook(() => useDeleteBlueprint(), {wrapper});

		result.current.mutate({
			id: blueprintId,
			authorId,
			tags,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Should invalidate the author's blueprint list
		// This ensures any viewer of the author's page sees the updated list
		expect(invalidateQueriesSpy).toHaveBeenCalledWith({
			queryKey: ['users', 'userId', authorId, 'blueprints'],
		});
	});
});
