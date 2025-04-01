import { useQuery } from '@tanstack/react-query';
import { fetchBlueprint } from '../api/firebase';
import type { RawBlueprint, EnrichedBlueprintSummary } from '../schemas';

export const useRawBlueprint = (blueprintId: string, blueprintSummary: EnrichedBlueprintSummary) =>
{
	return useQuery<RawBlueprint>({
		queryKey : ['blueprints', 'blueprintId', blueprintId],
		queryFn  : () => fetchBlueprint(blueprintId, blueprintSummary),
		enabled  : Boolean(blueprintId) && Boolean(blueprintSummary),
		staleTime: Infinity,
		gcTime   : Infinity,
	});
};

export default useRawBlueprint;
