import {useInfiniteQuery} from '@tanstack/react-query';
import {fetchPaginatedSummaries} from '../api/firebase';
import type {RawBlueprintSummaryPage} from '../schemas';

type PageParam = {
	lastKey: string | null;
	lastValue: number | null;
};

/**
 * Hook to fetch paginated blueprint summaries
 * @param pageSize - The number of items per page
 * @param orderByField - The field to order the results by
 * @returns React Query result with paginated blueprint summaries
 */
export const useRawPaginatedBlueprintSummaries = (pageSize = 60, orderByField = 'lastUpdatedDate') => {
	return useInfiniteQuery<RawBlueprintSummaryPage, Error, RawBlueprintSummaryPage, any, PageParam>({
		queryKey: ['rawPaginatedBlueprintSummaries', 'orderBy', orderByField],
		initialPageParam: {lastKey: null, lastValue: null},
		queryFn: async ({pageParam}) => {
			const param = pageParam ?? {lastKey: null, lastValue: null};
			return await fetchPaginatedSummaries(pageSize, param.lastKey, param.lastValue, orderByField);
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
	});
};

export default useRawPaginatedBlueprintSummaries;
