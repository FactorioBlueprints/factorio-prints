import {useQuery} from '@tanstack/react-query';
import apiClient from '../api/apiClient';

const useEntityOptions = () => {
	function fetchEntityValues() {
		return apiClient.get('/api/entities/');
	}

	return useQuery({queryKey: ['entities'], queryFn: fetchEntityValues});
};

export default useEntityOptions;
