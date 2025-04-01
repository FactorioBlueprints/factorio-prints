import { useMemo } from 'react';
import type { EnrichedPaginatedBlueprintSummaries, EnrichedBlueprintSummary } from '../schemas';

export const useFlattenedEnrichedPaginatedSummaries = (
	paginatedData: EnrichedPaginatedBlueprintSummaries | null | undefined
): EnrichedBlueprintSummary[] =>
{
	return useMemo(() =>
	{
		if (!paginatedData?.pages)
		{
			return [];
		}

		// Enriched pages have data as arrays, not objects
		return paginatedData.pages.flatMap(page => page.data);
	}, [paginatedData]);
};

export default useFlattenedEnrichedPaginatedSummaries;
