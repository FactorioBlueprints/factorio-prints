import axios      from 'axios';
import {useQuery} from 'react-query';

const useRecipeOptions = () =>
{
	function fetchRecipeValues()
	{
		return axios.get(`${process.env.REACT_APP_REST_URL}/api/recipes/`);
	}

	return useQuery(['recipes'], fetchRecipeValues);
};

export default useRecipeOptions;
