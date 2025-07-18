import {useInfiniteQuery, useQueryClient, keepPreviousData, type InfiniteData} from '@tanstack/react-query';
import {useEffect} from 'react';
import {fetchPaginatedSummaries} from '../api/firebase';
import type {RawBlueprintSummaryPage} from '../schemas';

type PageParam = {
	lastKey: string | null;
	lastValue: number | null;
};

/**
 * Hook to fetch raw paginated blueprint summaries
 * @param pageSize - Number of items per page (default: 60)
 * @param orderByField - Field to order results by (default: 'lastUpdatedDate')
 * @returns Infinite query result with raw paginated blueprint summaries
 */
export const useRawPaginatedSummaries = (pageSize = 60, orderByField = 'lastUpdatedDate') => {
	const queryClient = useQueryClient();

	const result = useInfiniteQuery<
		RawBlueprintSummaryPage,
		Error,
		InfiniteData<RawBlueprintSummaryPage>,
		readonly unknown[],
		PageParam
	>({
		queryKey: ['blueprintSummaries', 'orderByField', orderByField, 'pageSize', pageSize],
		queryFn: async ({pageParam = {lastKey: null, lastValue: null}}) => {
			return fetchPaginatedSummaries(pageSize, pageParam.lastKey, pageParam.lastValue, orderByField);
		},
		getNextPageParam: (lastPage) => {
			if (!lastPage.hasMore) {
				return undefined;
			}
			return {
				lastKey: lastPage.lastKey,
				lastValue: lastPage.lastValue,
			};
		},
		initialPageParam: {lastKey: null, lastValue: null},
		placeholderData: keepPreviousData,
	});

	// Set individual blueprint summaries in cache for cross-query consistency
	useEffect(() => {
		if (result.data) {
			result.data.pages.forEach((page) => {
				Object.entries(page.data).forEach(([blueprintId, summary]) => {
					queryClient.setQueryData(['blueprintSummaries', 'blueprintId', blueprintId], summary);
				});
			});
		}
	}, [result.data, queryClient]);

	return result;
};

export default useRawPaginatedSummaries;
