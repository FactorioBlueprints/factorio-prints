import axios      from 'axios';
import {useQuery} from '@tanstack/react-query';

const useSimpleTagOptions = () =>
{
	async function fetchTagValues()
	{
		const {data} = await axios.get(`${process.env.REACT_APP_REST_URL}/api/tags/`);
		return data.map((tag) => `${tag.category}/${tag.name}`);
	}

	return useQuery({queryKey: ['tags'], queryFn: fetchTagValues});
};

export default useSimpleTagOptions;
