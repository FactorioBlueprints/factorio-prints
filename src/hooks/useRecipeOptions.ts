import {useQuery} from '@tanstack/react-query';

import {fetchRecipes} from '../api/rest/client';

export const useRecipeOptions = () => {
	return useQuery<string[]>({
		queryKey: ['restRecipes'],
		queryFn: fetchRecipes,
		staleTime: 1000 * 60 * 60,
		placeholderData: [],
	});
};
