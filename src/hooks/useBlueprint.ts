import axios      from 'axios';
import {useQuery} from '@tanstack/react-query';

function useBlueprint(blueprintKey: string | undefined)
{
	const queryKey    = ['blueprintDetails', blueprintKey];
	const url: string = `${process.env.REACT_APP_REST_URL}/api/blueprintDetails/${blueprintKey}`;
	const options     = {
		enabled: blueprintKey !== undefined,
	};
	return useQuery(queryKey, () => axios.get(url), options);
}

export default useBlueprint;
