import { useStore } from '@tanstack/react-store';
import { searchParamsStore } from '../store/searchParamsStore';
import { useBlueprintsTags } from './useBlueprintTags';
import type { EnrichedBlueprintSummary } from '../schemas';

export const useFilterByTags = (
	blueprintSummaries: EnrichedBlueprintSummary[] = [],
): EnrichedBlueprintSummary[] =>
{
	const filteredTags = useStore(searchParamsStore, state => state.filteredTags);
	const tagFilterExists = filteredTags.length > 0;

	const blueprintIds = blueprintSummaries.map(summary => summary.key);
	const blueprintTagQueriesById = useBlueprintsTags(blueprintIds, tagFilterExists);

	if (!tagFilterExists)
	{
		return blueprintSummaries;
	}

	return blueprintSummaries.filter(blueprintSummary =>
	{
		const blueprintId = blueprintSummary.key;
		const blueprintTagQuery = blueprintTagQueriesById[blueprintId];
		const {
			data: blueprintTagData,
			isSuccess: blueprintTagIsSuccess,
		} = blueprintTagQuery;

		if (!blueprintTagIsSuccess)
		{
			return false;
		}

		return filteredTags.every(filteredTag => blueprintTagData.includes(filteredTag));
	});
};
