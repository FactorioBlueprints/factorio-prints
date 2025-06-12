import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useNavigate} from '@tanstack/react-router';
import {update as dbUpdate, getDatabase, ref, serverTimestamp} from 'firebase/database';
import {app} from '../base';
import type {ImgurImage, RawBlueprint} from '../schemas';
import {validateRawBlueprint, validateRawBlueprintSummary, validateRawUserBlueprints} from '../schemas';
import type {ResolvedImgurImage} from '../services/imgurResolver';

interface UpdateBlueprintFormData {
	title: string;
	blueprintString: string;
	descriptionMarkdown: string;
	tags: string[];
	imageUrl: string;
	resolvedImageData?: ResolvedImgurImage | null;
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

export const useUpdateBlueprint = () => {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation<string, Error, UpdateBlueprintMutationParams>({
		mutationFn: async ({id, rawBlueprint, formData, availableTags}) => {
			// Process image URL if provided
			let image: ImgurImage | null = null;
			if (formData.imageUrl) {
				if (formData.resolvedImageData) {
					image = {
						id: formData.resolvedImageData.id,
						type: formData.resolvedImageData.extension,
						width: formData.resolvedImageData.width,
						height: formData.resolvedImageData.height,
						extension: formData.resolvedImageData.extension,
						title: formData.resolvedImageData.title,
						isFromAlbum: formData.resolvedImageData.isFromAlbum,
						warnings: formData.resolvedImageData.warnings,
					};
				} else {
					const regexPatterns: ImgurRegexPatterns = {
						imgurUrl1: /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/,
						imgurUrl2: /^https:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)\.[a-zA-Z0-9]{3,4}$/,
					};

					const matches = Object.values(regexPatterns)
						.map((pattern) => formData.imageUrl.match(pattern))
						.filter(Boolean);

					if (matches.length <= 0) {
						throw new Error('Invalid image URL format and no resolved image data available');
					}

					const match = matches[0]!;
					const imgurId = match[1]!;
					image = {
						id: imgurId,
						type: 'image/png',
					};
				}
			}

			const currentImageId = rawBlueprint?.image?.id;
			const shouldUpdateImage = image && image.id !== currentImageId;

			const updates: Record<string, unknown> = {
				[`/blueprints/${id}/title`]: formData.title,
				[`/blueprints/${id}/blueprintString`]: formData.blueprintString,
				[`/blueprints/${id}/descriptionMarkdown`]: formData.descriptionMarkdown,
				[`/blueprints/${id}/tags`]: formData.tags,
				[`/blueprints/${id}/lastUpdatedDate`]: serverTimestamp(),
				[`/blueprintSummaries/${id}/title/`]: formData.title,
				[`/blueprintSummaries/${id}/lastUpdatedDate/`]: serverTimestamp(),
			};

			if (shouldUpdateImage && image) {
				updates[`/blueprints/${id}/image`] = image;
				updates[`/blueprintSummaries/${id}/imgurId/`] = image.id;
				updates[`/blueprintSummaries/${id}/imgurType/`] = image.type;
				// Store enhanced metadata in summary if available
				if (image.extension) {
					updates[`/blueprintSummaries/${id}/imgurExtension/`] = image.extension;
				}
				if (image.title) {
					updates[`/blueprintSummaries/${id}/imgurTitle/`] = image.title;
				}
				if (image.isFromAlbum !== undefined) {
					updates[`/blueprintSummaries/${id}/imgurIsFromAlbum/`] = image.isFromAlbum;
				}
			}

			availableTags.forEach((tag) => {
				updates[`/byTag/${tag}/${id}`] = null;
			});

			formData.tags.forEach((tag) => {
				updates[`/byTag/${tag}/${id}`] = true;
			});

			await dbUpdate(ref(getDatabase(app)), updates);

			return id;
		},
		onSuccess: (blueprintId, variables) => {
			const now = new Date();
			const unixTimestamp = now.getTime();

			const blueprintKey = ['blueprints', 'blueprintId', blueprintId];
			const existingBlueprintData = queryClient.getQueryData(blueprintKey);
			const existingBlueprint = validateRawBlueprint(existingBlueprintData);

			// Build the updated raw blueprint
			const updatedBlueprint: Record<string, unknown> = {
				...existingBlueprint,
				title: variables.formData.title,
				blueprintString: variables.formData.blueprintString,
				descriptionMarkdown: variables.formData.descriptionMarkdown,
				tags: variables.formData.tags,
				lastUpdatedDate: unixTimestamp,
			};

			// Update image if a new one was provided
			if (variables.formData.imageUrl) {
				if (variables.formData.resolvedImageData) {
					updatedBlueprint.image = {
						id: variables.formData.resolvedImageData.id,
						type: variables.formData.resolvedImageData.extension,
						width: variables.formData.resolvedImageData.width,
						height: variables.formData.resolvedImageData.height,
						extension: variables.formData.resolvedImageData.extension,
						title: variables.formData.resolvedImageData.title,
						isFromAlbum: variables.formData.resolvedImageData.isFromAlbum,
						warnings: variables.formData.resolvedImageData.warnings,
					};
				} else {
					const regexPatterns: ImgurRegexPatterns = {
						imgurUrl1: /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/,
						imgurUrl2: /^https:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)\.[a-zA-Z0-9]{3,4}$/,
					};

					const matches = Object.values(regexPatterns)
						.map((pattern) => variables.formData.imageUrl.match(pattern))
						.filter(Boolean);

					if (matches.length > 0) {
						const match = matches[0]!;
						const imgurId = match[1]!;
						updatedBlueprint.image = {
							id: imgurId,
							type: 'image/png',
						};
					}
				}
			}

			const validatedBlueprint = validateRawBlueprint(updatedBlueprint);
			queryClient.setQueryData(blueprintKey, validatedBlueprint);

			const summaryKey = ['blueprintSummaries', 'blueprintId', blueprintId];
			const existingSummaryData = queryClient.getQueryData(summaryKey);
			const existingSummary = validateRawBlueprintSummary(existingSummaryData);

			const updatedSummary: Record<string, unknown> = {
				...existingSummary,
				title: variables.formData.title,
				lastUpdatedDate: unixTimestamp,
			};

			const blueprintImage = updatedBlueprint.image as ImgurImage | undefined;
			if (blueprintImage) {
				updatedSummary.imgurId = blueprintImage.id;
				updatedSummary.imgurType = blueprintImage.type;
				if (blueprintImage.extension) {
					updatedSummary.imgurExtension = blueprintImage.extension;
				}
				if (blueprintImage.title) {
					updatedSummary.imgurTitle = blueprintImage.title;
				}
				if (blueprintImage.isFromAlbum !== undefined) {
					updatedSummary.imgurIsFromAlbum = blueprintImage.isFromAlbum;
				}
			}

			try {
				const validatedSummary = validateRawBlueprintSummary(updatedSummary);
				queryClient.setQueryData(summaryKey, validatedSummary);
			} catch (error) {
				console.error('Failed to validate summary for cache update:', error);
			}

			// Invalidate queries that depend on lastUpdatedDate ordering
			const lastUpdatedDateKey = ['blueprintSummaries', 'orderByField', 'lastUpdatedDate'];
			queryClient.invalidateQueries({queryKey: lastUpdatedDateKey});

			// Update tag cache
			variables.availableTags.forEach((tag) => {
				const tagKey = ['byTag', tag];
				const tagDataRaw = queryClient.getQueryData(tagKey);

				if (tagDataRaw) {
					const tagData = validateRawUserBlueprints(tagDataRaw);
					if (tagData[blueprintId]) {
						const {[blueprintId]: _, ...rest} = tagData;
						queryClient.setQueryData(tagKey, rest);
					}
				}
			});

			variables.formData.tags.forEach((tag) => {
				const tagKey = ['byTag', tag];
				const tagDataRaw = queryClient.getQueryData(tagKey);

				if (tagDataRaw) {
					const tagData = validateRawUserBlueprints(tagDataRaw);
					queryClient.setQueryData(tagKey, {
						...tagData,
						[blueprintId]: true,
					});
				}
			});

			navigate({to: '/view/$blueprintId', params: {blueprintId}});
		},
	});
};

