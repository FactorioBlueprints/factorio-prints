import {useQuery} from '@tanstack/react-query';
import {useMemo} from 'react';
import {z} from 'zod';
import {fetchTags} from '../api/firebase';

const tagCategorySchema = z.record(z.string(), z.array(z.string()));

type TagHierarchy = z.infer<typeof tagCategorySchema>;

const buildTagOptions = (tagHierarchy: TagHierarchy): string[] => {
	const result: string[] = [];

	try {
		tagCategorySchema.parse(tagHierarchy);

		Object.entries(tagHierarchy).forEach(([category, tags]) => {
			tags.forEach((tag) => {
				result.push(`/${category}/${tag}/`);
			});
		});
	} catch (error) {
		console.error('Tag hierarchy format error on tagHierarchy:', {tagHierarchy, error});
		throw new Error('Tag hierarchy has unexpected format');
	}

	return result;
};

export const useTags = () => {
	const tagsQuery = useQuery<TagHierarchy>({
		queryKey: ['tags'],
		queryFn: fetchTags,
		placeholderData: {},
	});

	const {data} = tagsQuery;

	const processedData = useMemo(() => {
		if (!data) {
			return {
				tagHierarchy: {},
				tags: [],
			};
		}
		const tags = buildTagOptions(data);
		return {
			tagHierarchy: data,
			tags,
		};
	}, [data]);

	return {
		...tagsQuery,
		data: processedData,
	};
};
