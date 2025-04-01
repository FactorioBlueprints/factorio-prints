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
import {validateRawBlueprint, validateRawBlueprintSummary}         from '../schemas';

export const useUpdateBlueprint = () =>
{
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation({
		mutationFn: async ({ id, rawBlueprint, formData, availableTags }) =>
		{
			// Process image URL if provided
			let image = null;
			if (formData.imageUrl)
			{
				const regexPatterns = {
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

				const match = matches[0];
				const imgurId = match[1];
				image = {
					id  : imgurId,
					type: 'image/png',
				};
			}

			const currentImageId = rawBlueprint?.image?.id;
			const shouldUpdateImage = image && (image.id !== currentImageId);

			const updates = {
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
			const existingBlueprint = queryClient.getQueryData(blueprintKey);

			// Build the updated raw blueprint
			const updatedBlueprint = {
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
				const regexPatterns = {
					imgurUrl1: /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/,
					imgurUrl2: /^https:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)\.[a-zA-Z0-9]{3,4}$/,
				};

				const matches = Object.values(regexPatterns)
					.map(pattern => variables.formData.imageUrl.match(pattern))
					.filter(Boolean);

				if (matches.length > 0)
				{
					const match = matches[0];
					const imgurId = match[1];
					updatedBlueprint.image = {
						id  : imgurId,
						type: 'image/png',
					};
				}
			}

			try
			{
				const validatedBlueprint = validateRawBlueprint(updatedBlueprint);
				queryClient.setQueryData(blueprintKey, validatedBlueprint);
			}
			catch (error)
			{
				console.error('Failed to validate blueprint for cache update:', error);
			}

			const summaryKey = ['blueprintSummaries', 'blueprintId', blueprintId];
			const existingSummary = queryClient.getQueryData(summaryKey);

			if (existingSummary)
			{
				const updatedSummary = {
					...existingSummary,
					title          : variables.formData.title,
					lastUpdatedDate: unixTimestamp,
				};

				if (updatedBlueprint.image)
				{
					updatedSummary.imgurId = updatedBlueprint.image.id;
					updatedSummary.imgurType = updatedBlueprint.image.type;
				}

				try
				{
					const validatedSummary = validateRawBlueprintSummary(updatedSummary);
					queryClient.setQueryData(summaryKey, validatedSummary);
				}
				catch (error)
				{
					console.error('Failed to validate summary for cache update:', error);
				}
			}

			// Invalidate queries that depend on lastUpdatedDate ordering
			const lastUpdatedDateKey = ['blueprintSummaries', 'orderByField', 'lastUpdatedDate'];
			queryClient.invalidateQueries({ queryKey: lastUpdatedDateKey });

			// Update tag cache
			variables.availableTags.forEach(tag =>
			{
				const tagKey = ['byTag', tag];
				const tagData = queryClient.getQueryData(tagKey);

				if (tagData && tagData[blueprintId])
				{
					const { [blueprintId]: _, ...rest } = tagData;
					queryClient.setQueryData(tagKey, rest);
				}
			});

			variables.formData.tags.forEach(tag =>
			{
				const tagKey = ['byTag', tag];
				const tagData = queryClient.getQueryData(tagKey);

				if (tagData)
				{
					queryClient.setQueryData(tagKey, {
						...tagData,
						[blueprintId]: true,
					});
				}
			});

			navigate({ to: `/view/${blueprintId}` });
		},
	});
};

export const useDeleteBlueprint = () =>
{
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation({
		mutationFn: async ({ id, authorId, tags }) =>
		{
			const updates = {
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
			queryClient.invalidateQueries(lastUpdatedDateKey);

			const userBlueprintsKey = ['users', 'userId', authorId, 'blueprints'];
			const userBlueprintsData = queryClient.getQueryData(userBlueprintsKey);

			if (userBlueprintsData)
			{
				const updatedUserBlueprints = userBlueprintsData.filter(
					blueprintId => blueprintId !== id,
				);
				queryClient.setQueryData(userBlueprintsKey, updatedUserBlueprints);
			}

			tags.forEach(tag =>
			{
				const tagKey = ['byTag', tag];
				const tagData = queryClient.getQueryData(tagKey);

				if (tagData && tagData[id])
				{
					const { [id]: _, ...rest } = tagData;
					queryClient.setQueryData(tagKey, rest);
				}
			});

			// Remove the deleted blueprint from cache to prevent errors
			queryClient.removeQueries(['blueprints', 'blueprintId', id]);
			queryClient.removeQueries(['blueprintSummaries', 'blueprintId', id]);

			navigate({ to: `/user/${authorId}` });
		},
	});
};
