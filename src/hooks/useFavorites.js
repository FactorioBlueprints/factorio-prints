import axios        from 'axios';
import {useContext} from 'react';
import {useQuery}   from 'react-query';
import UserContext  from '../context/userContext';

import getHeaders from '../helpers/getHeaders';

function useFavorites()
{
	const user         = useContext(UserContext);
	const queryEnabled = user !== undefined && user !== null;
	const email        = queryEnabled ? user.email : undefined;
	const queryKey     = [email, 'favorites'];

	return useQuery(
		queryKey,
		() => getFavorites(user),
		{
			enabled  : queryEnabled,
			staleTime: 1000 * 60 * 60, // 60 minutes
		},
	);
}

async function getFavorites(user)
{
	const idToken = user === undefined ? undefined : await user.getIdToken();

	const headers  = getHeaders(idToken);
	const response = await axios.get(`${process.env.REACT_APP_REST_URL}/api/my/favorites/`, headers);
	return new Set(response.data);
}

export default useFavorites;
