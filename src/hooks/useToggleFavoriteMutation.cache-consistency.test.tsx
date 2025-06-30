import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDatabase, ref, update as dbUpdate } from 'firebase/database';
import { useToggleFavoriteMutation } from './useToggleFavoriteMutation';

// Mock Firebase
vi.mock('firebase/database', () => ({
	getDatabase: vi.fn(),
	ref        : vi.fn(),
	update     : vi.fn(),
}));

vi.mock('../base', () => ({
	app: {},
}));

describe('useToggleFavoriteMutation cache consistency', () =>
{
	let queryClient: QueryClient;
	let wrapper: ({ children }: { children: React.ReactNode }) => React.JSX.Element;
	let mockDatabase: any;
	let mockRef: any;

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

		mockDatabase = {};
		mockRef = {};
		vi.mocked(getDatabase).mockReturnValue(mockDatabase);
		vi.mocked(ref).mockReturnValue(mockRef);
		vi.mocked(dbUpdate).mockResolvedValue(undefined);
	});

	it('should maintain cache consistency across all related data structures when favoriting', async () =>
	{
		const blueprintId = 'test-blueprint-id';
		const userId = 'test-user-id';

		// Set up cache spies to verify operations
		const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

		// Set up existing cache data for all 5 query keys
		// 1. Full blueprint data
		const existingBlueprint = {
			title              : 'Test Blueprint',
			blueprintString    : 'test-blueprint-string',
			createdDate        : Date.now(),
			descriptionMarkdown: 'Test description',
			lastUpdatedDate    : Date.now(),
			numberOfFavorites  : 5,
			favorites          : { 'other-user': true },
			author             : { displayName: 'Test Author', userId: 'author-id' },
			image              : { id: 'test-image', type: 'image/png' },
			tags               : ['test'],
		};
		queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], existingBlueprint);

		// 2. Blueprint summary data
		const existingSummary = {
			title            : 'Test Blueprint Summary',
			imgurId          : 'test-image',
			imgurType        : 'image/png',
			numberOfFavorites: 5,
		};
		queryClient.setQueryData(['blueprintSummaries', 'blueprintId', blueprintId], existingSummary);

		// 3. User favorites list
		const existingUserFavorites = {
			'other-blueprint-1': true,
			'other-blueprint-2': true,
		};
		queryClient.setQueryData(['users', 'userId', userId, 'favorites'], existingUserFavorites);

		// 4. User favorite status for this blueprint
		queryClient.setQueryData(
			['users', 'userId', userId, 'favorites', 'blueprintId', blueprintId],
			false,
		);

		// 5. Blueprint favorite status for this user
		queryClient.setQueryData(
			['blueprints', 'blueprintId', blueprintId, 'favorites', 'userId', userId],
			false,
		);

		// Clear spy after setup to only track mutation operations
		setQueryDataSpy.mockClear();

		// Execute favorite toggle (false to true)
		const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

		result.current.mutate({
			blueprintId,
			userId,
			isFavorite       : false,
			numberOfFavorites: 5,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify all 5 cache updates were performed
		expect(setQueryDataSpy).toHaveBeenCalledTimes(5);

		// 1. Verify full blueprint data was updated
		expect(setQueryDataSpy).toHaveBeenCalledWith(
			['blueprints', 'blueprintId', blueprintId],
			expect.any(Function),
		);
		const updatedBlueprint = queryClient.getQueryData(['blueprints', 'blueprintId', blueprintId]) as any;
		expect(updatedBlueprint).toEqual({
			title              : 'Test Blueprint',
			blueprintString    : 'test-blueprint-string',
			createdDate        : existingBlueprint.createdDate,
			descriptionMarkdown: 'Test description',
			lastUpdatedDate    : existingBlueprint.lastUpdatedDate,
			numberOfFavorites  : 6,
			favorites          : {
				'other-user': true,
				[userId]    : true,
			},
			author: { displayName: 'Test Author', userId: 'author-id' },
			image : { id: 'test-image', type: 'image/png' },
			tags  : ['test'],
		});

		// 2. Verify blueprint summary was updated
		expect(setQueryDataSpy).toHaveBeenCalledWith(
			['blueprintSummaries', 'blueprintId', blueprintId],
			expect.any(Function),
		);
		const updatedSummary = queryClient.getQueryData(['blueprintSummaries', 'blueprintId', blueprintId]) as any;
		expect(updatedSummary).toEqual({
			title            : 'Test Blueprint Summary',
			imgurId          : 'test-image',
			imgurType        : 'image/png',
			numberOfFavorites: 6,
		});

		// 3. Verify user favorites list was updated
		expect(setQueryDataSpy).toHaveBeenCalledWith(
			['users', 'userId', userId, 'favorites'],
			expect.any(Function),
		);
		const updatedUserFavorites = queryClient.getQueryData(['users', 'userId', userId, 'favorites']);
		expect(updatedUserFavorites).toEqual({
			'other-blueprint-1': true,
			'other-blueprint-2': true,
			[blueprintId]      : true,
		});

		// 4. Verify user favorite status was updated
		expect(setQueryDataSpy).toHaveBeenCalledWith(
			['users', 'userId', userId, 'favorites', 'blueprintId', blueprintId],
			true,
		);

		// 5. Verify blueprint favorite status was updated
		expect(setQueryDataSpy).toHaveBeenCalledWith(
			['blueprints', 'blueprintId', blueprintId, 'favorites', 'userId', userId],
			true,
		);
	});

	it('should maintain cache consistency when unfavoriting', async () =>
	{
		const blueprintId = 'test-blueprint-id';
		const userId = 'test-user-id';

		// Set up cache spies to verify operations
		const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

		// Set up existing cache data showing item is favorited
		const existingBlueprint = {
			title              : 'Test Blueprint',
			blueprintString    : 'test-blueprint-string',
			createdDate        : Date.now(),
			descriptionMarkdown: 'Test description',
			lastUpdatedDate    : Date.now(),
			numberOfFavorites  : 5,
			favorites          : {
				[userId]    : true,
				'other-user': true,
			},
			author: { displayName: 'Test Author', userId: 'author-id' },
			image : { id: 'test-image', type: 'image/png' },
			tags  : ['test'],
		};
		queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], existingBlueprint);

		const existingSummary = {
			title            : 'Test Blueprint Summary',
			imgurId          : 'test-image',
			imgurType        : 'image/png',
			numberOfFavorites: 5,
		};
		queryClient.setQueryData(['blueprintSummaries', 'blueprintId', blueprintId], existingSummary);

		const existingUserFavorites = {
			[blueprintId]      : true,
			'other-blueprint-1': true,
		};
		queryClient.setQueryData(['users', 'userId', userId, 'favorites'], existingUserFavorites);

		queryClient.setQueryData(
			['users', 'userId', userId, 'favorites', 'blueprintId', blueprintId],
			true,
		);

		queryClient.setQueryData(
			['blueprints', 'blueprintId', blueprintId, 'favorites', 'userId', userId],
			true,
		);

		// Clear spy after setup
		setQueryDataSpy.mockClear();

		// Execute favorite toggle (true to false)
		const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

		result.current.mutate({
			blueprintId,
			userId,
			isFavorite       : true,
			numberOfFavorites: 5,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify all cache updates
		const updatedBlueprint = queryClient.getQueryData(['blueprints', 'blueprintId', blueprintId]) as any;
		expect(updatedBlueprint).toEqual({
			title              : 'Test Blueprint',
			blueprintString    : 'test-blueprint-string',
			createdDate        : existingBlueprint.createdDate,
			descriptionMarkdown: 'Test description',
			lastUpdatedDate    : existingBlueprint.lastUpdatedDate,
			numberOfFavorites  : 4,
			favorites          : {
				[userId]    : undefined,
				'other-user': true,
			},
			author: { displayName: 'Test Author', userId: 'author-id' },
			image : { id: 'test-image', type: 'image/png' },
			tags  : ['test'],
		});

		const updatedSummary = queryClient.getQueryData(['blueprintSummaries', 'blueprintId', blueprintId]) as any;
		expect(updatedSummary).toEqual({
			title            : 'Test Blueprint Summary',
			imgurId          : 'test-image',
			imgurType        : 'image/png',
			numberOfFavorites: 4,
		});

		const updatedUserFavorites = queryClient.getQueryData(['users', 'userId', userId, 'favorites']);
		expect(updatedUserFavorites).toEqual({
			[blueprintId]      : undefined,
			'other-blueprint-1': true,
		});

		const userFavoriteStatus = queryClient.getQueryData(
			['users', 'userId', userId, 'favorites', 'blueprintId', blueprintId],
		);
		expect(userFavoriteStatus).toBe(false);

		const blueprintFavoriteStatus = queryClient.getQueryData(
			['blueprints', 'blueprintId', blueprintId, 'favorites', 'userId', userId],
		);
		expect(blueprintFavoriteStatus).toBe(false);
	});

	it('should handle partial cache state gracefully', async () =>
	{
		const blueprintId = 'test-blueprint-id';
		const userId = 'test-user-id';

		// Set up only partial cache data (missing some query keys)
		const existingBlueprint = {
			title              : 'Test Blueprint',
			blueprintString    : 'test-blueprint-string',
			createdDate        : Date.now(),
			descriptionMarkdown: 'Test description',
			lastUpdatedDate    : Date.now(),
			numberOfFavorites  : 3,
			favorites          : {},
			author             : { displayName: 'Test Author', userId: 'author-id' },
			image              : { id: 'test-image', type: 'image/png' },
			tags               : ['test'],
		};
		queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], existingBlueprint);

		// No blueprint summary cache
		// No user favorites cache
		// No individual favorite status caches

		const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

		result.current.mutate({
			blueprintId,
			userId,
			isFavorite       : false,
			numberOfFavorites: 3,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify the existing cache was updated
		const updatedBlueprint = queryClient.getQueryData(['blueprints', 'blueprintId', blueprintId]) as any;
		expect(updatedBlueprint).toEqual({
			title              : 'Test Blueprint',
			blueprintString    : 'test-blueprint-string',
			createdDate        : existingBlueprint.createdDate,
			descriptionMarkdown: 'Test description',
			lastUpdatedDate    : existingBlueprint.lastUpdatedDate,
			numberOfFavorites  : 4,
			favorites          : {
				[userId]: true,
			},
			author: { displayName: 'Test Author', userId: 'author-id' },
			image : { id: 'test-image', type: 'image/png' },
			tags  : ['test'],
		});

		// Verify specific favorite status caches were set
		const userFavoriteStatus = queryClient.getQueryData(
			['users', 'userId', userId, 'favorites', 'blueprintId', blueprintId],
		);
		expect(userFavoriteStatus).toBe(true);

		const blueprintFavoriteStatus = queryClient.getQueryData(
			['blueprints', 'blueprintId', blueprintId, 'favorites', 'userId', userId],
		);
		expect(blueprintFavoriteStatus).toBe(true);

		// Operation should complete successfully
		expect(result.current.isSuccess).toBe(true);
	});

	it('should maintain referential integrity for complex favorite relationships', async () =>
	{
		const blueprintId = 'shared-blueprint-id';
		const userId1 = 'user-1';
		const userId2 = 'user-2';

		// Set up complex cache state with multiple users
		const existingBlueprint = {
			title              : 'Popular Blueprint',
			blueprintString    : 'test-blueprint-string',
			createdDate        : Date.now(),
			descriptionMarkdown: 'Test description',
			lastUpdatedDate    : Date.now(),
			numberOfFavorites  : 10,
			favorites          : {
				[userId1]: true,
				'user-3' : true,
				'user-4' : true,
			},
			author: { displayName: 'Test Author', userId: 'author-id' },
			image : { id: 'test-image', type: 'image/png' },
			tags  : ['test'],
		};
		queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], existingBlueprint);

		// User 1 has it favorited
		queryClient.setQueryData(['users', 'userId', userId1, 'favorites'], {
			[blueprintId]    : true,
			'other-blueprint': true,
		});

		// User 2 doesn't have it favorited yet
		queryClient.setQueryData(['users', 'userId', userId2, 'favorites'], {
			'different-blueprint': true,
		});

		// Execute favorite for user 2
		const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

		result.current.mutate({
			blueprintId,
			userId           : userId2,
			isFavorite       : false,
			numberOfFavorites: 10,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify blueprint was updated to include user 2
		const updatedBlueprint = queryClient.getQueryData(['blueprints', 'blueprintId', blueprintId]) as any;
		expect(updatedBlueprint.numberOfFavorites).toBe(11);
		expect(updatedBlueprint.favorites).toEqual({
			[userId1]: true,
			[userId2]: true,
			'user-3' : true,
			'user-4' : true,
		});

		// Verify user 1's favorites were NOT modified
		const user1Favorites = queryClient.getQueryData(['users', 'userId', userId1, 'favorites']);
		expect(user1Favorites).toEqual({
			[blueprintId]    : true,
			'other-blueprint': true,
		});

		// Verify user 2's favorites were updated
		const user2Favorites = queryClient.getQueryData(['users', 'userId', userId2, 'favorites']);
		expect(user2Favorites).toEqual({
			'different-blueprint': true,
			[blueprintId]        : true,
		});
	});

	it('should handle edge case of zero favorite count correctly', async () =>
	{
		const blueprintId = 'unpopular-blueprint';
		const userId = 'test-user';

		// Set up blueprint with 1 favorite that will be removed
		const existingBlueprint = {
			title              : 'Unpopular Blueprint',
			blueprintString    : 'test-blueprint-string',
			createdDate        : Date.now(),
			descriptionMarkdown: 'Test description',
			lastUpdatedDate    : Date.now(),
			numberOfFavorites  : 1,
			favorites          : {
				[userId]: true,
			},
			author: { displayName: 'Test Author', userId: 'author-id' },
			image : { id: 'test-image', type: 'image/png' },
			tags  : ['test'],
		};
		queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], existingBlueprint);

		const existingSummary = {
			title            : 'Unpopular Blueprint',
			imgurId          : 'test-image',
			imgurType        : 'image/png',
			numberOfFavorites: 1,
		};
		queryClient.setQueryData(['blueprintSummaries', 'blueprintId', blueprintId], existingSummary);

		// Execute unfavorite
		const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

		result.current.mutate({
			blueprintId,
			userId,
			isFavorite       : true,
			numberOfFavorites: 1,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify count went to 0
		const updatedBlueprint = queryClient.getQueryData(['blueprints', 'blueprintId', blueprintId]) as any;
		expect(updatedBlueprint.numberOfFavorites).toBe(0);

		const updatedSummary = queryClient.getQueryData(['blueprintSummaries', 'blueprintId', blueprintId]) as any;
		expect(updatedSummary.numberOfFavorites).toBe(0);
	});

	it('should ensure clean cache state after multiple rapid toggles', async () =>
	{
		const blueprintId = 'rapid-toggle-blueprint';
		const userId = 'test-user';

		// Set up initial state
		const initialBlueprint = {
			title              : 'Rapid Toggle Blueprint',
			blueprintString    : 'test-blueprint-string',
			createdDate        : Date.now(),
			descriptionMarkdown: 'Test description',
			lastUpdatedDate    : Date.now(),
			numberOfFavorites  : 5,
			favorites          : {},
			author             : { displayName: 'Test Author', userId: 'author-id' },
			image              : { id: 'test-image', type: 'image/png' },
			tags               : ['test'],
		};
		queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], initialBlueprint);

		const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

		// First toggle: false to true
		result.current.mutate({
			blueprintId,
			userId,
			isFavorite       : false,
			numberOfFavorites: 5,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Reset mutation state
		result.current.reset();

		// Second toggle: true to false
		result.current.mutate({
			blueprintId,
			userId,
			isFavorite       : true,
			numberOfFavorites: 6,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify final state is consistent
		const finalBlueprint = queryClient.getQueryData(['blueprints', 'blueprintId', blueprintId]) as any;
		expect(finalBlueprint.numberOfFavorites).toBe(5);
		expect(finalBlueprint.favorites[userId]).toBeUndefined();

		const userFavoriteStatus = queryClient.getQueryData(
			['users', 'userId', userId, 'favorites', 'blueprintId', blueprintId],
		);
		expect(userFavoriteStatus).toBe(false);

		const blueprintFavoriteStatus = queryClient.getQueryData(
			['blueprints', 'blueprintId', blueprintId, 'favorites', 'userId', userId],
		);
		expect(blueprintFavoriteStatus).toBe(false);
	});

	it('should maintain consistency when blueprint has many favorites', async () =>
	{
		const blueprintId = 'popular-blueprint';
		const userId = 'new-fan';

		// Create a blueprint with many existing favorites
		const manyFavorites: Record<string, boolean> = {};
		for (let i = 1; i <= 50; i++)
		{
			manyFavorites[`user-${i}`] = true;
		}

		const existingBlueprint = {
			title              : 'Very Popular Blueprint',
			blueprintString    : 'test-blueprint-string',
			createdDate        : Date.now(),
			descriptionMarkdown: 'Test description',
			lastUpdatedDate    : Date.now(),
			numberOfFavorites  : 50,
			favorites          : manyFavorites,
			author             : { displayName: 'Test Author', userId: 'author-id' },
			image              : { id: 'test-image', type: 'image/png' },
			tags               : ['test'],
		};
		queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], existingBlueprint);

		const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

		result.current.mutate({
			blueprintId,
			userId,
			isFavorite       : false,
			numberOfFavorites: 50,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify the new user was added without affecting existing favorites
		const updatedBlueprint = queryClient.getQueryData(['blueprints', 'blueprintId', blueprintId]) as any;
		expect(updatedBlueprint.numberOfFavorites).toBe(51);
		expect(Object.keys(updatedBlueprint.favorites)).toHaveLength(51);
		expect(updatedBlueprint.favorites[userId]).toBe(true);

		// Verify all original favorites are still present
		for (let i = 1; i <= 50; i++)
		{
			expect(updatedBlueprint.favorites[`user-${i}`]).toBe(true);
		}
	});

	it('should handle concurrent favorites from different users', async () =>
	{
		const blueprintId = 'concurrent-blueprint';
		const userId1 = 'user-1';
		const userId2 = 'user-2';

		// Set up initial state
		const initialBlueprint = {
			title              : 'Concurrent Blueprint',
			blueprintString    : 'test-blueprint-string',
			createdDate        : Date.now(),
			descriptionMarkdown: 'Test description',
			lastUpdatedDate    : Date.now(),
			numberOfFavorites  : 5,
			favorites          : {},
			author             : { displayName: 'Test Author', userId: 'author-id' },
			image              : { id: 'test-image', type: 'image/png' },
			tags               : ['test'],
		};
		queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], initialBlueprint);

		// Create two hook instances for different users
		const { result: result1 } = renderHook(() => useToggleFavoriteMutation(), { wrapper });
		const { result: result2 } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

		// Both users favorite at nearly the same time
		result1.current.mutate({
			blueprintId,
			userId           : userId1,
			isFavorite       : false,
			numberOfFavorites: 5,
		});

		result2.current.mutate({
			blueprintId,
			userId           : userId2,
			isFavorite       : false,
			numberOfFavorites: 5,
		});

		// Wait for both to complete
		await waitFor(() => expect(result1.current.isSuccess).toBe(true));
		await waitFor(() => expect(result2.current.isSuccess).toBe(true));

		// Note: In this test scenario, the cache updates might conflict
		// The last update wins, but both users should be marked as having favorited
		// This tests that the cache update logic handles concurrent updates gracefully

		const finalBlueprint = queryClient.getQueryData(['blueprints', 'blueprintId', blueprintId]) as any;
		expect(finalBlueprint.favorites[userId1]).toBeDefined();
		expect(finalBlueprint.favorites[userId2]).toBeDefined();
	});
});