export const useDeleteBlueprint = () => {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation<string, Error, DeleteBlueprintMutationParams>({
		mutationFn: async ({id, authorId, tags}) => {
			const updates: Record<string, null> = {
				[`/blueprints/${id}`]: null,
				[`/users/${authorId}/blueprints/${id}`]: null,
				[`/blueprintSummaries/${id}`]: null,
			};

			tags.forEach((tag) => {
				updates[`/byTag/${tag}/${id}`] = null;
			});

			await dbUpdate(ref(getDatabase(app)), updates);

			return authorId;
		},
		onSuccess: (authorId, {id, tags}) => {
			const lastUpdatedDateKey = ['blueprintSummaries', 'orderByField', 'lastUpdatedDate'];
			queryClient.invalidateQueries({queryKey: lastUpdatedDateKey});

			const userBlueprintsKey = ['users', 'userId', authorId, 'blueprints'];
			const userBlueprintsDataRaw = queryClient.getQueryData(userBlueprintsKey);

			if (userBlueprintsDataRaw) {
				const userBlueprintsData = validateRawUserBlueprints(userBlueprintsDataRaw);

				// Create a new object without the deleted blueprint
				const {[id]: _, ...updatedUserBlueprints} = userBlueprintsData;
				queryClient.setQueryData(userBlueprintsKey, updatedUserBlueprints);
			}

			// Invalidate user blueprint queries to ensure UI refreshes
			queryClient.invalidateQueries({queryKey: userBlueprintsKey});

			tags.forEach((tag) => {
				const tagKey = ['byTag', tag];
				const tagDataRaw = queryClient.getQueryData(tagKey);

				if (tagDataRaw) {
					const tagData = validateRawUserBlueprints(tagDataRaw);
					if (tagData[id]) {
						const {[id]: _, ...rest} = tagData;
						queryClient.setQueryData(tagKey, rest);
					}
				}
			});

			// Remove the deleted blueprint from cache to prevent errors
			queryClient.removeQueries({queryKey: ['blueprints', 'blueprintId', id]});
			queryClient.removeQueries({queryKey: ['blueprintSummaries', 'blueprintId', id]});

			navigate({to: '/user/$userId', params: {userId: authorId}});
		},
	});
};
