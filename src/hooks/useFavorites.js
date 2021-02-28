import axios               from 'axios';
import React, {useContext} from 'react';
import {useQuery}          from 'react-query';
import UserContext         from '../context/userContext';

import getHeaders from '../helpers/getHeaders';

function useFavorites()
{
	const {idToken}    = useContext(UserContext);
	const queryEnabled = idToken !== undefined;
	const queryKey     = [idToken, 'favorites'];

	return useQuery(
		queryKey,
		() => getFavorites(idToken),
		{
			enabled: queryEnabled,
			staleTime: 1000 * 60 * 60, // 60 minutes
		},
	);
}

function getFavorites(idToken)
{
	const headers = getHeaders(idToken);
	return axios.get(`${process.env.REACT_APP_REST_URL}/api/my/favorites/`, headers)
		.then(response => new Set(response.data));
}

export default useFavorites;
