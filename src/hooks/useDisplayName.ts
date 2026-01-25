import {useQuery} from '@tanstack/react-query';
import apiClient from '../api/apiClient';

async function fetchDisplayName(userId: string) {
	const url = `/api/user/${userId}/displayName/`;
	const result = await apiClient.get(url);
	return result.data;
}

function useDisplayName(userId: string) {
	const queryKey: string[] = ['user', userId, 'displayName'];

	// 60 minutes
	const staleTime: number = 1000 * 60 * 60;

	const queryOptions = {
		enabled: userId !== undefined,
		staleTime,
		placeholderData: {_data: {userId, displayName: ''}},
	};

	return useQuery({
		queryKey,
		queryFn: () => fetchDisplayName(userId),
		...queryOptions,
	});
}

export default useDisplayName;
