import axios               from 'axios';
import React, {useContext} from 'react';
import {useQuery}          from 'react-query';
import UserContext         from '../context/userContext';

import getHeaders from '../helpers/getHeaders';

function useIsFavorite(blueprintKey)
{
	const {idToken}    = useContext(UserContext);
	const queryEnabled = idToken !== undefined;
	const queryKey     = [idToken, 'isFavorite', blueprintKey];

	return useQuery(
		queryKey,
		() => getIsFavorite(blueprintKey, idToken),
		{
			enabled: queryEnabled,
		},
	);
}

function getIsFavorite(blueprintKey, idToken)
{
	const headers = getHeaders(idToken);
	return axios.get(`${process.env.REACT_APP_REST_URL}/api/my/favorite/${blueprintKey}`, headers);
}

export default useIsFavorite;
