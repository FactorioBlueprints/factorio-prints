import {useQuery} from '@tanstack/react-query';
import apiClient from '../api/apiClient';

const useRecipeOptions = () => {
	function fetchRecipeValues() {
		return apiClient.get('/api/recipes/');
	}

	return useQuery({queryKey: ['recipes'], queryFn: fetchRecipeValues});
};

export default useRecipeOptions;
