import axios      from 'axios';
import {useQuery} from 'react-query';

const useEntityOptions = () =>
{
	function fetchEntityValues()
	{
		return axios.get(`${process.env.REACT_APP_REST_URL}/api/entities/`);
	}

	return useQuery(['entities'], fetchEntityValues);
};

export default useEntityOptions;
