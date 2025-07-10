import {useMemo} from 'react';
import {useRawPaginatedBlueprintSummaries} from './useRawPaginatedBlueprintSummaries';
import {enrichPaginatedBlueprintSummaries} from '../utils/enrichPaginatedBlueprintSummaries';
import {validateEnrichedPaginatedBlueprintSummaries} from '../schemas';
import type {RawPaginatedBlueprintSummaries, EnrichedPaginatedBlueprintSummaries} from '../schemas';

/**
 * Hook to fetch and enrich paginated blueprint summaries
 * @param pageSize - The number of items per page
 * @param orderByField - The field to order the results by
 * @returns React Query result with enriched paginated blueprint summaries
 */
export const useEnrichedPaginatedBlueprintSummaries = (pageSize = 60, orderByField = 'lastUpdatedDate') => {
	const rawPaginatedQuery = useRawPaginatedBlueprintSummaries(pageSize, orderByField);

	const enrichedData = useMemo(() => {
		if (!rawPaginatedQuery.data) return null;

		// Enrich the raw data
		// rawPaginatedQuery.data already has the structure { pages, pageParams } from useInfiniteQuery
		console.log('Raw paginated data before enrichment:', JSON.stringify(rawPaginatedQuery.data));
		const enriched = enrichPaginatedBlueprintSummaries(rawPaginatedQuery.data);
		console.log('Enriched paginated data before validation:', JSON.stringify(enriched));

		// Strict validation to catch any issues
		try {
			const validated = validateEnrichedPaginatedBlueprintSummaries(enriched);
			console.log('Validated enriched paginated data:', JSON.stringify(validated));
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

export default useEnrichedPaginatedBlueprintSummaries;
