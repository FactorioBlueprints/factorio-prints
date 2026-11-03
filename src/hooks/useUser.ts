import {useQuery} from "@tanstack/react-query";
import
{
	fetchUserBlueprints,
	fetchUserCollection,
	fetchUserDisplayName,
	fetchUserFavorites,
	fetchUserNeedsDisplayName,
} from "../api/firebase";

export const userDisplayNameQueryKey = (userId: string | undefined) =>
	["users", "userId", userId, "displayName"] as const;

export const useUserDisplayName = (userId: string | undefined) =>
{
	return useQuery<string | null>(
		{
			queryKey: userDisplayNameQueryKey(userId),
			queryFn: () => fetchUserDisplayName(userId!),
			enabled: !!userId,
			// 24 hours
			staleTime: 24 * 60 * 60 * 1000,
			// 7 days
			gcTime: 7 * 24 * 60 * 60 * 1000,
		},
	);
};

export const userNeedsDisplayNameQueryKey = (userId: string | undefined) =>
	["users", "userId", userId, "needsDisplayName"] as const;

// True for new accounts that still have the neutral default name and haven't chosen one
export const useUserNeedsDisplayName = (userId: string | undefined) =>
{
	return useQuery<boolean>(
		{
			queryKey: userNeedsDisplayNameQueryKey(userId),
			queryFn: () => fetchUserNeedsDisplayName(userId!),
			enabled: !!userId,
			staleTime: Number.POSITIVE_INFINITY,
		},
	);
};

export const useUserBlueprints = (userId: string | undefined) =>
{
	return useQuery<Record<string, boolean>>(
		{
			queryKey: ["users", "userId", userId, "blueprints"],
			queryFn: () => fetchUserBlueprints(userId!),
			enabled: !!userId,
			placeholderData: {},
			staleTime: 24 * 60 * 60 * 1000,
			gcTime: 24 * 60 * 60 * 1000,
		},
	);
};

export const useUserFavorites = (userId: string | undefined) =>
{
	return useQuery<Record<string, boolean>>(
		{
			queryKey: ["users", "userId", userId, "favorites"],
			queryFn: () => fetchUserFavorites(userId!),
			enabled: !!userId,
			placeholderData: {},
			staleTime: 24 * 60 * 60 * 1000,
			gcTime: 24 * 60 * 60 * 1000,
		},
	);
};

export const useUserCollection = (userId: string | undefined) =>
{
	return useQuery<Record<string, boolean>>(
		{
			queryKey: ["users", "userId", userId, "collection"],
			queryFn: () => fetchUserCollection(userId!),
			enabled: !!userId,
			placeholderData: {},
			staleTime: 24 * 60 * 60 * 1000,
			gcTime: 24 * 60 * 60 * 1000,
		},
	);
};
