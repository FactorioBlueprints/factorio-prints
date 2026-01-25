import {useQuery} from '@tanstack/react-query';
import apiClient from '../api/apiClient';

function useBlueprintStringSha(blueprintStringSha) {
	const queryKey = ['blueprintStringSha', blueprintStringSha];
	const url = `/api/blueprintStringBySha/${blueprintStringSha}`;
	const options = {
		enabled: blueprintStringSha !== undefined,
		gcTime: 'Infinity',
		staleTime: 'Infinity',
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	};
	return useQuery({queryKey, queryFn: () => apiClient.get(url), ...options});
}

export default useBlueprintStringSha;
