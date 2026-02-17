import {useMutation, useQueryClient} from '@tanstack/react-query';
import {update as dbUpdate, ref} from 'firebase/database';
import {validateRawUserCollection} from '../schemas';
import {getFirebaseDatabase} from '../utils/firebaseDatabase';

interface ToggleCollectionMutationParams {
	blueprintId: string;
	userId: string;
	isInCollection: boolean;
}

interface ToggleCollectionMutationResult {
	blueprintId: string;
	userId: string;
	newIsInCollection: boolean;
}

export const useToggleCollectionMutation = () => {
	const queryClient = useQueryClient();

	return useMutation<ToggleCollectionMutationResult, Error, ToggleCollectionMutationParams>({
		mutationFn: async ({blueprintId, userId, isInCollection}): Promise<ToggleCollectionMutationResult> => {
			const newIsInCollection = !isInCollection;

			const updates: Record<string, boolean | null> = {
				[`/users/${userId}/collection/${blueprintId}`]: newIsInCollection ? true : null,
			};

			await dbUpdate(ref(getFirebaseDatabase()), updates);

			return {
				blueprintId,
				userId,
				newIsInCollection,
			};
		},
		onSuccess: ({blueprintId, userId, newIsInCollection}: ToggleCollectionMutationResult) => {
			queryClient.setQueryData(['users', 'userId', userId, 'collection'], (oldData: unknown) => {
				const cleanedData =
					typeof oldData === 'object' && oldData !== null
						? Object.fromEntries(
								Object.entries(oldData as Record<string, unknown>).filter(
									([, value]) => typeof value === 'boolean',
								),
							)
						: {};

				const collection = validateRawUserCollection(cleanedData);
				const updatedCollection = {...collection};

				if (newIsInCollection) {
					updatedCollection[blueprintId] = true;
				} else {
					delete updatedCollection[blueprintId];
				}

				return updatedCollection;
			});

			queryClient.setQueryData(
				['users', 'userId', userId, 'collection', 'blueprintId', blueprintId],
				newIsInCollection,
			);
		},
	});
};

export default useToggleCollectionMutation;
