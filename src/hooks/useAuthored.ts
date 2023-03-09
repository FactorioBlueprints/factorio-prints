import axios        from 'axios';
import {useContext} from 'react';
import {useQuery}   from '@tanstack/react-query';
import UserContext  from '../context/userContext';

import getHeaders from '../helpers/getHeaders';

function useAuthored()
{
	const user         = useContext(UserContext);
	const queryEnabled = user !== undefined && user !== null && user.uid !== undefined;
	const uid          = user?.uid;
	const queryKey     = ['api/my/blueprints/', uid];

	return useQuery(
		queryKey,
		() => getAuthored(user),
		{
			enabled  : queryEnabled,
			staleTime: 1000 * 60 * 60, // 60 minutes
		},
	);
}

async function getAuthored(user: any)
{
	const idToken = await user?.getIdToken();

	const headers  = getHeaders(idToken);
	const response = await axios.get(`${process.env.REACT_APP_REST_URL}/api/my/blueprints/`, headers);
	return response.data;
}

export default useAuthored;
