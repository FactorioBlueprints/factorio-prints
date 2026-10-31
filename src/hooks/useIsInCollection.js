import {useQuery} from '@tanstack/react-query';
import axios from 'axios';
import {useContext} from 'react';
import UserContext from '../context/userContext';

import getHeaders from '../helpers/getHeaders';

function useIsInCollection(blueprintKey) {
	const {user} = useContext(UserContext);
	const queryEnabled = user !== undefined && user !== null;
	const uid = queryEnabled ? user.uid : undefined;
	const queryKey = ['api/my/collection/', blueprintKey, uid];

	return useQuery({
		queryKey,
		queryFn: () => getIsInCollection(blueprintKey, user),
		enabled: queryEnabled,
		staleTime: 1000 * 60 * 60, // 60 minutes
	});
}

async function getIsInCollection(blueprintKey, user) {
	const idToken = await user.getIdToken();

	const headers = getHeaders(idToken);
	const response = await axios.get(`${process.env.REACT_APP_REST_URL}/api/my/collection/${blueprintKey}`, headers);
	return response.data;
}

export default useIsInCollection;
