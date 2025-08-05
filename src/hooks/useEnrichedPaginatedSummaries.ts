import {useMemo} from 'react';
import type {EnrichedPaginatedBlueprintSummaries, RawPaginatedBlueprintSummaries} from '../schemas';
import {validateEnrichedPaginatedBlueprintSummaries} from '../schemas';
import {enrichPaginatedBlueprintSummaries} from '../utils/enrichPaginatedBlueprintSummaries';
import {useRawPaginatedSummaries} from './useRawPaginatedSummaries';

/**
 * Hook to fetch and enrich paginated blueprint summaries with cache population side effect
 * @param pageSize - The number of items per page
 * @param orderByField - The field to order the results by
 * @returns React Query result with enriched paginated blueprint summaries
 */
export const useEnrichedPaginatedSummaries = (pageSize = 60, orderByField = 'lastUpdatedDate') => {
	const rawPaginatedQuery = useRawPaginatedSummaries(pageSize, orderByField);

	const enrichedData = useMemo(() => {
		if (!rawPaginatedQuery.data) return null;

		// Enrich the raw data
		// rawPaginatedQuery.data already has the structure { pages, pageParams } from useInfiniteQuery
		const enriched = enrichPaginatedBlueprintSummaries(rawPaginatedQuery.data as RawPaginatedBlueprintSummaries);

		// Strict validation to catch any issues
		const validated = validateEnrichedPaginatedBlueprintSummaries(enriched);
		return validated ?? null;
	}, [rawPaginatedQuery.data]);

	return {
		...rawPaginatedQuery,
		data: enrichedData,
	};
};

export default useEnrichedPaginatedSummaries;
