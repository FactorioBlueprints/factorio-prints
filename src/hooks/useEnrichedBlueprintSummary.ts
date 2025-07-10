import {useMemo} from 'react';
import {useRawBlueprintSummary} from './useRawBlueprintSummary';
import {enrichBlueprintSummary} from '../utils/enrichBlueprintSummary';

/**
 * Hook to fetch and enrich a blueprint summary by ID
 * @param blueprintId - The blueprint ID to fetch
 * @returns React Query result with enriched blueprint summary data
 */
export const useEnrichedBlueprintSummary = (blueprintId: string) => {
	const rawBlueprintSummaryQuery = useRawBlueprintSummary(blueprintId);

	return {
		...rawBlueprintSummaryQuery,
		data: useMemo(() => {
			if (!rawBlueprintSummaryQuery.data) return null;

			// Enrich the raw data
			return enrichBlueprintSummary(rawBlueprintSummaryQuery.data, blueprintId);
		}, [rawBlueprintSummaryQuery.data, blueprintId]),
	};
};

export default useEnrichedBlueprintSummary;
