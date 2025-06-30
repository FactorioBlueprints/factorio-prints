import { useQuery } from '@tanstack/react-query';
import { fetchBlueprint } from '../api/firebase';
import type { RawBlueprint, EnrichedBlueprintSummary } from '../schemas';

export const useRawBlueprint = (blueprintId: string, blueprintSummary: EnrichedBlueprintSummary | null) =>
{
	return useQuery<RawBlueprint | null>({
		queryKey: ['blueprints', 'blueprintId', blueprintId],
		queryFn : () =>
		{
			if (!blueprintSummary)
			{
				throw new Error('Blueprint summary is required to fetch blueprint data');
			}
			return fetchBlueprint(blueprintId, blueprintSummary);
		},
		enabled  : Boolean(blueprintId) && Boolean(blueprintSummary),
		staleTime: Infinity,
		gcTime   : Infinity,
	});
};

export default useRawBlueprint;
