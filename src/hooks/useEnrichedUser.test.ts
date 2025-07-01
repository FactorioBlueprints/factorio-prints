import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useEnrichedUser } from './useEnrichedUser';
import { useRawUser } from './useRawUser';
import { enrichUser } from '../utils/enrichUser';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('./useRawUser', () => ({
	useRawUser: vi.fn(),
}));

vi.mock('../utils/enrichUser', () => ({
	enrichUser: vi.fn(),
}));

const mockUseRawUser = vi.mocked(useRawUser);
const mockEnrichUser = vi.mocked(enrichUser);

// Mock QueryProvider for testing
const createTestQueryClient = () => new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

describe('useEnrichedUser', () => {
	const expectedUserId = 'test-user-123';
	const expectedRawUser = {
		id: 'test-user-123',
		displayName: 'Test User',
		email: 'test@example.com',
		favorites: {
			'blueprint-1': true,
			'blueprint-2': true,
			'blueprint-3': false, // Should not be counted
		},
		blueprints: {
			'user-blueprint-1': true,
			'user-blueprint-2': true,
			'user-blueprint-3': false, // Should not be counted
		},
	};

	const expectedEnrichedUser = {
		...expectedRawUser,
		favoritesCount: 2, // Only true values counted
		blueprintsCount: 2, // Only true values counted
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Set up the useRawUser mock
		mockUseRawUser.mockImplementation(() => ({
			data: expectedRawUser,
			isLoading: false,
			isError: false,
			error: null,
		} as any));

		// Set up the enrichUser mock
		mockEnrichUser.mockReturnValue(expectedEnrichedUser);
	});

	it('should return enriched user data when raw data is available', async () => {
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedUser(expectedUserId), { wrapper });

		// Check if useRawUser was called with correct ID
		expect(mockUseRawUser).toHaveBeenCalledWith(expectedUserId);

		// Check if enrichUser was called with raw data
		expect(mockEnrichUser).toHaveBeenCalledWith(expectedRawUser);

		// Verify the enriched data is returned
		expect(result.current.data).toEqual(expectedEnrichedUser);
	});

	it('should return null data when raw data is null', async () => {
		mockUseRawUser.mockImplementation(() => ({
			data: null,
			isLoading: false,
			isError: false,
			error: null,
		} as any));

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedUser(expectedUserId), { wrapper });

		// Verify that enrichUser was not called when data is null
		expect(mockEnrichUser).not.toHaveBeenCalled();

		// Verify the data is null
		expect(result.current.data).toBeNull();
	});

	it('should return null data when raw data is undefined', async () => {
		mockUseRawUser.mockImplementation(() => ({
			data: undefined,
			isLoading: false,
			isError: false,
			error: null,
		} as any));

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedUser(expectedUserId), { wrapper });

		// Verify that enrichUser was not called when data is undefined
		expect(mockEnrichUser).not.toHaveBeenCalled();

		// Verify the data is null
		expect(result.current.data).toBeNull();
	});

	it('should preserve loading state from the raw query', async () => {
		mockUseRawUser.mockImplementation(() => ({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
		} as any));

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedUser(expectedUserId), { wrapper });

		// Verify loading state is preserved
		expect(result.current.isLoading).toBe(true);
		expect(result.current.data).toBeNull();
	});

	it('should preserve error state from the raw query', async () => {
		const expectedError = new Error('Failed to fetch user');
		mockUseRawUser.mockImplementation(() => ({
			data: undefined,
			isLoading: false,
			isError: true,
			error: expectedError,
		} as any));

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedUser(expectedUserId), { wrapper });

		// Verify error state is preserved
		expect(result.current.isError).toBe(true);
		expect(result.current.error).toEqual(expectedError);
	});

	it('should preserve success state from the raw query', async () => {
		mockUseRawUser.mockImplementation(() => ({
			data: expectedRawUser,
			isLoading: false,
			isError: false,
			isSuccess: true,
			error: null,
		} as any));

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedUser(expectedUserId), { wrapper });

		// Verify success state is preserved
		expect(result.current.isSuccess).toBe(true);
		expect(result.current.data).toEqual(expectedEnrichedUser);
	});

	it('should handle userId as null', async () => {
		mockUseRawUser.mockImplementation(() => ({
			data: undefined,
			isLoading: false,
			isError: false,
			error: null,
		} as any));

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedUser(null), { wrapper });

		// Check if useRawUser was called with null
		expect(mockUseRawUser).toHaveBeenCalledWith(null);

		// Verify that enrichUser was not called when data is undefined
		expect(mockEnrichUser).not.toHaveBeenCalled();

		// Verify the data is null
		expect(result.current.data).toBeNull();
	});

	it('should handle userId as undefined', async () => {
		mockUseRawUser.mockImplementation(() => ({
			data: undefined,
			isLoading: false,
			isError: false,
			error: null,
		} as any));

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedUser(undefined), { wrapper });

		// Check if useRawUser was called with undefined
		expect(mockUseRawUser).toHaveBeenCalledWith(undefined);

		// Verify that enrichUser was not called when data is undefined
		expect(mockEnrichUser).not.toHaveBeenCalled();

		// Verify the data is null
		expect(result.current.data).toBeNull();
	});

	it('should memoize enriched data based on raw data changes', async () => {
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result, rerender } = renderHook(() => useEnrichedUser(expectedUserId), { wrapper });

		// First render
		expect(mockEnrichUser).toHaveBeenCalledTimes(1);
		const firstResult = result.current.data;

		// Rerender with same data - should not call enrichUser again
		rerender();
		expect(mockEnrichUser).toHaveBeenCalledTimes(1); // Still only called once
		expect(result.current.data).toBe(firstResult); // Same reference

		// Update raw data to trigger re-enrichment
		const updatedRawUser = {
			...expectedRawUser,
			displayName: 'Updated User',
		};
		const updatedEnrichedUser = {
			...updatedRawUser,
			favoritesCount: 2,
			blueprintsCount: 2,
		};

		mockUseRawUser.mockImplementation(() => ({
			data: updatedRawUser,
			isLoading: false,
			isError: false,
			error: null,
		} as any));

		mockEnrichUser.mockReturnValue(updatedEnrichedUser);

		rerender();

		// Should call enrichUser again with new data
		expect(mockEnrichUser).toHaveBeenCalledTimes(2);
		expect(mockEnrichUser).toHaveBeenLastCalledWith(updatedRawUser);
		expect(result.current.data).toEqual(updatedEnrichedUser);
	});

	it('should handle user with empty favorites and blueprints', async () => {
		const userWithEmptyCollections = {
			id: 'empty-user',
			displayName: 'Empty User',
			email: 'empty@example.com',
			favorites: {},
			blueprints: {},
		};

		const enrichedEmptyUser = {
			...userWithEmptyCollections,
			favoritesCount: 0,
			blueprintsCount: 0,
		};

		mockUseRawUser.mockImplementation(() => ({
			data: userWithEmptyCollections,
			isLoading: false,
			isError: false,
			error: null,
		} as any));

		mockEnrichUser.mockReturnValue(enrichedEmptyUser);

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedUser('empty-user'), { wrapper });

		expect(result.current.data).toEqual(enrichedEmptyUser);
		expect(mockEnrichUser).toHaveBeenCalledWith(userWithEmptyCollections);
	});

	it('should handle user with undefined favorites and blueprints', async () => {
		const userWithUndefinedCollections = {
			id: 'undefined-user',
			displayName: 'Undefined User',
			email: 'undefined@example.com',
			favorites: undefined,
			blueprints: undefined,
		};

		const enrichedUndefinedUser = {
			...userWithUndefinedCollections,
			favorites: {},
			blueprints: {},
			favoritesCount: 0,
			blueprintsCount: 0,
		};

		mockUseRawUser.mockImplementation(() => ({
			data: userWithUndefinedCollections,
			isLoading: false,
			isError: false,
			error: null,
		} as any));

		mockEnrichUser.mockReturnValue(enrichedUndefinedUser);

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedUser('undefined-user'), { wrapper });

		expect(result.current.data).toEqual(enrichedUndefinedUser);
		expect(mockEnrichUser).toHaveBeenCalledWith(userWithUndefinedCollections);
	});
});
