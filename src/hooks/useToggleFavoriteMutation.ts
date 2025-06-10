import {useMutation, useQueryClient}          from '@tanstack/react-query';
import {getDatabase, ref, update as dbUpdate} from 'firebase/database';
import {app}                                  from '../base';

interface ToggleFavoriteMutationParams {
	blueprintId: string;
	userId: string;
	isFavorite: boolean;
	numberOfFavorites?: number | null;
}

interface ToggleFavoriteMutationResult {
	blueprintId: string;
	userId: string;
	newIsFavorite: boolean;
	newFavoriteCount: number;
}

export const useToggleFavoriteMutation = () =>
{
	const queryClient = useQueryClient();

	return useMutation<ToggleFavoriteMutationResult, Error, ToggleFavoriteMutationParams>({
		mutationFn: async ({ blueprintId, userId, isFavorite, numberOfFavorites }): Promise<ToggleFavoriteMutationResult> =>
		{
			// Use the provided numberOfFavorites from raw data
			const currentFavoriteCount = numberOfFavorites || 0;

			const newIsFavorite = !isFavorite;
			const newFavoriteCount = Math.max(0, currentFavoriteCount + (newIsFavorite ? 1 : -1));

			const updates: Record<string, number | boolean | null> = {
				[`/blueprints/${blueprintId}/numberOfFavorites`]        : newFavoriteCount,
				[`/blueprints/${blueprintId}/favorites/${userId}`]      : newIsFavorite ? true : null,
				[`/blueprintSummaries/${blueprintId}/numberOfFavorites`]: newFavoriteCount,
				[`/users/${userId}/favorites/${blueprintId}`]           : newIsFavorite ? true : null,
			};

			await dbUpdate(ref(getDatabase(app)), updates);

			return {
				blueprintId,
				userId,
				newIsFavorite,
				newFavoriteCount,
			};
		},
		onSuccess: ({ blueprintId, userId, newIsFavorite, newFavoriteCount }: ToggleFavoriteMutationResult) =>
		{
			queryClient.setQueryData(
				['blueprints', 'blueprintId', blueprintId],
				(oldData: unknown) =>
				{
					if (!oldData) return oldData;

					const blueprint = oldData as Record<string, unknown>;
					const existingFavorites = (blueprint.favorites as Record<string, boolean>) || {};

					return {
						...blueprint,
						numberOfFavorites: newFavoriteCount,
						favorites        : {
							...existingFavorites,
							[userId]: newIsFavorite ? true : undefined,
						},
					};
				},
			);

			queryClient.setQueryData(
				['blueprintSummaries', 'blueprintId', blueprintId],
				(oldData: unknown) =>
				{
					if (!oldData) return oldData;

					const summary = oldData as Record<string, unknown>;

					return {
						...summary,
						numberOfFavorites: newFavoriteCount,
					};
				},
			);

			queryClient.setQueryData(
				['users', 'userId', userId, 'favorites'],
				(oldData: unknown) =>
				{
					if (!oldData) return oldData;

					const favorites = oldData as Record<string, boolean>;

					return {
						...favorites,
						[blueprintId]: newIsFavorite ? true : undefined,
					};
				},
			);

			queryClient.setQueryData(
				['users', 'userId', userId, 'favorites', 'blueprintId', blueprintId],
				newIsFavorite,
			);

			queryClient.setQueryData(
				['blueprints', 'blueprintId', blueprintId, 'favorites', 'userId', userId],
				newIsFavorite,
			);
		},
	});
};

export default useToggleFavoriteMutation;
