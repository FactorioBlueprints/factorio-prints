import {fetchBlueprint, fetchBlueprintSummary} from '../api/firebase';
import type {EnrichedBlueprintSummary} from '../schemas';

export const blueprintSummaryQuery = (blueprintId: string) => ({
	queryKey: ['blueprintSummaries', 'blueprintId', blueprintId],
	queryFn: () => fetchBlueprintSummary(blueprintId),
	staleTime: 1000 * 60 * 60 * 24, // 24 hours
});

export const blueprintQuery = (blueprintId: string, blueprintSummary: EnrichedBlueprintSummary) => ({
	queryKey: ['blueprints', 'blueprintId', blueprintId],
	queryFn: () => fetchBlueprint(blueprintId, blueprintSummary),
	staleTime: Infinity,
	gcTime: Infinity,
});
