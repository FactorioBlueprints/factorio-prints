import {useMutation, useQueryClient}          from '@tanstack/react-query';
import {getDatabase, ref, update as dbUpdate} from 'firebase/database';
import {app}                                  from '../base';

export const useToggleFavoriteMutation = () =>
{
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ blueprintId, userId, isFavorite, numberOfFavorites }) =>
		{
			// Use the provided numberOfFavorites from raw data
			const currentFavoriteCount = numberOfFavorites || 0;

			const newIsFavorite = !isFavorite;
			const newFavoriteCount = Math.max(0, currentFavoriteCount + (newIsFavorite ? 1 : -1));

			const updates = {
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
		onSuccess: ({ blueprintId, userId, newIsFavorite, newFavoriteCount }) =>
		{
			queryClient.setQueryData(
				['blueprints', 'blueprintId', blueprintId],
				(oldData) =>
				{
					if (!oldData) return oldData;

					return {
						...oldData,
						numberOfFavorites: newFavoriteCount,
						favorites        : {
							...oldData.favorites,
							[userId]: newIsFavorite ? true : undefined,
						},
					};
				},
			);

			queryClient.setQueryData(
				['blueprintSummaries', 'blueprintId', blueprintId],
				(oldData) =>
				{
					if (!oldData) return oldData;

					return {
						...oldData,
						numberOfFavorites: newFavoriteCount,
					};
				},
			);

			queryClient.setQueryData(
				['users', 'userId', userId, 'favorites'],
				(oldData) =>
				{
					if (!oldData) return oldData;

					return {
						...oldData,
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
