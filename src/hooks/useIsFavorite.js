import axios        from 'axios';
import {useContext} from 'react';
import {useQuery}   from 'react-query';
import UserContext  from '../context/userContext';

import getHeaders from '../helpers/getHeaders';

function useIsFavorite(blueprintKey)
{
	const user         = useContext(UserContext);
	const queryEnabled = user !== undefined;
	const email        = user === undefined ? undefined : user.email;
	const queryKey     = [email, 'isFavorite', blueprintKey];

	return useQuery(
		queryKey,
		() => getIsFavorite(blueprintKey, user),
		{
			enabled  : queryEnabled,
			staleTime: 1000 * 60 * 60, // 60 minutes
		},
	);
}

async function getIsFavorite(blueprintKey, user)
{
	const idToken = user === undefined ? undefined : await user.getIdToken();

	const headers  = getHeaders(idToken);
	const response = await axios.get(`${process.env.REACT_APP_REST_URL}/api/my/favorite/${blueprintKey}`, headers);
	return response.data;
}

export default useIsFavorite;
