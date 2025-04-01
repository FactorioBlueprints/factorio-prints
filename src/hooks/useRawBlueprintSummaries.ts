import { useQueries, UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchBlueprintSummary } from '../api/firebase';
import type { RawBlueprintSummary } from '../schemas';

/**
 * Hook to fetch multiple raw blueprint summaries by their IDs
 * @param blueprintsData - Object with blueprint IDs as keys
 * @param blueprintsSuccess - Whether the parent query was successful
 * @returns Object containing queriesByKey and an array of raw summaries
 */
const useRawBlueprintSummaries = (
	blueprintsData: Record<string, boolean> | null | undefined,
	blueprintsSuccess: boolean
): {
	queriesByKey: Record<string, UseQueryResult<RawBlueprintSummary, Error>>;
	rawBlueprintSummaries: RawBlueprintSummary[];
} =>
{
	const blueprintIds = Object.keys(blueprintsData || {});

	const queryResults = useQueries({
		queries: blueprintIds.map(blueprintId => ({
			queryKey : ['blueprintSummaries', 'blueprintId', blueprintId],
			queryFn  : () => fetchBlueprintSummary(blueprintId),
			enabled  : !!blueprintId && blueprintsSuccess,
			staleTime: 1000 * 60 * 60 * 24,
		})),
	});

	const queriesByKey = useMemo(() =>
	{
		const resultMap: Record<string, UseQueryResult<RawBlueprintSummary, Error>> = {};
		for (let i = 0; i < blueprintIds.length; i++)
		{
			resultMap[blueprintIds[i]] = queryResults[i];
		}
		return resultMap;
	}, [blueprintIds, queryResults]);

	const rawBlueprintSummaries = useMemo(() =>
	{
		return Object.entries(queriesByKey)
			.filter(([, query]) => query.isSuccess && query.data)
			.map(([, query]) => query.data);
	}, [queriesByKey]);

	return {
		queriesByKey,
		rawBlueprintSummaries,
	};
};

export default useRawBlueprintSummaries;
