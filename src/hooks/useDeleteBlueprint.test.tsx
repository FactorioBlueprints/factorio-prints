import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ref, update as dbUpdate } from 'firebase/database';
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

// Mock schemas
vi.mock('../schemas', () => ({
	validateRawUserBlueprints: vi.fn((data) => data || {}),
}));

describe('useDeleteBlueprint', () =>
{
	let queryClient: QueryClient;
	let wrapper: ({ children }: { children: React.ReactNode }) => React.JSX.Element;
	let navigateMock: any;

	beforeEach(() =>
	{
		vi.clearAllMocks();
		queryClient = new QueryClient({
			defaultOptions: {
				queries  : { retry: false },
				mutations: { retry: false },
			},
		});
		wrapper = ({ children }: { children: React.ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		navigateMock = vi.fn();
		vi.mocked(useNavigate).mockReturnValue(navigateMock);
	});

	it('should delete blueprint from multiple database paths', async () =>
	{
		const mockRef = { path: 'mock-ref' };
		vi.mocked(ref).mockReturnValue(mockRef as any);
		vi.mocked(dbUpdate).mockResolvedValue(undefined);

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		const testData = {
			id      : 'test-blueprint-id',
			authorId: 'test-author-id',
			tags    : ['tag1', 'tag2', 'tag3'],
		};

		result.current.mutate(testData);

		await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });

		// Verify Firebase update was called with correct paths
		expect(dbUpdate).toHaveBeenCalledWith(mockRef, {
			'/blueprints/test-blueprint-id'                     : null,
			'/users/test-author-id/blueprints/test-blueprint-id': null,
			'/blueprintSummaries/test-blueprint-id'             : null,
			'/byTag/tag1/test-blueprint-id'                     : null,
			'/byTag/tag2/test-blueprint-id'                     : null,
			'/byTag/tag3/test-blueprint-id'                     : null,
		});
	});

	it('should handle empty tags array', async () =>
	{
		const mockRef = { path: 'mock-ref' };
		vi.mocked(ref).mockReturnValue(mockRef as any);
		vi.mocked(dbUpdate).mockResolvedValue(undefined);

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		const testData = {
			id      : 'test-blueprint-id',
			authorId: 'test-author-id',
			tags    : [],
		};

		result.current.mutate(testData);

		await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });

		// Verify Firebase update was called without tag paths
		expect(dbUpdate).toHaveBeenCalledWith(mockRef, {
			'/blueprints/test-blueprint-id'                     : null,
			'/users/test-author-id/blueprints/test-blueprint-id': null,
			'/blueprintSummaries/test-blueprint-id'             : null,
		});
	});

	it('should invalidate lastUpdatedDate queries on success', async () =>
	{
		vi.mocked(dbUpdate).mockResolvedValue(undefined);
		const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id      : 'test-id',
			authorId: 'test-author',
			tags    : [],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });

		expect(invalidateQueriesSpy).toHaveBeenCalledWith({
			queryKey: ['blueprintSummaries', 'orderByField', 'lastUpdatedDate'],
		});
	});

	it('should update user blueprints cache on success', async () =>
	{
		vi.mocked(dbUpdate).mockResolvedValue(undefined);

		// Set up existing user blueprints in cache
		const userBlueprintsKey = ['users', 'userId', 'test-author', 'blueprints'];
		queryClient.setQueryData(userBlueprintsKey, {
			"blueprint1": true,
			'test-id'   : true,
			"blueprint3": true,
		});

		const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id      : 'test-id',
			authorId: 'test-author',
			tags    : [],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });

		// Verify setQueryData was called for user blueprints
		expect(setQueryDataSpy).toHaveBeenCalledWith(
			userBlueprintsKey,
			{
				blueprint1: true,
				blueprint3: true,
			},
		);
	});

	it('should update tag caches on success', async () =>
	{
		vi.mocked(dbUpdate).mockResolvedValue(undefined);

		// Set up existing tag data in cache
		const tag1Key = ['byTag', 'tag1'];
		const tag2Key = ['byTag', 'tag2'];
		queryClient.setQueryData(tag1Key, {
			'test-id'        : true,
			'other-blueprint': true,
		});
		queryClient.setQueryData(tag2Key, {
			'test-id'          : true,
			'another-blueprint': true,
		});

		const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id      : 'test-id',
			authorId: 'test-author',
			tags    : ['tag1', 'tag2'],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });

		// Verify setQueryData was called for tag updates
		expect(setQueryDataSpy).toHaveBeenCalledWith(tag1Key, { 'other-blueprint': true });
		expect(setQueryDataSpy).toHaveBeenCalledWith(tag2Key, { 'another-blueprint': true });
	});

	it('should remove blueprint queries from cache on success', async () =>
	{
		vi.mocked(dbUpdate).mockResolvedValue(undefined);
		const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id      : 'test-id',
			authorId: 'test-author',
			tags    : [],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });

		expect(removeQueriesSpy).toHaveBeenCalledWith({
			queryKey: ['blueprints', 'blueprintId', 'test-id'],
		});
		expect(removeQueriesSpy).toHaveBeenCalledWith({
			queryKey: ['blueprintSummaries', 'blueprintId', 'test-id'],
		});
	});

	it('should navigate to user profile on success', async () =>
	{
		vi.mocked(dbUpdate).mockResolvedValue(undefined);

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id      : 'test-id',
			authorId: 'test-author',
			tags    : [],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });

		expect(navigateMock).toHaveBeenCalledWith({ to: '/user/$userId', params: { userId: 'test-author' }, from: '/edit/$blueprintId' });
	});

	it('should handle database update failure', async () =>
	{
		const error = new Error('Database update failed');
		vi.mocked(dbUpdate).mockRejectedValue(error);

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id      : 'test-id',
			authorId: 'test-author',
			tags    : [],
		});

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBe(error);
		expect(navigateMock).not.toHaveBeenCalled();
	});

	it('should handle missing user blueprints cache gracefully', async () =>
	{
		vi.mocked(dbUpdate).mockResolvedValue(undefined);

		// Don't set any user blueprints in cache
		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id      : 'test-id',
			authorId: 'test-author',
			tags    : [],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });

		// Should complete successfully even without existing cache data
		expect(navigateMock).toHaveBeenCalledWith({ to: '/user/$userId', params: { userId: 'test-author' }, from: '/edit/$blueprintId' });
	});

	it('should handle missing tag cache gracefully', async () =>
	{
		vi.mocked(dbUpdate).mockResolvedValue(undefined);

		// Don't set any tag data in cache
		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		result.current.mutate({
			id      : 'test-id',
			authorId: 'test-author',
			tags    : ['tag1', 'tag2'],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });

		// Should complete successfully even without existing tag cache data
		expect(navigateMock).toHaveBeenCalledWith({ to: '/user/$userId', params: { userId: 'test-author' }, from: '/edit/$blueprintId' });
	});

	it('should provide loading states', async () =>
	{
		let resolvePromise: any;
		vi.mocked(dbUpdate).mockImplementation(() => new Promise(resolve =>
		{
			resolvePromise = resolve;
		}));

		const { result } = renderHook(() => useDeleteBlueprint(), { wrapper });

		expect(result.current.isPending).toBe(false);

		result.current.mutate({
			id      : 'test-id',
			authorId: 'test-author',
			tags    : [],
		});

		// Wait for the mutation to start
		await waitFor(() => expect(result.current.isPending).toBe(true));

		// Resolve the promise to complete the mutation
		resolvePromise?.();

		await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });

		expect(result.current.isPending).toBe(false);
	});
});
