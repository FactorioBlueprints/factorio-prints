import axios from 'axios';
import {useContext} from 'react';
import {useQuery} from '@tanstack/react-query';
import UserContext from '../context/userContext';

import getHeaders from '../helpers/getHeaders';

function useFavorites() {
	const {user} = useContext(UserContext);
	const queryEnabled = user !== undefined && user !== null;
	const uid = queryEnabled ? user.uid : undefined;
	const queryKey = ['api/my/favorites/', uid];

	return useQuery({
		queryKey,
		queryFn: () => getFavorites(user),
		enabled: queryEnabled,
		staleTime: 1000 * 60 * 60, // 60 minutes
	});
}

async function getFavorites(user) {
	const idToken = user === undefined ? undefined : await user.getIdToken();

	const headers = getHeaders(idToken);
	const response = await axios.get(`${process.env.REACT_APP_REST_URL}/api/my/favorites/`, headers);
	return response.data;
}

export default useFavorites;
