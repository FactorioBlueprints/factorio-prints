import axios      from 'axios';
import {useQuery} from 'react-query';

function useBlueprintStringSha(blueprintStringSha)
{
	const queryKey = ['blueprintStringSha', blueprintStringSha];
	const url      = `${process.env.REACT_APP_REST_URL}/api/blueprintStringBySha/${blueprintStringSha}`;
	const options  = {
		enabled  : blueprintStringSha !== undefined,
		cacheTime: 'Infinity',
		staleTime: 'Infinity',
	};
	return useQuery(queryKey, () => axios.get(url), options);
}

export default useBlueprintStringSha;
