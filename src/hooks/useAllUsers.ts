import { useQuery } from '@tanstack/react-query';
import { fetchAllUsers } from '../api/firebase';

/**
 * Hook to fetch all users
 * Only enabled for admin/moderator users
 */
export const useAllUsers = (isAdmin = false) =>
{
	return useQuery({
		queryKey : ['users', 'all'],
		queryFn  : fetchAllUsers,
		enabled  : isAdmin,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

export default useAllUsers;
