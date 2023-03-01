import axios      from 'axios';
import {useQuery} from 'react-query';

const useSimpleTagOptions = () =>
{
	async function fetchTagValues()
	{
		const {data} = await axios.get(`${process.env.REACT_APP_REST_URL}/api/tags/`);
		return data.map((tag) => `${tag.category}/${tag.name}`);
	}

	return useQuery(['tags'], fetchTagValues);
};

export default useSimpleTagOptions;
