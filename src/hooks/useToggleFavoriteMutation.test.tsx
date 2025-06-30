import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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

describe('useToggleFavoriteMutation', () =>
{
	let queryClient: QueryClient;
	let wrapper: ({ children }: { children: React.ReactNode }) => React.JSX.Element;
	let mockDatabase: any;
	let mockRef: any;

	beforeEach(() =>
	{
		queryClient = new QueryClient({
			defaultOptions: {
				queries  : { retry: false },
				mutations: { retry: false },
			},
		});

		wrapper = ({ children }: { children: React.ReactNode }) => (
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		);

		mockDatabase = {};
		mockRef = {};
		vi.mocked(getDatabase).mockReturnValue(mockDatabase);
		vi.mocked(ref).mockReturnValue(mockRef);
		vi.mocked(dbUpdate).mockResolvedValue(undefined);
	});

	afterEach(() =>
	{
		vi.clearAllMocks();
	});

	describe('mutation function', () =>
	{
		it('should toggle favorite from false to true', async () =>
		{
			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : false,
				numberOfFavorites: 5,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			expect(vi.mocked(dbUpdate)).toHaveBeenCalledWith(mockRef, {
				'/blueprints/blueprint123/numberOfFavorites'        : 6,
				'/blueprints/blueprint123/favorites/user456'        : true,
				'/blueprintSummaries/blueprint123/numberOfFavorites': 6,
				'/users/user456/favorites/blueprint123'             : true,
			});
		});

		it('should toggle favorite from true to false', async () =>
		{
			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : true,
				numberOfFavorites: 5,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			expect(vi.mocked(dbUpdate)).toHaveBeenCalledWith(mockRef, {
				'/blueprints/blueprint123/numberOfFavorites'        : 4,
				'/blueprints/blueprint123/favorites/user456'        : null,
				'/blueprintSummaries/blueprint123/numberOfFavorites': 4,
				'/users/user456/favorites/blueprint123'             : null,
			});
		});

		it('should handle zero favorite count', async () =>
		{
			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : true,
				numberOfFavorites: 0,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			expect(vi.mocked(dbUpdate)).toHaveBeenCalledWith(mockRef, {
				'/blueprints/blueprint123/numberOfFavorites'        : 0,
				'/blueprints/blueprint123/favorites/user456'        : null,
				'/blueprintSummaries/blueprint123/numberOfFavorites': 0,
				'/users/user456/favorites/blueprint123'             : null,
			});
		});

		it('should handle null numberOfFavorites', async () =>
		{
			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : false,
				numberOfFavorites: null,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			expect(vi.mocked(dbUpdate)).toHaveBeenCalledWith(mockRef, {
				'/blueprints/blueprint123/numberOfFavorites'        : 1,
				'/blueprints/blueprint123/favorites/user456'        : true,
				'/blueprintSummaries/blueprint123/numberOfFavorites': 1,
				'/users/user456/favorites/blueprint123'             : true,
			});
		});

		it('should handle undefined numberOfFavorites', async () =>
		{
			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId: 'blueprint123',
				userId     : 'user456',
				isFavorite : false,
				// numberOfFavorites is undefined
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			expect(vi.mocked(dbUpdate)).toHaveBeenCalledWith(mockRef, {
				'/blueprints/blueprint123/numberOfFavorites'        : 1,
				'/blueprints/blueprint123/favorites/user456'        : true,
				'/blueprintSummaries/blueprint123/numberOfFavorites': 1,
				'/users/user456/favorites/blueprint123'             : true,
			});
		});
	});

	describe('cache updates', () =>
	{
		it('should update blueprint cache when toggling favorite on', async () =>
		{
			const existingBlueprint = {
				title              : 'Test Blueprint',
				blueprintString    : 'test-string',
				createdDate        : 1234567890,
				descriptionMarkdown: 'Test description',
				lastUpdatedDate    : 1234567890,
				numberOfFavorites  : 5,
				favorites          : { user789: true },
				author             : {
					displayName: 'Test User',
					userId     : 'testuser123',
				},
				image: {
					id  : 'test-image',
					type: 'image/png',
				},
			};

			queryClient.setQueryData(['blueprints', 'blueprintId', 'blueprint123'], existingBlueprint);

			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : false,
				numberOfFavorites: 5,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			const updatedBlueprint = queryClient.getQueryData(['blueprints', 'blueprintId', 'blueprint123']);
			expect(updatedBlueprint).toEqual({
				title              : 'Test Blueprint',
				blueprintString    : 'test-string',
				createdDate        : 1234567890,
				descriptionMarkdown: 'Test description',
				lastUpdatedDate    : 1234567890,
				numberOfFavorites  : 6,
				favorites          : {
					user789: true,
					user456: true,
				},
				author: {
					displayName: 'Test User',
					userId     : 'testuser123',
				},
				image: {
					id  : 'test-image',
					type: 'image/png',
				},
				tags: [],
			});
		});

		it('should update blueprint cache when toggling favorite off', async () =>
		{
			const existingBlueprint = {
				title              : 'Test Blueprint',
				blueprintString    : 'test-string',
				createdDate        : 1234567890,
				descriptionMarkdown: 'Test description',
				lastUpdatedDate    : 1234567890,
				numberOfFavorites  : 5,
				favorites          : { user456: true, user789: true },
				author             : {
					displayName: 'Test User',
					userId     : 'testuser123',
				},
				image: {
					id  : 'test-image',
					type: 'image/png',
				},
			};

			queryClient.setQueryData(['blueprints', 'blueprintId', 'blueprint123'], existingBlueprint);

			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : true,
				numberOfFavorites: 5,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			const updatedBlueprint = queryClient.getQueryData(['blueprints', 'blueprintId', 'blueprint123']);
			expect(updatedBlueprint).toEqual({
				title              : 'Test Blueprint',
				blueprintString    : 'test-string',
				createdDate        : 1234567890,
				descriptionMarkdown: 'Test description',
				lastUpdatedDate    : 1234567890,
				numberOfFavorites  : 4,
				favorites          : {
					user456: undefined,
					user789: true,
				},
				author: {
					displayName: 'Test User',
					userId     : 'testuser123',
				},
				image: {
					id  : 'test-image',
					type: 'image/png',
				},
				tags: [],
			});
		});

		it('should update blueprint summary cache', async () =>
		{
			const existingSummary = {
				title            : 'Test Blueprint',
				imgurId          : 'test-imgur-id',
				imgurType        : 'image/png',
				numberOfFavorites: 5,
			};

			queryClient.setQueryData(['blueprintSummaries', 'blueprintId', 'blueprint123'], existingSummary);

			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : false,
				numberOfFavorites: 5,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			const updatedSummary = queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint123']);
			expect(updatedSummary).toEqual({
				title            : 'Test Blueprint',
				imgurId          : 'test-imgur-id',
				imgurType        : 'image/png',
				numberOfFavorites: 6,
			});
		});

		it('should update user favorites cache', async () =>
		{
			const existingFavorites = {
				blueprint789: true,
				blueprint456: true,
			};

			queryClient.setQueryData(['users', 'userId', 'user456', 'favorites'], existingFavorites);

			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : false,
				numberOfFavorites: 5,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			const updatedFavorites = queryClient.getQueryData(['users', 'userId', 'user456', 'favorites']);
			expect(updatedFavorites).toEqual({
				blueprint789: true,
				blueprint456: true,
				blueprint123: true,
			});
		});

		it('should update specific favorite status caches', async () =>
		{
			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : false,
				numberOfFavorites: 5,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Check user favorite status
			const userFavoriteStatus = queryClient.getQueryData(['users', 'userId', 'user456', 'favorites', 'blueprintId', 'blueprint123']);
			expect(userFavoriteStatus).toBe(true);

			// Check blueprint favorite status
			const blueprintFavoriteStatus = queryClient.getQueryData(['blueprints', 'blueprintId', 'blueprint123', 'favorites', 'userId', 'user456']);
			expect(blueprintFavoriteStatus).toBe(true);
		});

		it('should handle missing cache data gracefully', async () =>
		{
			// No existing cache data
			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : false,
				numberOfFavorites: 5,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Should not throw and should update the specific caches
			const userFavoriteStatus = queryClient.getQueryData(['users', 'userId', 'user456', 'favorites', 'blueprintId', 'blueprint123']);
			expect(userFavoriteStatus).toBe(true);
		});
	});

	describe('error handling', () =>
	{
		it('should handle Firebase update errors', async () =>
		{
			const error = new Error('Firebase update failed');
			vi.mocked(dbUpdate).mockRejectedValue(error);

			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : false,
				numberOfFavorites: 5,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isError).toBe(true));

			expect(result.current.error).toBe(error);
		});
	});

	describe('raw data pattern compliance', () =>
	{
		it('should use provided numberOfFavorites without fetching', async () =>
		{
			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : false,
				numberOfFavorites: 42,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Should use the provided numberOfFavorites (42) directly
			expect(vi.mocked(dbUpdate)).toHaveBeenCalledWith(mockRef, {
				'/blueprints/blueprint123/numberOfFavorites'        : 43,
				'/blueprints/blueprint123/favorites/user456'        : true,
				'/blueprintSummaries/blueprint123/numberOfFavorites': 43,
				'/users/user456/favorites/blueprint123'             : true,
			});
		});

		it('should not make any additional data fetching calls', async () =>
		{
			const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper });

			const params = {
				blueprintId      : 'blueprint123',
				userId           : 'user456',
				isFavorite       : false,
				numberOfFavorites: 10,
			};

			result.current.mutate(params);

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Should only call dbUpdate, no other Firebase operations
			expect(vi.mocked(dbUpdate)).toHaveBeenCalledTimes(1);
			expect(vi.mocked(getDatabase)).toHaveBeenCalledTimes(1);
			expect(vi.mocked(ref)).toHaveBeenCalledTimes(1);
		});
	});
});
