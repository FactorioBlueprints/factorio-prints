import {useQuery} from '@tanstack/react-query';

import {fetchEntities} from '../api/rest/client';

export const useEntityOptions = () => {
	return useQuery<string[]>({
		queryKey: ['restEntities'],
		queryFn: fetchEntities,
		staleTime: 1000 * 60 * 60,
		placeholderData: [],
	});
};
