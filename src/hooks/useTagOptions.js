import axios      from 'axios';
import {useQuery} from '@tanstack/react-query';

export type TagOption = { label: string; value: string };

const useTagOptions = (): { tagValuesSet: Set<string>; tagOptions: TagOption[]; tagValues: string[]; tagOptionsSet: Set<TagOption> } =>
{
	async function fetchTagValues(): Promise<string[]>
	{
		const tags = await axios.get(`${process.env.REACT_APP_REST_URL}/api/tags/`);
		return tags.data.map((tag: { category: any; name: any; }) => `${tag.category}/${tag.name}`);
	}

	const result: any                   = useQuery(['tags'], fetchTagValues, {placeholderData: []});
	const tagValues: string[]           = result.data || [];
	const tagValuesSet: Set<string>     = new Set(tagValues);
	const tagOptions: TagOption[]       = tagValues.map((value) => ({label: value, value}));
	const tagOptionsSet: Set<TagOption> = new Set(tagOptions);
	return {tagValues, tagValuesSet, tagOptions, tagOptionsSet};
};

export default useTagOptions;
