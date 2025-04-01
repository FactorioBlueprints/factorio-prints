import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchPaginatedSummaries } from '../api/firebase';
import { useRawPaginatedSummaries } from './useRawPaginatedSummaries';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import type { RawBlueprintSummaryPage } from '../schemas';

vi.mock('../api/firebase');

const examplePage1: RawBlueprintSummaryPage = {
	data: {
		blueprint1: {
			title: 'Test Blueprint 1',
			imgurId: 'img1',
			imgurType: 'image/png',
			numberOfFavorites: 10,
			lastUpdatedDate: 1000,
		},
		blueprint2: {
			title: 'Test Blueprint 2',
			imgurId: 'img2',
			imgurType: 'image/jpeg',
			numberOfFavorites: 20,
			lastUpdatedDate: 2000,
		},
	},
	hasMore: true,
	lastKey: 'blueprint2',
	lastValue: 2000,
};

const examplePage2: RawBlueprintSummaryPage = {
	data: {
		blueprint3: {
			title: 'Test Blueprint 3',
			imgurId: 'img3',
			imgurType: 'image/png',
			numberOfFavorites: 30,
			lastUpdatedDate: 3000,
		},
		blueprint4: {
			title: 'Test Blueprint 4',
			imgurId: 'img4',
			imgurType: 'image/jpeg',
			numberOfFavorites: 40,
			lastUpdatedDate: 4000,
		},
	},
	hasMore: false,
	lastKey: null,
	lastValue: null,
};

describe('useRawPaginatedSummaries', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});

		vi.clearAllMocks();
		vi.mocked(fetchPaginatedSummaries).mockResolvedValue(examplePage1);
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	);

	it('should fetch and return raw paginated summaries with default parameters', async () => {
		const { result } = renderHook(() => useRawPaginatedSummaries(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toStrictEqual({
			pages: [examplePage1],
			pageParams: [{ lastKey: null, lastValue: null }],
		});
	});

	it('should populate individual blueprint summaries in cache after fetching', async () => {
		const { result } = renderHook(() => useRawPaginatedSummaries(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify each summary was cached individually
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint1'])).toStrictEqual(
			examplePage1.data.blueprint1
		);
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint2'])).toStrictEqual(
			examplePage1.data.blueprint2
		);
	});

	it('should handle pagination correctly', async () => {
		vi.mocked(fetchPaginatedSummaries)
			.mockResolvedValueOnce(examplePage1)
			.mockResolvedValueOnce(examplePage2);

		const { result } = renderHook(() => useRawPaginatedSummaries(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Fetch next page
		await result.current.fetchNextPage();
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));

		expect(result.current.data).toStrictEqual({
			pages: [examplePage1, examplePage2],
			pageParams: [
				{ lastKey: null, lastValue: null },
				{ lastKey: 'blueprint2', lastValue: 2000 },
			],
		});

		// Verify all summaries are cached
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint1'])).toStrictEqual(
			examplePage1.data.blueprint1
		);
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint2'])).toStrictEqual(
			examplePage1.data.blueprint2
		);
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint3'])).toStrictEqual(
			examplePage2.data.blueprint3
		);
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint4'])).toStrictEqual(
			examplePage2.data.blueprint4
		);
	});

	it('should use custom parameters correctly', async () => {
		const { result } = renderHook(
			() => useRawPaginatedSummaries(30, 'numberOfFavorites'),
			{ wrapper }
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(vi.mocked(fetchPaginatedSummaries)).toHaveBeenCalledWith(
			30,
			null,
			null,
			'numberOfFavorites'
		);
	});

	it('should handle errors correctly', async () => {
		const error = new Error('Failed to fetch summaries');
		vi.mocked(fetchPaginatedSummaries).mockRejectedValue(error);

		const { result } = renderHook(() => useRawPaginatedSummaries(), { wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toStrictEqual(error);
	});

	it('should not allow fetching next page when hasMore is false', async () => {
		const singlePage: RawBlueprintSummaryPage = {
			data: { blueprint1: examplePage1.data.blueprint1 },
			hasMore: false,
			lastKey: null,
			lastValue: null,
		};
		vi.mocked(fetchPaginatedSummaries).mockResolvedValue(singlePage);

		const { result } = renderHook(() => useRawPaginatedSummaries(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.hasNextPage).toBe(false);
		expect(result.current.data).toStrictEqual({
			pages: [singlePage],
			pageParams: [{ lastKey: null, lastValue: null }],
		});
	});
});
