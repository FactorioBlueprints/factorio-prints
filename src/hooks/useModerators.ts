import { useQuery } from '@tanstack/react-query';
import { fetchModerator } from '../api/firebase';

export const useIsModerator = (userId: string | null | undefined) =>
{
	const moderatorQuery = useQuery({
		queryKey : ['moderators', 'userId', userId],
		queryFn  : () => fetchModerator(userId!),
		enabled  : Boolean(userId),
		staleTime: 24 * 60 * 60 * 1000,
	});

	return moderatorQuery;
};
