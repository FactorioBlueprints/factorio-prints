import {useQuery} from '@tanstack/react-query';
import axios from 'axios';

function useBlueprint(blueprintKey: string | undefined) {
	const queryKey = ['blueprintDetails', blueprintKey];
	const url: string = `${process.env.REACT_APP_REST_URL}/api/blueprintDetails/${blueprintKey}`;
	const options = {
		enabled: blueprintKey !== undefined,
	};
	return useQuery({queryKey, queryFn: () => axios.get(url), ...options});
}

export default useBlueprint;
