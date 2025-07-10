import {useMutation, useQueryClient} from '@tanstack/react-query';
import {reconcileUserFavorites} from '../api/firebase';

/**
 * Hook to reconcile favorites for a specific user
 * @returns The mutation object for reconciling user favorites
 */
export const useReconcileUserFavorites = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			return await reconcileUserFavorites(userId);
		},
		onSuccess: ({userId, reconciled}: {userId: string; reconciled: boolean}) => {
			if (reconciled) {
				// Invalidate relevant queries
				queryClient.invalidateQueries({queryKey: ['users', 'userId', userId, 'favorites']});

				// Invalidate any blueprint queries that might have been affected
				queryClient.invalidateQueries({queryKey: ['blueprints']});
				queryClient.invalidateQueries({queryKey: ['blueprintSummaries']});
			}
		},
	});
};

export default useReconcileUserFavorites;
