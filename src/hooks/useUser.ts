import {useQuery} from '@tanstack/react-query';
import {fetchUserBlueprints, fetchUserDisplayName, fetchUserFavorites} from '../api/firebase';

export const useUserDisplayName = (userId: string | undefined) => {
	return useQuery<string | null>({
		queryKey: ['users', 'userId', userId, 'displayName'],
		queryFn: () => fetchUserDisplayName(userId!),
		enabled: !!userId,
		// 24 hours
		staleTime: 24 * 60 * 60 * 1000,
		// 7 days
		gcTime: 7 * 24 * 60 * 60 * 1000,
	});
};

export const useUserBlueprints = (userId: string | undefined) => {
	return useQuery<Record<string, boolean>>({
		queryKey: ['users', 'userId', userId, 'blueprints'],
		queryFn: () => fetchUserBlueprints(userId!),
		enabled: !!userId,
		placeholderData: {},
		staleTime: 24 * 60 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});
};

export const useUserFavorites = (userId: string | undefined) => {
	return useQuery<Record<string, boolean>>({
		queryKey: ['users', 'userId', userId, 'favorites'],
		queryFn: () => fetchUserFavorites(userId!),
		enabled: !!userId,
		placeholderData: {},
		staleTime: 24 * 60 * 60 * 1000,
		gcTime: 24 * 60 * 60 * 1000,
	});
};
