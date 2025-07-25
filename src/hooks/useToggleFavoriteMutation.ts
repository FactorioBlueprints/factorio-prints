import {useMutation, useQueryClient} from '@tanstack/react-query';
import {update as dbUpdate, getDatabase, ref} from 'firebase/database';
import {app} from '../base';
import {validateRawBlueprint, validateRawBlueprintSummary, validateRawUserFavorites} from '../schemas';

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

export const useToggleFavoriteMutation = () => {
	const queryClient = useQueryClient();

	return useMutation<ToggleFavoriteMutationResult, Error, ToggleFavoriteMutationParams>({
		mutationFn: async ({
			blueprintId,
			userId,
			isFavorite,
			numberOfFavorites,
		}): Promise<ToggleFavoriteMutationResult> => {
			// Use the provided numberOfFavorites from raw data
			const currentFavoriteCount = numberOfFavorites || 0;

			const newIsFavorite = !isFavorite;
			const newFavoriteCount = Math.max(0, currentFavoriteCount + (newIsFavorite ? 1 : -1));

			const updates: Record<string, number | boolean | null> = {
				[`/blueprints/${blueprintId}/numberOfFavorites`]: newFavoriteCount,
				[`/blueprints/${blueprintId}/favorites/${userId}`]: newIsFavorite ? true : null,
				[`/blueprintSummaries/${blueprintId}/numberOfFavorites`]: newFavoriteCount,
				[`/users/${userId}/favorites/${blueprintId}`]: newIsFavorite ? true : null,
			};

			await dbUpdate(ref(getDatabase(app)), updates);

			return {
				blueprintId,
				userId,
				newIsFavorite,
				newFavoriteCount,
			};
		},
		onSuccess: ({blueprintId, userId, newIsFavorite, newFavoriteCount}: ToggleFavoriteMutationResult) => {
			queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], (oldData: unknown) => {
				if (!oldData) return oldData;

				const blueprint = validateRawBlueprint(oldData);
				const existingFavorites = blueprint.favorites || {};

				// Clean the existing favorites to ensure it only contains boolean values
				const cleanedFavorites = Object.fromEntries(
					Object.entries(existingFavorites).filter(([, value]) => typeof value === 'boolean'),
				);

				const updatedFavorites = {...cleanedFavorites};
				if (newIsFavorite) {
					updatedFavorites[userId] = true;
				} else {
					delete updatedFavorites[userId];
				}

				return {
					...blueprint,
					numberOfFavorites: newFavoriteCount,
					favorites: updatedFavorites,
				};
			});

			queryClient.setQueryData(['blueprintSummaries', 'blueprintId', blueprintId], (oldData: unknown) => {
				if (!oldData) return oldData;

				const summary = validateRawBlueprintSummary(oldData);

				return {
					...summary,
					numberOfFavorites: newFavoriteCount,
				};
			});

			queryClient.setQueryData(['users', 'userId', userId, 'favorites'], (oldData: unknown) => {
				if (!oldData) return oldData;

				// Clean the existing data to ensure it only contains boolean values
				const cleanedData =
					typeof oldData === 'object' && oldData !== null
						? Object.fromEntries(
								Object.entries(oldData as Record<string, unknown>).filter(
									([, value]) => typeof value === 'boolean',
								),
							)
						: {};

				const favorites = validateRawUserFavorites(cleanedData);

				const updatedUserFavorites = {...favorites};
				if (newIsFavorite) {
					updatedUserFavorites[blueprintId] = true;
				} else {
					delete updatedUserFavorites[blueprintId];
				}

				return updatedUserFavorites;
			});

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
