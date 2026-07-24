import {type UseQueryOptions, type UseQueryResult, useQueries} from '@tanstack/react-query';
import {fetchBlueprintTags} from '../api/firebase';
import {QUERY_CACHE_RETENTION_MILLISECONDS} from '../providers/queryClient';

export const getBlueprintTagsOptions = (blueprintId: string, enabled = true): UseQueryOptions<string[], Error> => ({
	queryKey: ['blueprints', 'blueprintId', blueprintId, 'tags'],
	queryFn: () => fetchBlueprintTags(blueprintId),
	enabled: (enabled !== undefined ? enabled : true) && !!blueprintId,
	staleTime: QUERY_CACHE_RETENTION_MILLISECONDS,
	gcTime: QUERY_CACHE_RETENTION_MILLISECONDS,
	placeholderData: [],
});

export const useBlueprintsTags = (
	blueprintIds: string[] = [],
	enabled = true,
): Record<string, UseQueryResult<string[], Error>> => {
	const queryResults = useQueries({
		queries: blueprintIds.map((blueprintId) => getBlueprintTagsOptions(blueprintId, enabled)),
	});

	const queriesByKey: Record<string, UseQueryResult<string[], Error>> = {};

	for (let i = 0; i < blueprintIds.length; i++) {
		queriesByKey[blueprintIds[i]] = queryResults[i];
	}

	return queriesByKey;
};
