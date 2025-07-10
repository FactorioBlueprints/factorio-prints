import {useQuery} from '@tanstack/react-query';
import {blueprintQuery} from '../queries/blueprintQueries';
import type {RawBlueprint, EnrichedBlueprintSummary} from '../schemas';

export const useRawBlueprint = (blueprintId: string, blueprintSummary: EnrichedBlueprintSummary | null) => {
	return useQuery<RawBlueprint | null>({
		...(blueprintSummary
			? blueprintQuery(blueprintId, blueprintSummary)
			: {
					queryKey: ['blueprints', 'blueprintId', blueprintId],
					queryFn: () => {
						throw new Error('Blueprint summary is required to fetch blueprint data');
					},
				}),
		enabled: Boolean(blueprintId) && Boolean(blueprintSummary),
	});
};

export default useRawBlueprint;
