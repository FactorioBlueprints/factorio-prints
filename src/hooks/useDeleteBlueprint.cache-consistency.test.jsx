import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { update as dbUpdate } from 'firebase/database';
import { useDeleteBlueprint } from './useUpdateBlueprint';

// Mock Firebase
vi.mock('firebase/database', () => ({
	getDatabase: vi.fn(),
	ref        : vi.fn(),
	update     : vi.fn(),
}));

// Mock router
vi.mock('@tanstack/react-router', () => ({
	useNavigate: vi.fn(),
}));

// Mock base
vi.mock('../base', () => ({
	app: {},
}));

describe('useDeleteBlueprint cache consistency', () =>
{
	let queryClient;
	let wrapper;
	let navigateMock;

	beforeEach(() =>
	{
		vi.clearAllMocks();
		queryClient = new QueryClient({
			defaultOptions: {
				queries  : { retry: false },
				mutations: { retry: false },
			},
		});
		wrapper = ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		navigateMock = vi.fn();
		useNavigate.mockReturnValue(navigateMock);
	});

	it('should maintain cache consistency across all related data structures', async () =>
	{
		dbUpdate.mockResolvedValue();

		const blueprintId = 'test-blueprint-id';
		const authorId = 'test-author-id';
		const tags = ['combat', 'logistics', 'production'];

		// Set up cache spies to verify operations
		const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
		const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');
		const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

		// Cache user blueprints list
		const userBlueprintsKey = ['users', 'userId', authorId, 'blueprints'];
		queryClient.setQueryData(userBlueprintsKey, [
			'other-blueprint-1',
			blueprintId,
			'other-blueprint-2',
		]);

		// Cache tag data for each tag
		const tag1Key = ['byTag', 'combat'];
		const tag2Key = ['byTag', 'logistics'];
		const tag3Key = ['byTag', 'production'];

		queryClient.setQueryData(tag1Key, {
			[blueprintId]      : true,
			'other-blueprint-1': true,
			'other-blueprint-3': true,
		});
		queryClient.setQueryData(tag2Key, {
			[blueprintId]      : true,
			'other-blueprint-2': true,
		});
		queryClient.setQueryData(tag3Key, {
			[blueprintId]: true,
		});

		// Clear spies after setup to only track deletion operations
		setQueryDataSpy.mockClear();

		// Execute deletion
		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id: blueprintId,
			authorId,
			tags,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify cache operations were performed correctly
		expect(invalidateQueriesSpy).toHaveBeenCalledWith({
			queryKey: ['blueprintSummaries', 'orderByField', 'lastUpdatedDate'],
		});

		// Verify user blueprints cache was updated
		expect(setQueryDataSpy).toHaveBeenCalledWith(
			userBlueprintsKey,
			['other-blueprint-1', 'other-blueprint-2'],
		);

		// Verify tag caches were updated to remove the blueprint
		expect(setQueryDataSpy).toHaveBeenCalledWith(tag1Key, {
			'other-blueprint-1': true,
			'other-blueprint-3': true,
		});
		expect(setQueryDataSpy).toHaveBeenCalledWith(tag2Key, {
			'other-blueprint-2': true,
		});
		expect(setQueryDataSpy).toHaveBeenCalledWith(tag3Key, {});

		// Verify blueprint queries were removed from cache
		expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ['blueprints', 'blueprintId', blueprintId] });
		expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ['blueprintSummaries', 'blueprintId', blueprintId] });
	});

	it('should handle partial cache state gracefully', async () =>
	{
		dbUpdate.mockResolvedValue();

		const blueprintId = 'test-blueprint-id';
		const authorId = 'test-author-id';
		const tags = ['combat', 'logistics'];

		// Set up cache spies to verify operations
		const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

		// Set up only partial cache data
		queryClient.setQueryData(['byTag', 'combat'], {
			[blueprintId]    : true,
			'other-blueprint': true,
		});

		// Clear spy after setup
		setQueryDataSpy.mockClear();

		// No user blueprints cache
		// No individual blueprint cache
		// Only one tag cache

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id: blueprintId,
			authorId,
			tags,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify the existing cache was updated correctly using spy
		expect(setQueryDataSpy).toHaveBeenCalledWith(['byTag', 'combat'], {
			'other-blueprint': true,
		});

		// Operation should complete successfully
		expect(result.current.isSuccess).toBe(true);
		expect(navigateMock).toHaveBeenCalledWith({ to: `/user/${authorId}` });
	});

	it('should maintain referential integrity across multiple cache entries', async () =>
	{
		dbUpdate.mockResolvedValue();

		const blueprintId = 'shared-blueprint-id';
		const authorId = 'author-id';
		const tags = ['shared-tag'];

		// Set up cache spies to verify operations
		const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

		// Set up cache where blueprint appears in multiple places
		const userBlueprints1 = ['blueprint-1', blueprintId, 'blueprint-2'];
		const userBlueprints2 = [blueprintId, 'other-blueprint'];
		const tagData = {
			[blueprintId]: true,
			'blueprint-1': true,
			'blueprint-2': true,
		};

		queryClient.setQueryData(['users', 'userId', authorId, 'blueprints'], userBlueprints1);
		queryClient.setQueryData(['users', 'userId', 'other-author', 'blueprints'], userBlueprints2);
		queryClient.setQueryData(['byTag', 'shared-tag'], tagData);

		// Clear spy after setup
		setQueryDataSpy.mockClear();

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id: blueprintId,
			authorId,
			tags,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify only the correct user's blueprints list was updated using spy
		expect(setQueryDataSpy).toHaveBeenCalledWith(
			['users', 'userId', authorId, 'blueprints'],
			['blueprint-1', 'blueprint-2'],
		);

		// Verify tag data was updated correctly using spy
		expect(setQueryDataSpy).toHaveBeenCalledWith(['byTag', 'shared-tag'], {
			'blueprint-1': true,
			'blueprint-2': true,
		});

		// Verify other user's blueprints were NOT updated (spy should not have been called with other author)
		expect(setQueryDataSpy).not.toHaveBeenCalledWith(
			['users', 'userId', 'other-author', 'blueprints'],
			expect.anything(),
		);
	});

	it('should handle edge case of blueprint in multiple tags with different cache states', async () =>
	{
		dbUpdate.mockResolvedValue();

		const blueprintId = 'multi-tag-blueprint';
		const authorId = 'author-id';
		const tags = ['tag-with-cache', 'tag-without-cache', 'tag-empty'];

		// Set up cache spies to verify operations
		const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

		// Set up different cache states for different tags
		queryClient.setQueryData(['byTag', 'tag-with-cache'], {
			[blueprintId]      : true,
			'other-blueprint-1': true,
			'other-blueprint-2': true,
		});

		// tag-without-cache has no cache entry
		// tag-empty has an empty cache
		queryClient.setQueryData(['byTag', 'tag-empty'], {});

		// Clear spy after setup
		setQueryDataSpy.mockClear();

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id: blueprintId,
			authorId,
			tags,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify only cached tag with data was updated using spy
		expect(setQueryDataSpy).toHaveBeenCalledWith(['byTag', 'tag-with-cache'], {
			'other-blueprint-1': true,
			'other-blueprint-2': true,
		});

		// Verify only one setQueryData call was made (only for tag-with-cache)
		expect(setQueryDataSpy).toHaveBeenCalledTimes(1);

		// Missing cache and empty cache should not be updated based on the implementation
		// The hook only updates existing caches that contain the blueprint ID

		expect(result.current.isSuccess).toBe(true);
	});

	it('should ensure clean cache state after deletion', async () =>
	{
		dbUpdate.mockResolvedValue();

		const blueprintId = 'cleanup-test-blueprint';
		const authorId = 'test-author';
		const tags = ['cleanup-tag'];

		// Set up cache with blueprint data
		const blueprint = { id: blueprintId, title: 'Test' };
		const summary = { title: 'Test', imgurId: 'test' };

		queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], blueprint);
		queryClient.setQueryData(['blueprintSummaries', 'blueprintId', blueprintId], summary);

		// Verify data exists before deletion
		expect(queryClient.getQueryData(['blueprints', 'blueprintId', blueprintId])).toBeDefined();
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', blueprintId])).toBeDefined();

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id: blueprintId,
			authorId,
			tags,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify complete cleanup
		expect(queryClient.getQueryData(['blueprints', 'blueprintId', blueprintId])).toBeUndefined();
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', blueprintId])).toBeUndefined();

		// Verify no stale references remain in cache
		const allQueryData = queryClient.getQueryCache().getAll();
		const blueprintReferences = allQueryData.filter(query =>
			JSON.stringify(query.queryKey).includes(blueprintId),
		);

		// Should have no remaining references to the deleted blueprint
		expect(blueprintReferences).toHaveLength(0);
	});
});
