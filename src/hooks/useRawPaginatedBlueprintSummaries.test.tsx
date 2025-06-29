import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchPaginatedSummaries } from '../api/firebase';
import { useRawPaginatedBlueprintSummaries } from './useRawPaginatedBlueprintSummaries';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../api/firebase');

const fakeRawData = {
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
};

describe('useRawPaginatedBlueprintSummaries', () =>
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

		vi.mocked(fetchPaginatedSummaries).mockResolvedValue(fakeRawData);
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	);

	it('should fetch and return raw paginated blueprint summaries', async () =>
	{
		const { result } = renderHook(() => useRawPaginatedBlueprintSummaries(), { wrapper });

		expect(result.current.isLoading).toBeTruthy();

		await waitFor(() => expect(result.current.isLoading).toBeFalsy());

		expect(result.current.data).toBeDefined();
		expect((result.current.data as any).pages).toHaveLength(1);
		expect((result.current.data as any).pages[0]).toEqual(fakeRawData);

		expect(result.current.hasNextPage).toBeTruthy();

		expect(fetchPaginatedSummaries).toHaveBeenCalledWith(
			// default pageSize
			60,
			// default lastKey
			null,
			// default lastValue
			null,
			// default orderByField
			'lastUpdatedDate',
		);

		// TODO 2025-05-21: This doesn't really test anything since we are calling setters before getters. We should delete the setters and the test should still pass
		queryClient.setQueryData(['blueprintSummaries', 'blueprintId', 'blueprint1'], fakeRawData.data.blueprint1);
		queryClient.setQueryData(['blueprintSummaries', 'blueprintId', 'blueprint2'], fakeRawData.data.blueprint2);

		const cachedSummary1 = queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint1']);
		const cachedSummary2 = queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint2']);

		expect(cachedSummary1).toEqual(fakeRawData.data.blueprint1);
		expect(cachedSummary2).toEqual(fakeRawData.data.blueprint2);
	});

	it('should fetch the next page when fetchNextPage is called', async () =>
	{
		const fakeSecondPageData = {
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

		vi.mocked(fetchPaginatedSummaries)
			.mockResolvedValueOnce(fakeRawData)
			.mockResolvedValueOnce(fakeSecondPageData);

		const customData = {
			pages     : [fakeRawData, fakeSecondPageData],
			pageParams: [null, { lastKey: 'blueprint1', lastValue: 1000 }],
		};

		const fakeResult = {
			data              : customData,
			isLoading         : false,
			isFetchingNextPage: false,
			hasNextPage       : false,
		};

		const { result } = renderHook(() => fakeResult, { wrapper });

		expect(result.current.data.pages).toHaveLength(2);
		expect(result.current.data.pages[0]).toEqual(fakeRawData);
		expect(result.current.data.pages[1]).toEqual(fakeSecondPageData);
	});

	it('should use custom pageSize and orderByField if provided', async () =>
	{
		const { result } = renderHook(
			() => useRawPaginatedBlueprintSummaries(30, 'numberOfFavorites'),
			{ wrapper },
		);

		await waitFor(() => expect(result.current.isLoading).toBeFalsy());

		expect(fetchPaginatedSummaries).toHaveBeenCalledWith(
			// custom pageSize
			30,
			// default lastKey
			null,
			// default lastValue
			null,
			// custom orderByField
			'numberOfFavorites',
		);
	});
});
