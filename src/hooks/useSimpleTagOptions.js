import {useQuery} from '@tanstack/react-query';
import apiClient from '../api/apiClient';

const useSimpleTagOptions = () => {
	async function fetchTagValues() {
		const {data} = await apiClient.get('/api/tags/');
		return data.map((tag) => `${tag.category}/${tag.name}`);
	}

	return useQuery({queryKey: ['tags'], queryFn: fetchTagValues});
};

export default useSimpleTagOptions;
