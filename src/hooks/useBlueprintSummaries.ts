/**
 * @deprecated Use useEnrichedBlueprintSummaries instead
 */
import useEnrichedBlueprintSummaries from './useEnrichedBlueprintSummaries';

/**
 * Hook to fetch and enrich multiple blueprint summaries by their IDs
 * @deprecated Use useEnrichedBlueprintSummaries instead
 * @param blueprintsData - Object with blueprint IDs as keys
 * @param blueprintsSuccess - Whether the parent query was successful
 * @returns Object containing queriesByKey and an array of enriched summaries
 */
const useBlueprintSummaries = (
	blueprintsData: Record<string, boolean> | null | undefined,
	blueprintsSuccess: boolean,
) =>
{
	// Simply pass through to the new implementation
	return useEnrichedBlueprintSummaries(blueprintsData, blueprintsSuccess);
};

export default useBlueprintSummaries;
