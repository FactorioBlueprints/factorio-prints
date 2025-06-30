import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchPaginatedSummaries } from '../api/firebase';
import { useEnrichedPaginatedSummaries } from './useEnrichedPaginatedSummaries';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import type { RawBlueprintSummaryPage, EnrichedBlueprintSummaryPage, EnrichedPaginatedBlueprintSummaries } from '../schemas';

vi.mock('../api/firebase');

const exampleRawPage1: RawBlueprintSummaryPage = {
	data: {
		blueprint1: {
			title            : 'Test Blueprint 1',
			imgurId          : 'img1',
			imgurType        : 'image/png',
			numberOfFavorites: 10,
			lastUpdatedDate  : 1000,
			height           : 256,
			width            : 512,
		},
		blueprint2: {
			title            : 'Test Blueprint 2',
			imgurId          : 'img2',
			imgurType        : 'image/jpeg',
			numberOfFavorites: 20,
			lastUpdatedDate  : 2000,
		},
	},
	hasMore  : true,
	lastKey  : 'blueprint2',
	lastValue: 2000,
};

const exampleRawPage2: RawBlueprintSummaryPage = {
	data: {
		blueprint3: {
			title            : 'Test Blueprint 3',
			imgurId          : 'img3',
			imgurType        : 'image/png',
			numberOfFavorites: 30,
			lastUpdatedDate  : 3000,
		},
	},
	hasMore  : false,
	lastKey  : null,
	lastValue: null,
};

const exampleEnrichedPage1: EnrichedBlueprintSummaryPage = {
	data: [
		{
			key              : 'blueprint1',
			title            : 'Test Blueprint 1',
			imgurId          : 'img1',
			imgurType        : 'image/png',
			numberOfFavorites: 10,
			lastUpdatedDate  : 1000,
			height           : 256,
			width            : 512,
			thumbnail        : 'https://i.imgur.com/img1b.png',
		},
		{
			key              : 'blueprint2',
			title            : 'Test Blueprint 2',
			imgurId          : 'img2',
			imgurType        : 'image/jpeg',
			numberOfFavorites: 20,
			lastUpdatedDate  : 2000,
			thumbnail        : 'https://i.imgur.com/img2b.jpeg',
		},
	],
	hasMore  : true,
	lastKey  : 'blueprint2',
	lastValue: 2000,
};

const exampleEnrichedPage2: EnrichedBlueprintSummaryPage = {
	data: [
		{
			key              : 'blueprint3',
			title            : 'Test Blueprint 3',
			imgurId          : 'img3',
			imgurType        : 'image/png',
			numberOfFavorites: 30,
			lastUpdatedDate  : 3000,
			thumbnail        : 'https://i.imgur.com/img3b.png',
		},
	],
	hasMore  : false,
	lastKey  : null,
	lastValue: null,
};

describe('useEnrichedPaginatedSummaries', () =>
{
	let queryClient: QueryClient;

	beforeEach(() =>
	{
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});

		vi.clearAllMocks();
		vi.mocked(fetchPaginatedSummaries).mockResolvedValue(exampleRawPage1);
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	);

	it('should fetch and enrich paginated summaries with default parameters', async () =>
	{
		const { result } = renderHook(() => useEnrichedPaginatedSummaries(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify the raw hook was called with default parameters
		expect(fetchPaginatedSummaries).toHaveBeenCalledWith(60, null, null, 'lastUpdatedDate');

		// Verify the enriched data structure
		const expectedEnrichedData: EnrichedPaginatedBlueprintSummaries = {
			pages     : [exampleEnrichedPage1],
			pageParams: [{ lastKey: null, lastValue: null }],
		};

		expect(result.current.data).toStrictEqual(expectedEnrichedData);
	});

	it('should pass custom parameters to fetch function', async () =>
	{
		const { result } = renderHook(() => useEnrichedPaginatedSummaries(30, 'numberOfFavorites'), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetchPaginatedSummaries).toHaveBeenCalledWith(30, null, null, 'numberOfFavorites');
	});

	it('should handle null data gracefully', async () =>
	{
		const { result } = renderHook(() => useEnrichedPaginatedSummaries(), { wrapper });

		// Initial state should have null data
		expect(result.current.data).toBeNull();
		expect(result.current.isLoading).toBe(true);
	});

	it('should populate individual blueprint summaries in cache', async () =>
	{
		const { result } = renderHook(() => useEnrichedPaginatedSummaries(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify the cache population side effect from useRawPaginatedSummaries
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint1'])).toStrictEqual(
			exampleRawPage1.data.blueprint1,
		);
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint2'])).toStrictEqual(
			exampleRawPage1.data.blueprint2,
		);
	});

	it('should handle pagination correctly', async () =>
	{
		vi.mocked(fetchPaginatedSummaries)
			.mockResolvedValueOnce(exampleRawPage1)
			.mockResolvedValueOnce(exampleRawPage2);

		const { result } = renderHook(() => useEnrichedPaginatedSummaries(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Fetch next page
		await result.current.fetchNextPage();

		await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

		const expectedEnrichedData: EnrichedPaginatedBlueprintSummaries = {
			pages     : [exampleEnrichedPage1, exampleEnrichedPage2],
			pageParams: [
				{ lastKey: null, lastValue: null },
				{ lastKey: 'blueprint2', lastValue: 2000 },
			],
		};

		expect(result.current.data).toStrictEqual(expectedEnrichedData);
		expect(result.current.hasNextPage).toBe(false);
	});

	it('should handle errors from fetchPaginatedSummaries', async () =>
	{
		const testError = new Error('Test error');
		vi.mocked(fetchPaginatedSummaries).mockRejectedValue(testError);

		const { result } = renderHook(() => useEnrichedPaginatedSummaries(), { wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toStrictEqual(testError);
		expect(result.current.data).toBeNull();
	});

	it('should handle hasMore false correctly', async () =>
	{
		const examplePageNoMore: RawBlueprintSummaryPage = {
			...exampleRawPage1,
			hasMore  : false,
			lastKey  : null,
			lastValue: null,
		};
		vi.mocked(fetchPaginatedSummaries).mockResolvedValue(examplePageNoMore);

		const { result } = renderHook(() => useEnrichedPaginatedSummaries(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.hasNextPage).toBe(false);

		const expectedEnrichedData: EnrichedPaginatedBlueprintSummaries = {
			pages: [{
				...exampleEnrichedPage1,
				hasMore  : false,
				lastKey  : null,
				lastValue: null,
			}],
			pageParams: [{ lastKey: null, lastValue: null }],
		};

		expect(result.current.data).toStrictEqual(expectedEnrichedData);
	});
});
