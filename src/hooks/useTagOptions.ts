import axios from 'axios';
import {useQuery} from 'react-query';

const useTagOptions = () =>
{
	const fetchTagValues = async () =>
	{
		const tags = await axios.get(`${process.env.REACT_APP_REST_URL}/api/tags/`);
		return tags.data.map((tag: { category: any; name: any; }) => `${tag.category}/${tag.name}`);
	};

	const result        = useQuery(['tags'], fetchTagValues, {placeholderData: []});
	const tagValues     = result.data;
	const tagValuesSet  = new Set(tagValues);
	const tagOptions    = tagValues?.map(value => ({label: value, value}));
	const tagOptionsSet = new Set(tagOptions);
	return {tagValues, tagValuesSet, tagOptions, tagOptionsSet};
};

export default useTagOptions;
