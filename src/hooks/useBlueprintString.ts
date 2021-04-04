import axios from 'axios';
import {useQuery} from 'react-query';

function useBlueprintString(blueprintKey: string)
{
	const queryKey: string[] = ['blueprintString', blueprintKey];
	const url: string        = `${process.env.REACT_APP_REST_URL}/api/blueprintString/${blueprintKey}`;
	return useQuery(queryKey, () => axios.get(url));
}

export default useBlueprintString;
