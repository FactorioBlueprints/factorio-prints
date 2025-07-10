import {useFilterByTitle} from './useFilterByTitle';
import {useFilterByTags} from './useFilterByTags';
import type {EnrichedBlueprintSummary} from '../schemas';

export const useFilteredBlueprintSummaries = (
	blueprintSummaries: EnrichedBlueprintSummary[] = [],
): EnrichedBlueprintSummary[] => {
	// Filter by title first (usually faster)
	const titleFiltered = useFilterByTitle(blueprintSummaries);

	// Then filter by tags
	return useFilterByTags(titleFiltered);
};

export default useFilteredBlueprintSummaries;
