import { useQuery } from '@tanstack/react-query';
import { blueprintSummaryQuery } from '../queries/blueprintQueries';
import type { RawBlueprintSummary } from '../schemas';

/**
 * Hook to fetch a raw blueprint summary by ID
 */
export const useRawBlueprintSummary = (blueprintId: string | undefined) =>
{
	return useQuery<RawBlueprintSummary | null>({
		...blueprintSummaryQuery(blueprintId!),
		enabled: Boolean(blueprintId),
	});
};

export default useRawBlueprintSummary;
