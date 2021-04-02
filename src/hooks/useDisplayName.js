import axios      from 'axios';
import {useQuery} from 'react-query';

async function fetchDisplayName(userId)
{
	const url    = `${process.env.REACT_APP_REST_URL}/api/user/${userId}/displayName/`;
	const result = await axios.get(url);
	return result.data;
}

function useDisplayName(userId)
{
	const queryKey = ['user', userId, 'displayName'];

	// 60 minutes
	const staleTime = 1000 * 60 * 60;

	const queryOptions = {
		enabled        : userId !== undefined,
		staleTime,
		placeholderData: {_data: {userId, displayName: ''}},
	};

	return useQuery(
		queryKey,
		() => fetchDisplayName(userId),
		queryOptions,
	);
}

export default useDisplayName;
