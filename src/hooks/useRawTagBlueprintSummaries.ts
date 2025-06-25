import { useQueries, useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchBlueprintSummary, fetchByTagData } from '../api/firebase';
import type { RawBlueprintSummary } from '../schemas';

/**
 * Hook to fetch raw tag data and then load all raw blueprint summaries associated with that tag
 * @param tagId - The tag ID to fetch blueprints for (normalized without slashes)
 * @returns The raw blueprint summaries query results
 */
export const useRawTagBlueprintSummaries = (tagId: string) => {
	if (tagId && (tagId.startsWith('/') || tagId.endsWith('/'))) {
		throw new Error(`useRawTagBlueprintSummaries: tagId "${tagId}" should not start or end with a slash. The normalized tag id should be used for queries.`);
	}

	// First, fetch the tag data to get blueprint IDs
	const tagQuery = useQuery<Record<string, boolean>>({
		queryKey: ['byTag', 'tagId', tagId],
		queryFn: () => fetchByTagData(tagId),
		enabled: !!tagId,
		staleTime: 24 * 60 * 60 * 1000, // 24 hours
		gcTime: 24 * 60 * 60 * 1000, // 24 hours
	});

	const blueprintIds = tagQuery.data ? Object.keys(tagQuery.data) : [];

	// Then fetch all blueprint summaries for those IDs
	const blueprintQueries = useQueries({
		queries: blueprintIds.map(blueprintId => ({
			queryKey: ['blueprintSummaries', 'blueprintId', blueprintId],
			queryFn: () => fetchBlueprintSummary(blueprintId),
			enabled: !!blueprintId && tagQuery.isSuccess,
			staleTime: 24 * 60 * 60 * 1000, // 24 hours
			gcTime: 24 * 60 * 60 * 1000, // 24 hours
		})),
	});

	// Organize queries by blueprint ID for easier access
	const queriesByKey: Record<string, UseQueryResult<RawBlueprintSummary | null, Error>> = {};
	for (let i = 0; i < blueprintIds.length; i++) {
		queriesByKey[blueprintIds[i]] = blueprintQueries[i];
	}

	return {
		tagQuery,
		blueprintQueries: queriesByKey,
		isLoading: tagQuery.isLoading || (tagQuery.isSuccess && blueprintIds.length > 0 && blueprintQueries.some(q => q.isLoading)),
		isError: tagQuery.isError || (tagQuery.isSuccess && blueprintIds.length > 0 && blueprintQueries.some(q => q.isError)),
		isSuccess: tagQuery.isSuccess && (blueprintIds.length === 0 || blueprintQueries.every(q => q.isSuccess)),
		blueprintIds,
	};
};

export default useRawTagBlueprintSummaries;
