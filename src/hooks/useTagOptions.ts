import {useQuery} from '@tanstack/react-query';
import apiClient from '../api/apiClient';

export type TagOption = {label: string; value: string};

const useTagOptions = (): {
	tagValuesSet: Set<string>;
	tagOptions: TagOption[];
	tagValues: string[];
	tagOptionsSet: Set<TagOption>;
} => {
	async function fetchTagValues(): Promise<string[]> {
		const tags = await apiClient.get('/api/tags/');
		return tags.data.map((tag: {category: string; name: string}) => `${tag.category}/${tag.name}`);
	}

	const result = useQuery({queryKey: ['tags'], queryFn: fetchTagValues, placeholderData: []});
	const tagValues: string[] = result.data || [];
	const tagValuesSet: Set<string> = new Set(tagValues);
	const tagOptions: TagOption[] = tagValues.map((value) => ({label: value, value}));
	const tagOptionsSet: Set<TagOption> = new Set(tagOptions);
	return {tagValues, tagValuesSet, tagOptions, tagOptionsSet};
};

export default useTagOptions;
