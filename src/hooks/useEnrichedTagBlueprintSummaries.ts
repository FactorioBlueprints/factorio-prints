import { useMemo } from 'react';
import { useRawTagBlueprintSummaries } from './useRawTagBlueprintSummaries';
import { enrichBlueprintSummary } from '../utils/enrichBlueprintSummary';
import type { UseQueryResult } from '@tanstack/react-query';
import type { RawBlueprintSummary, EnrichedBlueprintSummary } from '../schemas';

/**
 * Hook to fetch tag data and then load all enriched blueprint summaries associated with that tag
 * @param tagId - The tag ID to fetch blueprints for (normalized without slashes)
 * @returns The enriched blueprint summaries query results
 */
export const useEnrichedTagBlueprintSummaries = (tagId: string) => {
	const rawResult = useRawTagBlueprintSummaries(tagId);

	// Enrich each blueprint query result
	const enrichedBlueprintQueries = useMemo(() => {
		const enrichedQueries: Record<string, UseQueryResult<EnrichedBlueprintSummary, Error>> = {};

		for (const blueprintId of rawResult.blueprintIds) {
			const rawQuery = rawResult.blueprintQueries[blueprintId];

			enrichedQueries[blueprintId] = {
				...rawQuery,
				data: rawQuery.data ? enrichBlueprintSummary(rawQuery.data, blueprintId) : undefined,
			} as UseQueryResult<EnrichedBlueprintSummary, Error>;
		}

		return enrichedQueries;
	}, [rawResult.blueprintQueries, rawResult.blueprintIds]);

	return {
		...rawResult,
		blueprintQueries: enrichedBlueprintQueries,
	};
};

export default useEnrichedTagBlueprintSummaries;
