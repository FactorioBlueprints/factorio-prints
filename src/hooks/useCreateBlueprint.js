import {useMutation, useQueryClient}                                 from '@tanstack/react-query';
import {useNavigate}                                                 from '@tanstack/react-router';
import {getDatabase, push, ref, serverTimestamp, update as dbUpdate} from 'firebase/database';
import {app}                                                         from '../base';
import flatMap                                                       from 'lodash/flatMap';
import {validateRawBlueprintSummary, validateRawPaginatedBlueprintSummaries} from '../schemas';

export const useCreateBlueprint = () =>
{
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation({
		mutationFn: async ({ formData, user }) =>
		{
			// Process image URL to extract imgur ID
			const imageUrl = formData.imageUrl;

			const regexPatterns = {
				imgurUrl1: /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/,
				imgurUrl2: /^https:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)\.[a-zA-Z0-9]{3,4}$/,
			};

			const matches = Object.values(regexPatterns)
				.map(pattern => imageUrl.match(pattern))
				.filter(Boolean);

			if (matches.length <= 0)
			{
				throw new Error('Invalid image URL format');
			}

			const match = matches[0];
			const imgurId = match[1];
			const image = {
				id  : imgurId,
				type: 'image/png',
			};

			// Build raw blueprint data matching Firebase structure
			const blueprintData = {
				title              : formData.title,
				blueprintString    : formData.blueprintString,
				descriptionMarkdown: formData.descriptionMarkdown,
				tags               : formData.tags || [],
				author             : {
					userId     : user.uid,
					displayName: user.displayName || null,
				},
				authorId         : user.uid,
				createdDate      : serverTimestamp(),
				lastUpdatedDate  : serverTimestamp(),
				favorites        : {},
				numberOfFavorites: 0,
				image,
			};

			const blueprintSummary = {
				imgurId          : image.id,
				imgurType        : image.type,
				title            : formData.title,
				numberOfFavorites: 0,
				lastUpdatedDate  : serverTimestamp(),
			};

			const blueprintsRef = ref(getDatabase(app), '/blueprints');
			const newBlueprintRef = push(blueprintsRef, blueprintData);
			const newBlueprintKey = newBlueprintRef.key;

			const updates = {};

			updates[`/users/${user.uid}/blueprints/${newBlueprintKey}`] = true;
			updates[`/blueprintSummaries/${newBlueprintKey}`] = blueprintSummary;
			updates[`/blueprintsPrivate/${newBlueprintKey}/imageUrl`] = imageUrl;

			(formData.tags || []).forEach((tag) =>
			{
				updates[`/byTag/${tag}/${newBlueprintKey}`] = true;
			});

			await dbUpdate(ref(getDatabase(app)), updates);

			return {
				blueprintId: newBlueprintKey,
				authorId   : user.uid,
			};
		},
		onSuccess: ({blueprintId, authorId}, {formData, user}) =>
		{
			const now = new Date();
			const unixTimestamp = now.getTime();

			// Extract imgur ID from the image URL for the summary
			const regexPatterns = {
				imgurUrl1: /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/,
				imgurUrl2: /^https:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)\.[a-zA-Z0-9]{3,4}$/,
			};

			const matches = Object.values(regexPatterns)
				.map(pattern => formData.imageUrl.match(pattern))
				.filter(Boolean);

			const imgurId = matches.length > 0 ? matches[0][1] : '';

			const lastUpdatedDateKey  = ['blueprintSummaries', 'orderByField', 'lastUpdatedDate'];
			const lastUpdatedDateData = queryClient.getQueryData(lastUpdatedDateKey);

			if (lastUpdatedDateData?.pages && Array.isArray(lastUpdatedDateData.pages))
			{
				try
				{
					const summaryData = {
						key              : blueprintId,
						title            : formData.title,
						imgurId          : imgurId,
						imgurType        : 'image/png',
						authorId         : user.uid,
						numberOfFavorites: 0,
						lastUpdatedDate  : unixTimestamp,
					};

					const newSummary = validateRawBlueprintSummary(summaryData);
					const allBlueprints = flatMap(lastUpdatedDateData.pages, page =>
						page?.data ? Object.entries(page.data).map(([key, summary]) => ({ ...summary, key })) : [],
					);

					const updatedBlueprints = [
						newSummary,
						...allBlueprints.filter(item => item.key !== blueprintId),
					];

					const updatedPages = lastUpdatedDateData.pages.map((page, index) =>
					{
						if (index === 0 && page?.data && Object.keys(page.data).length > 0)
						{
							const pageSize = Object.keys(page.data).length;
							const pageData = updatedBlueprints.slice(0, pageSize);
							const lastItem = pageData[pageData.length - 1];

							const pageDataRecord = {};
							for (const item of pageData)
							{
								const { key, ...summaryData } = item;
								pageDataRecord[key] = summaryData;
							}

							return {
								...page,
								data     : pageDataRecord,
								lastKey  : lastItem?.key || page.lastKey,
								lastValue: lastItem?.lastUpdatedDate || page.lastValue,
							};
						}
						return page;
					});

					const updatedPaginatedData = {
						...lastUpdatedDateData,
						pages: updatedPages,
					};

					const validatedPaginatedData = validateRawPaginatedBlueprintSummaries(updatedPaginatedData);
					queryClient.setQueryData(lastUpdatedDateKey, validatedPaginatedData);
				}
				catch (error)
				{
					console.error('useCreateBlueprint - Error updating paginated cache:', error);
				}
			}

			const summaryKey = ['blueprintSummaries', 'blueprintId', blueprintId];

			const summaryData = {
				key              : blueprintId,
				title            : formData.title,
				imgurId          : imgurId,
				imgurType        : 'image/png',
				authorId         : user.uid,
				numberOfFavorites: 0,
				lastUpdatedDate  : unixTimestamp,
			};

			const blueprintSummary = validateRawBlueprintSummary(summaryData);
			queryClient.setQueryData(summaryKey, blueprintSummary);

			const userBlueprintsKey  = ['users', 'userId', authorId, 'blueprints'];
			const userBlueprintsData = queryClient.getQueryData(userBlueprintsKey);

			if (userBlueprintsData)
			{
				if (!Array.isArray(userBlueprintsData))
				{
					throw new Error('Expected userBlueprintsData to be an array');
				}

				queryClient.setQueryData(userBlueprintsKey, [
					...userBlueprintsData,
					blueprintId,
				]);
			}

			const availableTagsKey = ['tags'];
			const availableTags = queryClient.getQueryData(availableTagsKey) || [];

			availableTags.forEach(tag =>
			{
				const tagKey = ['byTag', tag];
				const tagData = queryClient.getQueryData(tagKey);

				if (tagData)
				{
					const hasTag = (formData.tags || []).includes(tag);

					if (hasTag)
					{
						queryClient.setQueryData(tagKey, {
							...tagData,
							[blueprintId]: true,
						});
					}
					else if (tagData[blueprintId])
					{
						const { [blueprintId]: _, ...rest } = tagData;
						queryClient.setQueryData(tagKey, rest);
					}
				}
			});

			navigate({to: `/view/${blueprintId}`});
		},
	});
};
