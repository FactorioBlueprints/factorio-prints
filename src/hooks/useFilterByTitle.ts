import { useStore } from '@tanstack/react-store';
import { searchParamsStore } from '../store/searchParamsStore';
import type { EnrichedBlueprintSummary } from '../schemas';

/**
 * Hook to filter blueprint summaries by title only
 * @param blueprintSummaries - The blueprint summaries to filter
 * @returns The filtered blueprint summaries
 */
export const useFilterByTitle = (blueprintSummaries: EnrichedBlueprintSummary[] = []): EnrichedBlueprintSummary[] =>
{
	const titleFilter = useStore(searchParamsStore, state => state.titleFilter);

	if (!titleFilter)
	{
		return blueprintSummaries;
	}

	return blueprintSummaries.filter(blueprintSummary =>
	{
		if (blueprintSummary.title === undefined)
		{
			return false;
		}
		return blueprintSummary.title.toLowerCase().includes(titleFilter.toLowerCase());
	});
};

export default useFilterByTitle;
