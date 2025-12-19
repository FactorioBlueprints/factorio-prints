import {useQuery} from '@tanstack/react-query';

import {fetchDuplicates} from '../api/rest/client';
import type {RestBlueprintSummary} from '../api/rest/types';

export const useDuplicates = () => {
	return useQuery<RestBlueprintSummary[]>({
		queryKey: ['duplicateBlueprints'],
		queryFn: fetchDuplicates,
		placeholderData: [],
	});
};
