import axios from 'axios';
import {useQuery} from '@tanstack/react-query';

async function fetchDisplayName(userId: string) {
	const url: string = `${process.env.REACT_APP_REST_URL}/api/user/${userId}/displayName/`;
	const result = await axios.get(url);
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
