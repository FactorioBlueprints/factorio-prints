import {useMutation, useQueryClient}                          from '@tanstack/react-query';
import {
	useNavigate,
}                                                                  from '@tanstack/react-router';
import {
	getDatabase,
	ref,
	serverTimestamp,
	update as dbUpdate,
}                                                                  from 'firebase/database';
import {app}                                                       from '../base';
import {validateRawBlueprint, validateRawBlueprintSummary, validateRawUserBlueprints}         from '../schemas';
import type {RawBlueprint, ImgurImage}                             from '../schemas';

interface UpdateBlueprintFormData {
	title: string;
	blueprintString: string;
	descriptionMarkdown: string;
	tags: string[];
	imageUrl: string;
}

interface UpdateBlueprintMutationParams {
	id: string;
	rawBlueprint: RawBlueprint;
	formData: UpdateBlueprintFormData;
	availableTags: string[];
}

interface DeleteBlueprintMutationParams {
	id: string;
	authorId: string;
	tags: string[];
}

interface ImgurRegexPatterns {
	imgurUrl1: RegExp;
	imgurUrl2: RegExp;
}

export const useUpdateBlueprint = () =>
{
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation<string, Error, UpdateBlueprintMutationParams>({
		mutationFn: async ({ id, rawBlueprint, formData, availableTags }) =>
		{
			// Process image URL if provided
			let image: ImgurImage | null = null;
			if (formData.imageUrl)
			{
				const regexPatterns: ImgurRegexPatterns = {
					imgurUrl1: /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/,
					imgurUrl2: /^https:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)\.[a-zA-Z0-9]{3,4}$/,
				};

				const matches = Object.values(regexPatterns)
					.map(pattern => formData.imageUrl.match(pattern))
					.filter(Boolean);

				if (matches.length <= 0)
				{
					throw new Error('Invalid image URL format');
				}

				const match = matches[0]!;
				const imgurId = match[1]!;
				image = {
					id  : imgurId,
					type: 'image/png',
				};
			}

			const currentImageId = rawBlueprint?.image?.id;
			const shouldUpdateImage = image && (image.id !== currentImageId);

			const updates: Record<string, unknown> = {
				[`/blueprints/${id}/title`]                   : formData.title,
				[`/blueprints/${id}/blueprintString`]         : formData.blueprintString,
				[`/blueprints/${id}/descriptionMarkdown`]     : formData.descriptionMarkdown,
				[`/blueprints/${id}/tags`]                    : formData.tags,
				[`/blueprints/${id}/lastUpdatedDate`]         : serverTimestamp(),
				[`/blueprintSummaries/${id}/title/`]          : formData.title,
				[`/blueprintSummaries/${id}/lastUpdatedDate/`]: serverTimestamp(),
			};

			if (shouldUpdateImage && image)
			{
				updates[`/blueprints/${id}/image`] = image;
				updates[`/blueprintSummaries/${id}/imgurId/`] = image.id;
				updates[`/blueprintSummaries/${id}/imgurType/`] = image.type;
			}

			availableTags.forEach((tag) =>
			{
				updates[`/byTag/${tag}/${id}`] = null;
			});

			formData.tags.forEach((tag) =>
			{
				updates[`/byTag/${tag}/${id}`] = true;
			});

			await dbUpdate(ref(getDatabase(app)), updates);

			return id;
		},
		onSuccess: (blueprintId, variables) =>
		{
			const now = new Date();
			const unixTimestamp = now.getTime();

			const blueprintKey = ['blueprints', 'blueprintId', blueprintId];
			const existingBlueprintData = queryClient.getQueryData(blueprintKey);
			const existingBlueprint = validateRawBlueprint(existingBlueprintData);

			// Build the updated raw blueprint
			const updatedBlueprint: Record<string, unknown> = {
				...existingBlueprint,
				title              : variables.formData.title,
				blueprintString    : variables.formData.blueprintString,
				descriptionMarkdown: variables.formData.descriptionMarkdown,
				tags               : variables.formData.tags,
				lastUpdatedDate    : unixTimestamp,
			};

			// Update image if a new one was provided
			if (variables.formData.imageUrl)
			{
				const regexPatterns: ImgurRegexPatterns = {
					imgurUrl1: /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/,
					imgurUrl2: /^https:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)\.[a-zA-Z0-9]{3,4}$/,
				};

				const matches = Object.values(regexPatterns)
					.map(pattern => variables.formData.imageUrl.match(pattern))
					.filter(Boolean);

				if (matches.length > 0)
				{
					const match = matches[0]!;
					const imgurId = match[1]!;
					updatedBlueprint.image = {
						id  : imgurId,
						type: 'image/png',
					};
				}
			}

			const validatedBlueprint = validateRawBlueprint(updatedBlueprint);
			queryClient.setQueryData(blueprintKey, validatedBlueprint);

			const summaryKey = ['blueprintSummaries', 'blueprintId', blueprintId];
			const existingSummaryData = queryClient.getQueryData(summaryKey);
			const existingSummary = validateRawBlueprintSummary(existingSummaryData);

			const updatedSummary: Record<string, unknown> = {
				...existingSummary,
				title          : variables.formData.title,
				lastUpdatedDate: unixTimestamp,
			};

			const blueprintImage = updatedBlueprint.image as ImgurImage | undefined;
			if (blueprintImage)
			{
				updatedSummary.imgurId = blueprintImage.id;
				updatedSummary.imgurType = blueprintImage.type;
			}

			const validatedSummary = validateRawBlueprintSummary(updatedSummary);
			queryClient.setQueryData(summaryKey, validatedSummary);

			// Invalidate queries that depend on lastUpdatedDate ordering
			const lastUpdatedDateKey = ['blueprintSummaries', 'orderByField', 'lastUpdatedDate'];
			queryClient.invalidateQueries({ queryKey: lastUpdatedDateKey });

			// Update tag cache
			variables.availableTags.forEach(tag =>
			{
				const tagKey = ['byTag', tag];
				const tagDataRaw = queryClient.getQueryData(tagKey);

				if (tagDataRaw)
				{
					const tagData = validateRawUserBlueprints(tagDataRaw);
					if (tagData[blueprintId])
					{
						const { [blueprintId]: _, ...rest } = tagData;
						queryClient.setQueryData(tagKey, rest);
					}
				}
			});

			variables.formData.tags.forEach(tag =>
			{
				const tagKey = ['byTag', tag];
				const tagDataRaw = queryClient.getQueryData(tagKey);

				if (tagDataRaw)
				{
					const tagData = validateRawUserBlueprints(tagDataRaw);
					queryClient.setQueryData(tagKey, {
						...tagData,
						[blueprintId]: true,
					});
				}
			});

			navigate({ to: '/view/$blueprintId', params: { blueprintId }, from: '/edit/$blueprintId' });
		},
	});
};

