import axios               from 'axios';
import React, {useContext} from 'react';
import {useQuery}          from 'react-query';
import UserContext         from '../context/userContext';

import getHeaders from '../helpers/getHeaders';

function useAuthored()
{
	const {idToken}    = useContext(UserContext);
	const queryEnabled = idToken !== undefined;
	const queryKey     = [idToken, 'authored'];

	return useQuery(
		queryKey,
		() => getAuthored(idToken),
		{
			enabled: queryEnabled,
		},
	);
}

function getAuthored(idToken)
{
	const headers = getHeaders(idToken);
	return axios.get(`${process.env.REACT_APP_REST_URL}/api/my/blueprints/`, headers)
		.then(response => new Set(response.data));
}

export default useAuthored;
