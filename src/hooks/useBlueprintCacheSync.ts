import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RawBlueprint, RawBlueprintSummary } from '../schemas';

/**
 * Hook that synchronizes blueprint cache entries with their corresponding summary entries
 * Watches for changes to blueprint summaries and invalidates the corresponding blueprint entry
 * when actual data changes are detected by comparing lastUpdatedDate
 */
export const useBlueprintCacheSync = (): void =>
{
	const queryClient = useQueryClient();

	useEffect(() =>
	{
		// Set up a subscription to the query cache
		const unsubscribe = queryClient.getQueryCache().subscribe((event) =>
		{
			const queryKey = event.query.queryKey;

			// We're only interested in successful updates to blueprint summaries
			if (
				event.type === 'updated'
				&& event.query.state.status === 'success'
				&& Array.isArray(queryKey)
				&& queryKey[0] === 'blueprintSummaries'
				&& queryKey[1] === 'blueprintId'
				&& typeof queryKey[2] === 'string'
			)
			{
				// Get the blueprint ID from the query key
				const blueprintId = queryKey[2];
				const newData = event.query.state.data as RawBlueprintSummary | undefined;

				// If we don't have new data or it's not a summary with lastUpdatedDate, skip
				if (!newData || !newData.lastUpdatedDate)
				{
					return;
				}

				// Check if data has actually changed by comparing lastUpdatedDate
				// with any existing blueprint data in the cache
				const existingData = queryClient.getQueryData<RawBlueprint>([
					'blueprints',
					'blueprintId',
					blueprintId,
				]);

				// If there's no existing data or the lastUpdatedDate has changed, invalidate the blueprint data
				if (!existingData || existingData.lastUpdatedDate !== newData.lastUpdatedDate)
				{
					// Invalidate only the specific blueprint query
					queryClient.invalidateQueries({
						queryKey   : ['blueprints', 'blueprintId', blueprintId],
						exact      : true,
						refetchType: 'none', // Just mark as stale, don't automatically refetch
					});
				}
			}
		});

		// Clean up the subscription when the component unmounts
		return () =>
		{
			unsubscribe();
		};
	}, [queryClient]);
};

export default useBlueprintCacheSync;
