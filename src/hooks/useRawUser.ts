import { useQuery } from '@tanstack/react-query';
import { fetchUser } from '../api/firebase';
import type { RawUser } from '../schemas';

export const useRawUser = (userId: string | null | undefined) =>
{
	return useQuery<RawUser | null>({
		queryKey : ['users', 'userId', userId],
		queryFn  : () => fetchUser(userId!),
		enabled  : !!userId,
		// 24 hours
		staleTime: 24 * 60 * 60 * 1000,
		// 7 days
		gcTime   : 7 * 24 * 60 * 60 * 1000,
	});
};
