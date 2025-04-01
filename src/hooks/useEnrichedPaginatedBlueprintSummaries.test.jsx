import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEnrichedPaginatedBlueprintSummaries } from './useEnrichedPaginatedBlueprintSummaries';
import { useRawPaginatedBlueprintSummaries } from './useRawPaginatedBlueprintSummaries';
import { enrichPaginatedBlueprintSummaries } from '../utils/enrichPaginatedBlueprintSummaries';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// TODO 2025-05-21 we should not mock ./useRawPaginatedBlueprintSummaries or other higher level methods. We shoudl only mock the smallest scopes that perform network traffic, specifically the methods in firebase.ts.
vi.mock('./useRawPaginatedBlueprintSummaries');
vi.mock('../utils/enrichPaginatedBlueprintSummaries');

const fakeRawPaginatedData = {
	pages: [
		{
			data: {
				blueprint1: {
					title            : 'Test Blueprint 1',
					imgurId          : 'img1',
					imgurType        : 'image/png',
					numberOfFavorites: 10,
					lastUpdatedDate  : 1000,
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
			lastKey  : 'blueprint1',
			lastValue: 1000,
		},
	],
	pageParams: [null],
};

const fakeEnrichedPaginatedData = {
	pages: [
		{
			data: [
				{
					title            : 'Test Blueprint 1',
					imgurId          : 'img1',
					imgurType        : 'image/png',
					numberOfFavorites: 10,
					lastUpdatedDate  : 1000,
					key              : 'blueprint1',
					thumbnail        : 'thumbnail1',
				},
				{
					title            : 'Test Blueprint 2',
					imgurId          : 'img2',
					imgurType        : 'image/jpeg',
					numberOfFavorites: 20,
					lastUpdatedDate  : 2000,
					key              : 'blueprint2',
					thumbnail        : 'thumbnail2',
				},
			],
			hasMore  : true,
			lastKey  : 'blueprint1',
			lastValue: 1000,
		},
	],
	pageParams: [null],
};

describe('useEnrichedPaginatedBlueprintSummaries', () =>
{
	let queryClient;

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

		// TODO 2025-05-21 we should not mock ./useRawPaginatedBlueprintSummaries or other higher level methods. We shoudl only mock the smallest scopes that perform network traffic, specifically the methods in firebase.ts.
		vi.mocked(useRawPaginatedBlueprintSummaries).mockReturnValue({
			data              : fakeRawPaginatedData,
			isLoading         : false,
			isFetchingNextPage: false,
			hasNextPage       : true,
			fetchNextPage     : vi.fn(),
		});

		// TODO 2025-05-21 we should not mock ./useRawPaginatedBlueprintSummaries or other higher level methods. We shoudl only mock the smallest scopes that perform network traffic, specifically the methods in firebase.ts.
		vi.mocked(enrichPaginatedBlueprintSummaries).mockReturnValue(fakeEnrichedPaginatedData);
	});

	const wrapper = ({ children }) => (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	);

	it('should return enriched paginated blueprint summaries', async () =>
	{
		const { result } = renderHook(() => useEnrichedPaginatedBlueprintSummaries(), { wrapper });

		expect(useRawPaginatedBlueprintSummaries).toHaveBeenCalledWith(60, 'lastUpdatedDate');

		expect(enrichPaginatedBlueprintSummaries).toHaveBeenCalledWith(fakeRawPaginatedData);

		expect(result.current.data).toEqual(fakeEnrichedPaginatedData);

		expect(result.current.isLoading).toBe(false);
		expect(result.current.isFetchingNextPage).toBe(false);
		expect(result.current.hasNextPage).toBe(true);
		expect(result.current.fetchNextPage).toBeDefined();
	});

	it('should pass custom parameters to the raw hook', async () =>
	{
		renderHook(() => useEnrichedPaginatedBlueprintSummaries(30, 'numberOfFavorites'), { wrapper });

		expect(useRawPaginatedBlueprintSummaries).toHaveBeenCalledWith(30, 'numberOfFavorites');
	});

	it('should handle null raw data', async () =>
	{
		// TODO 2025-05-21 we should not mock ./useRawPaginatedBlueprintSummaries or other higher level methods. We shoudl only mock the smallest scopes that perform network traffic, specifically the methods in firebase.ts.
		useRawPaginatedBlueprintSummaries.mockReturnValue({
			data              : null,
			isLoading         : true,
			isFetchingNextPage: false,
			hasNextPage       : false,
			fetchNextPage     : vi.fn(),
		});

		const { result } = renderHook(() => useEnrichedPaginatedBlueprintSummaries(), { wrapper });

		expect(result.current.data).toBeNull();

		expect(enrichPaginatedBlueprintSummaries).not.toHaveBeenCalled();
	});
});
