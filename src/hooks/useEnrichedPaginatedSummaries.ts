import {useMemo} from 'react';
import {useRawPaginatedSummaries} from './useRawPaginatedSummaries';
import {enrichPaginatedBlueprintSummaries} from '../utils/enrichPaginatedBlueprintSummaries';
import {validateEnrichedPaginatedBlueprintSummaries} from '../schemas';
import type {RawPaginatedBlueprintSummaries, EnrichedPaginatedBlueprintSummaries} from '../schemas';

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
		try {
			const validated = validateEnrichedPaginatedBlueprintSummaries(enriched);
			return validated ?? null;
		} catch (error) {
			console.error('Validation error in enriched paginated data:', error);
			throw error; // Re-throw to bubble up the error
		}
	}, [rawPaginatedQuery.data]);

	return {
		...rawPaginatedQuery,
		data: enrichedData,
	};
};

export default useEnrichedPaginatedSummaries;
