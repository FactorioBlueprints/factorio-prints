import {useQuery} from '@tanstack/react-query';
import apiClient from '../api/apiClient';

function useBlueprint(blueprintKey: string | undefined) {
	const queryKey = ['blueprintDetails', blueprintKey];
	const url = `/api/blueprintDetails/${blueprintKey}`;
	const options = {
		enabled: blueprintKey !== undefined,
	};
	return useQuery({queryKey, queryFn: () => apiClient.get(url), ...options});
}

export default useBlueprint;
