import axios      from 'axios';
import {useQuery} from 'react-query';

const useBlueprintString = function (blueprintKey)
{
	const queryKey = ['blueprintString', blueprintKey];

	const result = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintString/${blueprintKey}`),
	);
	return result;
};

export default useBlueprintString;
