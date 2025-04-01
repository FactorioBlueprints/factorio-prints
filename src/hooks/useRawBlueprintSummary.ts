import { useQuery } from '@tanstack/react-query';
import { fetchBlueprintSummary } from '../api/firebase';
import type { RawBlueprintSummary } from '../schemas';

/**
 * Hook to fetch a raw blueprint summary by ID
 */
export const useRawBlueprintSummary = (blueprintId: string | undefined) =>
{
	return useQuery<RawBlueprintSummary>({
		queryKey : ['blueprintSummaries', 'blueprintId', blueprintId],
		queryFn  : () => fetchBlueprintSummary(blueprintId!),
		enabled  : Boolean(blueprintId),
		staleTime: 1000 * 60 * 60 * 24,
	});
};

export default useRawBlueprintSummary;
