import {useMutation, useQueryClient} from '@tanstack/react-query';
import {reconcileFavoritesCount} from '../api/firebase';

/**
 * Hook to reconcile favorites count for a blueprint
 * @returns The mutation object for reconciling favorites
 */
export const useReconcileFavorites = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (blueprintId: string) => {
			return await reconcileFavoritesCount(blueprintId);
		},
		onSuccess: (result) => {
			if (result.reconciled) {
				// Invalidate relevant queries if reconciliation happened
				queryClient.invalidateQueries({queryKey: ['blueprints', 'blueprintId', result.blueprintId]});

				// Invalidate all paginated summary queries to ensure proper reordering
				queryClient.invalidateQueries({queryKey: ['blueprintSummaries']});

				// Additionally, these specific queries are important for different views
				queryClient.invalidateQueries({queryKey: ['blueprintSummaries', 'orderByField', 'lastUpdatedDate']});
				queryClient.invalidateQueries({queryKey: ['blueprintSummaries', 'blueprintId', result.blueprintId]});
			}
		},
	});
};

export default useReconcileFavorites;