export const useDeleteBlueprint = () =>
{
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation<string, Error, DeleteBlueprintMutationParams>({
		mutationFn: async ({ id, authorId, tags }) =>
		{
			const updates: Record<string, null> = {
				[`/blueprints/${id}`]                  : null,
				[`/users/${authorId}/blueprints/${id}`]: null,
				[`/blueprintSummaries/${id}`]          : null,
			};

			tags.forEach((tag) =>
			{
				updates[`/byTag/${tag}/${id}`] = null;
			});

			await dbUpdate(ref(getDatabase(app)), updates);

			return authorId;
		},
		onSuccess: (authorId, { id, tags }) =>
		{
			const lastUpdatedDateKey = ['blueprintSummaries', 'orderByField', 'lastUpdatedDate'];
			queryClient.invalidateQueries({ queryKey: lastUpdatedDateKey });

			const userBlueprintsKey = ['users', 'userId', authorId, 'blueprints'];
			const userBlueprintsDataRaw = queryClient.getQueryData(userBlueprintsKey);

			if (userBlueprintsDataRaw)
			{
				const userBlueprintsData = validateRawUserBlueprints(userBlueprintsDataRaw);

				// Create a new object without the deleted blueprint
				const { [id]: _, ...updatedUserBlueprints } = userBlueprintsData;
				queryClient.setQueryData(userBlueprintsKey, updatedUserBlueprints);
			}

			// Invalidate user blueprint queries to ensure UI refreshes
			queryClient.invalidateQueries({ queryKey: userBlueprintsKey });

			tags.forEach(tag =>
			{
				const tagKey = ['byTag', tag];
				const tagDataRaw = queryClient.getQueryData(tagKey);

				if (tagDataRaw)
				{
					const tagData = validateRawUserBlueprints(tagDataRaw);
					if (tagData[id])
					{
						const { [id]: _, ...rest } = tagData;
						queryClient.setQueryData(tagKey, rest);
					}
				}
			});

			// Remove the deleted blueprint from cache to prevent errors
			queryClient.removeQueries({ queryKey: ['blueprints', 'blueprintId', id] });
			queryClient.removeQueries({ queryKey: ['blueprintSummaries', 'blueprintId', id] });

			navigate({ to: '/user/$userId', params: { userId: authorId }, from: '/edit/$blueprintId' });
		},
	});
};
