import React from 'react';
import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseQueryResult,
	type UseMutationResult,
} from '@tanstack/react-query';
import {getDatabase, get, ref, update as dbUpdate} from 'firebase/database';
import {app} from '../base';

interface ReconcileResult {
	userId: string;
	blueprintId: string;
	isFavorite: boolean;
}

/**
 * Reconciles favorites between user and blueprint
 */
const reconcileFavorites = async (
	userId: string,
	blueprintId: string,
	userHasFavorite: boolean,
	blueprintHasFavorite: boolean,
): Promise<void> => {
	if (!userId || !blueprintId) return;

	if (userHasFavorite === blueprintHasFavorite) return;

	const shouldBeFavorite = userHasFavorite || blueprintHasFavorite;

	const updates: Record<string, boolean | null> = {};

	if (userHasFavorite !== shouldBeFavorite) {
		updates[`/users/${userId}/favorites/${blueprintId}`] = shouldBeFavorite || null;
	}

	if (blueprintHasFavorite !== shouldBeFavorite) {
		updates[`/blueprints/${blueprintId}/favorites/${userId}`] = shouldBeFavorite || null;
	}

	if (Object.keys(updates).length > 0) {
		console.warn({updates});
		await dbUpdate(ref(getDatabase(app)), updates);
	}
};

export const useIsUserFavorite = (
	userId: string | null | undefined,
	blueprintId: string | null | undefined,
): UseQueryResult<boolean> => {
	return useQuery({
		queryKey: ['users', 'userId', userId, 'favorites', 'blueprintId', blueprintId],
		queryFn: async () => {
			if (!userId || !blueprintId) return false;
			const snapshot = await get(ref(getDatabase(app), `/users/${userId}/favorites/${blueprintId}`));
			return snapshot.exists() && snapshot.val() === true;
		},
		enabled: !!userId && !!blueprintId,
	});
};

export const useIsBlueprintFavorite = (
	blueprintId: string | null | undefined,
	userId: string | null | undefined,
): UseQueryResult<boolean> => {
	return useQuery({
		queryKey: ['blueprints', 'blueprintId', blueprintId, 'favorites', 'userId', userId],
		queryFn: async () => {
			if (!userId || !blueprintId) return false;
			const snapshot = await get(ref(getDatabase(app), `/blueprints/${blueprintId}/favorites/${userId}`));
			return snapshot.exists() && snapshot.val() === true;
		},
		enabled: !!blueprintId && !!userId,
	});
};

export const useIsFavorite = (
	userId: string | null | undefined,
	blueprintId: string | null | undefined,
): UseQueryResult<boolean> => {
	const queryClient = useQueryClient();
	const userFavoriteQuery = useIsUserFavorite(userId, blueprintId);
	const blueprintFavoriteQuery = useIsBlueprintFavorite(blueprintId, userId);

	const isFavorite =
		(userFavoriteQuery.isSuccess && userFavoriteQuery.data) ||
		(blueprintFavoriteQuery.isSuccess && blueprintFavoriteQuery.data);

	const isSuccess = userFavoriteQuery.isSuccess && blueprintFavoriteQuery.isSuccess;

	const reconcileMutation: UseMutationResult<ReconcileResult | null, Error, void> = useMutation({
		mutationFn: async () => {
			if (!userId || !blueprintId) return null;
			if (!isSuccess) return null;

			await reconcileFavorites(
				userId,
				blueprintId,
				userFavoriteQuery.data ?? false,
				blueprintFavoriteQuery.data ?? false,
			);

			return {
				userId,
				blueprintId,
				isFavorite,
			};
		},
		onSuccess: (result) => {
			if (!result) return;

			queryClient.setQueryData(
				['users', 'userId', userId, 'favorites', 'blueprintId', blueprintId],
				result.isFavorite,
			);

			queryClient.setQueryData(
				['blueprints', 'blueprintId', blueprintId, 'favorites', 'userId', userId],
				result.isFavorite,
			);
		},
	});

	// Extract the necessary values to avoid object dependency issues
	const {mutate, isPending} = reconcileMutation;

	React.useEffect(() => {
		if (isSuccess && !isPending) {
			const userHasFavorite = userFavoriteQuery.data ?? false;
			const blueprintHasFavorite = blueprintFavoriteQuery.data ?? false;

			if (userHasFavorite !== blueprintHasFavorite) {
				mutate();
			}
		}
	}, [isSuccess, mutate, isPending, userFavoriteQuery.data, blueprintFavoriteQuery.data]);

	return userFavoriteQuery;
};
