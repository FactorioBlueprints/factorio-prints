import { useEnrichedTagBlueprintSummaries } from './useEnrichedTagBlueprintSummaries';

/**
 * Hook to fetch tag data and then load all blueprints associated with that tag
 * @deprecated Use useRawTagBlueprintSummaries or useEnrichedTagBlueprintSummaries instead
 * @param tagId - The tag ID to fetch blueprints for
 * @returns The blueprint summaries query results
 */
export const useTagBlueprintSummaries = useEnrichedTagBlueprintSummaries;
