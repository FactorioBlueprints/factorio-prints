import {useInfiniteQuery, type InfiniteData} from '@tanstack/react-query';
import {useEffect} from 'react';
import {fetchPaginatedSummaries} from '../api/firebase';
import {updateHighWatermark} from '../localStorage';
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
	const query = useInfiniteQuery<
		RawBlueprintSummaryPage,
		Error,
		InfiniteData<RawBlueprintSummaryPage>,
		any,
		PageParam
	>({
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

	useEffect(() => {
		if (orderByField === 'lastUpdatedDate' && query.data?.pages) {
			const allSummaries = query.data.pages.flatMap((page: RawBlueprintSummaryPage) => Object.values(page.data));
			const latestDates = allSummaries
				.map((summary: any) => summary.lastUpdatedDate)
				.filter((date: any): date is number => date !== undefined);

			if (latestDates.length > 0) {
				const maxDate = Math.max(...latestDates);
				updateHighWatermark(maxDate);
			}
		}
	}, [query.data, orderByField]);

	return query;
};

export default useRawPaginatedBlueprintSummaries;
