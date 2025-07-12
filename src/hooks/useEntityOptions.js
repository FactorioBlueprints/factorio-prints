import axios from 'axios';
import {useQuery} from '@tanstack/react-query';

const useEntityOptions = () => {
	function fetchEntityValues() {
		return axios.get(`${process.env.REACT_APP_REST_URL}/api/entities/`);
	}

	return useQuery({queryKey: ['entities'], queryFn: fetchEntityValues});
};

export default useEntityOptions;
