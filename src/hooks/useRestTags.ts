import {useQuery} from '@tanstack/react-query';
import {useMemo} from 'react';

import {fetchRestTags} from '../api/rest/client';
import type {RestTag} from '../api/rest/types';

export const useRestTags = () => {
	const query = useQuery<RestTag[]>({
		queryKey: ['restTags'],
		queryFn: fetchRestTags,
		staleTime: 1000 * 60 * 60,
		placeholderData: [],
	});

	const tagStrings = useMemo(() => {
		if (!query.data) {
			return [];
		}
		return query.data.map((tag) => `/${tag.category}/${tag.name}/`);
	}, [query.data]);

	return {
		...query,
		tagStrings,
	};
};
