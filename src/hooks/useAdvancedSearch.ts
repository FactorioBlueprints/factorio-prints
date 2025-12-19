import {useQuery} from '@tanstack/react-query';
import {useStore} from '@tanstack/react-store';

import {searchBlueprintSummaries} from '../api/rest/client';
import type {RestPaginatedResponse} from '../api/rest/types';
import {advancedSearchStore} from '../store/advancedSearchStore';

export const useAdvancedSearch = () => {
	const searchState = useStore(advancedSearchStore);

	const {text, orderBy, tag, entity, recipe, gameVersionLong, blueprintType, mod, page, searchTrigger} = searchState;

	return useQuery<RestPaginatedResponse>({
		queryKey: [
			'blueprintSearch',
			{text, orderBy, tag, entity, recipe, gameVersionLong, blueprintType, mod, page, searchTrigger},
		],
		queryFn: () =>
			searchBlueprintSummaries({
				page,
				pageSize: 12,
				text: text || undefined,
				orderBy,
				tag: tag || undefined,
				entity: entity || undefined,
				recipe: recipe || undefined,
				gameVersionLong: gameVersionLong || undefined,
				blueprintType: blueprintType || undefined,
				mod: mod || undefined,
			}),
		enabled: searchTrigger > 0,
		placeholderData: (previousData) => previousData,
	});
};
