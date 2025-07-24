import type {EnrichedBlueprintSummary} from '../schemas';
import {useFilterByTags} from './useFilterByTags';
import {useFilterByTitle} from './useFilterByTitle';

export const useFilteredBlueprintSummaries = (
	blueprintSummaries: EnrichedBlueprintSummary[] = [],
): EnrichedBlueprintSummary[] => {
	// Filter by title first (usually faster)
	const titleFiltered = useFilterByTitle(blueprintSummaries);

	// Then filter by tags
	return useFilterByTags(titleFiltered);
};

export default useFilteredBlueprintSummaries;
