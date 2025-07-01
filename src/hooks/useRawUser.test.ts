import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRawUser } from './useRawUser';
import { fetchUser } from '../api/firebase';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('../api/firebase', () => ({
	fetchUser: vi.fn(),
}));

const mockFetchUser = vi.mocked(fetchUser);

// Mock QueryProvider for testing
const createTestQueryClient = () => new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

describe('useRawUser', () => {
	const fakeUserId = 'test-user-123';
	const fakeRawUser = {
		id: 'test-user-123',
		displayName: 'Test User',
		email: 'test@example.com',
		favorites: {
			'blueprint-1': true,
			'blueprint-2': true,
			'blueprint-3': false,
		},
		blueprints: {
			'user-blueprint-1': true,
			'user-blueprint-2': true,
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetchUser.mockResolvedValue(fakeRawUser);
	});

	it('should return empty result when userId is null', async () => {
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useRawUser(null), { wrapper });

		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
		expect(mockFetchUser).not.toHaveBeenCalled();
	});

	it('should return empty result when userId is undefined', async () => {
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useRawUser(undefined), { wrapper });

		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
		expect(mockFetchUser).not.toHaveBeenCalled();
	});

	it('should return empty result when userId is empty string', async () => {
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useRawUser(''), { wrapper });

		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
		expect(mockFetchUser).not.toHaveBeenCalled();
	});

	it('should fetch user data when userId is provided', async () => {
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useRawUser(fakeUserId), { wrapper });

		// Initial state is loading
		expect(result.current.isLoading).toBe(true);

		// Wait for query to complete
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(mockFetchUser).toHaveBeenCalledWith(fakeUserId);
		expect(result.current.data).toEqual(fakeRawUser);
	});

	it('should handle error when fetchUser fails', async () => {
		const fakeError = new Error('Failed to fetch user');
		mockFetchUser.mockRejectedValue(fakeError);

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useRawUser(fakeUserId), { wrapper });

		// Wait for query to complete
		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toEqual(fakeError);
		expect(result.current.data).toBeUndefined();
	});

	it('should handle null response from fetchUser', async () => {
		mockFetchUser.mockResolvedValue(null);

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useRawUser(fakeUserId), { wrapper });

		// Wait for query to complete
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(mockFetchUser).toHaveBeenCalledWith(fakeUserId);
		expect(result.current.data).toBeNull();
		expect(result.current.isError).toBe(false);
	});

	it('should use correct query key', async () => {
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		renderHook(() => useRawUser(fakeUserId), { wrapper });

		// Wait for query to complete
		await waitFor(() => expect(mockFetchUser).toHaveBeenCalled());

		// Check that the query was cached with the correct key
		const cachedData = queryClient.getQueryData(['users', 'userId', fakeUserId]);
		expect(cachedData).toEqual(fakeRawUser);
	});

	it('should apply correct stale time and garbage collection time', async () => {
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		renderHook(() => useRawUser(fakeUserId), { wrapper });

		// Wait for query to complete
		await waitFor(() => expect(mockFetchUser).toHaveBeenCalled());

		// Check that the query has the correct configuration
		const queryCache = queryClient.getQueryCache();
		const query = queryCache.find({ queryKey: ['users', 'userId', fakeUserId] });

		expect((query?.options as any).staleTime).toBe(24 * 60 * 60 * 1000); // 24 hours
		expect((query?.options as any).gcTime).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
	});

	it('should handle user with minimal data', async () => {
		const minimalUser = {
			id: 'minimal-user',
			displayName: undefined,
			email: undefined,
			favorites: {},
			blueprints: {},
		};
		mockFetchUser.mockResolvedValue(minimalUser);

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useRawUser('minimal-user'), { wrapper });

		// Wait for query to complete
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.data).toEqual(minimalUser);
		expect(result.current.isError).toBe(false);
	});
});
