import { useMemo } from 'react';
import useRawBlueprintSummaries from './useRawBlueprintSummaries';
import { enrichBlueprintSummary } from '../utils/enrichBlueprintSummary';
import type { UseQueryResult } from '@tanstack/react-query';
import type { RawBlueprintSummary, EnrichedBlueprintSummary } from '../schemas';

/**
 * Hook to fetch and enrich multiple blueprint summaries by their IDs
 * @param blueprintsData - Object with blueprint IDs as keys
 * @param blueprintsSuccess - Whether the parent query was successful
 * @returns Object containing queriesByKey and an array of enriched summaries
 */
const useEnrichedBlueprintSummaries = (
	blueprintsData: Record<string, boolean> | null | undefined,
	blueprintsSuccess: boolean,
): {
	queriesByKey: Record<string, UseQueryResult<RawBlueprintSummary | null, Error>>;
	blueprintSummaries: (EnrichedBlueprintSummary | null)[];
	rawBlueprintSummaries: RawBlueprintSummary[];
} =>
{
	const { queriesByKey, rawBlueprintSummaries } = useRawBlueprintSummaries(blueprintsData, blueprintsSuccess);

	const blueprintSummaries = useMemo(() =>
	{
		// Create an array of enriched blueprint summaries
		return Object.entries(queriesByKey)
			.filter(([, query]) => query.isSuccess && query.data)
			.map(([blueprintId, query]) => enrichBlueprintSummary(query.data!, blueprintId));
	}, [queriesByKey]);

	return {
		queriesByKey,
		blueprintSummaries,
		rawBlueprintSummaries,
	};
};

export default useEnrichedBlueprintSummaries;
