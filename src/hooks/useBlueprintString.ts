import axios      from 'axios';
import {useQuery} from 'react-query';

function useBlueprintString(blueprintKey: string | undefined)
{
	const queryKey    = ['blueprintString', blueprintKey];
	const url: string = `${process.env.REACT_APP_REST_URL}/api/blueprintString/${blueprintKey}`;
	const options     = {
		enabled: blueprintKey !== undefined,
	};
	return useQuery(queryKey, () => axios.get(url), options);
}

export default useBlueprintString;
