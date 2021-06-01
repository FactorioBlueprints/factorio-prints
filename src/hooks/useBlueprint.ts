import axios      from 'axios';
import {useQuery} from 'react-query';

function useBlueprint(blueprintKey: string)
{
	const queryKey: string[] = ['blueprintDetails', blueprintKey];
	const url: string        = `${process.env.REACT_APP_REST_URL}/api/blueprintDetails/${blueprintKey}`;
	return useQuery(queryKey, () => axios.get(url));
}

export default useBlueprint;
