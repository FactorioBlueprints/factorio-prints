import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRawBlueprint } from './useRawBlueprint';
import { fetchBlueprint } from '../api/firebase';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('../api/firebase', () => ({
	fetchBlueprint: vi.fn(),
}));


// Mock QueryProvider for testing
const createTestQueryClient = () => new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

describe('useRawBlueprint', () =>
{
	const fakeBlueprintId = 'test-blueprint-123';
	const fakeBlueprintSummary = {
		title            : 'Test Blueprint',
		imgurId          : 'image-123',
		imgurType        : 'image/png',
		numberOfFavorites: 42,
		lastUpdatedDate  : 1630000000000,
	};
	const fakeRawBlueprint = {
		title              : 'Test Blueprint',
		blueprintString    : '0testBlueprintString',
		createdDate        : 1620000000000,
		descriptionMarkdown: '# Test Description',
		lastUpdatedDate    : 1630000000000,
		numberOfFavorites  : 42,
		tags               : ['/category/subcategory/', '/feature/test/'],
		author             : {
			userId     : 'user-123',
			displayName: 'Test User',
		},
		image: {
			id  : 'image-123',
			type: 'image/png',
		},
		favorites: { 'user-1': true, 'user-2': true },
	};

	beforeEach(() =>
	{
		vi.clearAllMocks();
		vi.mocked(fetchBlueprint).mockResolvedValue(fakeRawBlueprint);
	});

	it('should return empty result when blueprintId is not provided', async () =>
	{
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useRawBlueprint(null as any, fakeBlueprintSummary as any), { wrapper });

		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
		expect(fetchBlueprint).not.toHaveBeenCalled();
	});

	it('should return empty result when blueprintSummary is not provided', async () =>
	{
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useRawBlueprint(fakeBlueprintId, null), { wrapper });

		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toBeUndefined();
		expect(fetchBlueprint).not.toHaveBeenCalled();
	});

	it('should fetch blueprint data when blueprintId is provided', async () =>
	{
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useRawBlueprint(fakeBlueprintId, fakeBlueprintSummary as any), { wrapper });

		// Initial state is loading
		expect(result.current.isLoading).toBe(true);

		// Wait for query to complete
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(fetchBlueprint).toHaveBeenCalledWith(fakeBlueprintId, fakeBlueprintSummary);
		expect(result.current.data).toEqual(fakeRawBlueprint);
	});

	it('should handle error when fetchBlueprint fails', async () =>
	{
		const fakeError = new Error('Failed to fetch blueprint');
		vi.mocked(fetchBlueprint).mockRejectedValue(fakeError);

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useRawBlueprint(fakeBlueprintId, fakeBlueprintSummary as any), { wrapper });

		// Wait for query to complete
		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toEqual(fakeError);
		expect(result.current.data).toBeUndefined();
	});

	it('should handle validation error', async () =>
	{
		const validationError = new Error('Invalid raw blueprint: Validation failed');
		vi.mocked(fetchBlueprint).mockRejectedValue(validationError);

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useRawBlueprint(fakeBlueprintId, fakeBlueprintSummary as any), { wrapper });

		// Wait for query to complete
		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBeDefined();
		expect(result.current.data).toBeUndefined();
	});
});
