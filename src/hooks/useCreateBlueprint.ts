import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useNavigate} from '@tanstack/react-router';
import type {User} from 'firebase/auth';
import {update as dbUpdate, getDatabase, push, ref, serverTimestamp} from 'firebase/database';
import flatMap from 'lodash/flatMap';
import {app} from '../base';
import {
	validateRawBlueprintSummary,
	validateRawPaginatedBlueprintSummaries,
	validateRawUserBlueprints,
} from '../schemas';

interface CreateBlueprintFormData {
	title: string;
	blueprintString: string;
	descriptionMarkdown: string;
	tags?: string[];
	imageUrl: string;
	resolvedImageData?: {
		id: string;
		type: string;
		extension: string;
		width?: number;
		height?: number;
		title?: string;
		isFromAlbum: boolean;
		warnings: string[];
	};
}

interface CreateBlueprintMutationParams {
	formData: CreateBlueprintFormData;
	user: User;
}

interface CreateBlueprintResult {
	blueprintId: string;
	authorId: string;
}

interface ImgurRegexPatterns {
	imgurUrl1: RegExp;
	imgurUrl2: RegExp;
}

export const useCreateBlueprint = () => {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	return useMutation<CreateBlueprintResult, Error, CreateBlueprintMutationParams>({
		mutationFn: async ({formData, user}) => {
			let image;

			if (formData.resolvedImageData) {
				image = {
					id: formData.resolvedImageData.id,
					type: formData.resolvedImageData.type,
					width: formData.resolvedImageData.width,
					height: formData.resolvedImageData.height,
					extension: formData.resolvedImageData.extension,
					title: formData.resolvedImageData.title,
					isFromAlbum: formData.resolvedImageData.isFromAlbum,
					warnings: formData.resolvedImageData.warnings,
				};
			} else {
				const imageUrl = formData.imageUrl;
				const regexPatterns: ImgurRegexPatterns = {
					imgurUrl1: /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/,
					imgurUrl2: /^https:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)\.[a-zA-Z0-9]{3,4}$/,
				};

				const matches = Object.values(regexPatterns)
					.map((pattern) => imageUrl.match(pattern))
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

			const blueprintData = {
				title: formData.title,
				blueprintString: formData.blueprintString,
				descriptionMarkdown: formData.descriptionMarkdown,
				tags: formData.tags || [],
				author: {
					userId: user.uid,
					displayName: user.displayName || null,
				},
				authorId: user.uid,
				createdDate: serverTimestamp(),
				lastUpdatedDate: serverTimestamp(),
				favorites: {},
				numberOfFavorites: 0,
				image,
			};

			const blueprintSummary: Record<string, unknown> = {
				imgurId: image.id,
				imgurType: image.type,
				title: formData.title,
				numberOfFavorites: 0,
				lastUpdatedDate: serverTimestamp(),
			};

			if (image.extension) {
				blueprintSummary.imgurExtension = image.extension;
			}
			if (image.title) {
				blueprintSummary.imgurTitle = image.title;
			}
			if (image.isFromAlbum !== undefined) {
				blueprintSummary.imgurIsFromAlbum = image.isFromAlbum;
			}

			const blueprintsRef = ref(getDatabase(app), '/blueprints');
			const newBlueprintRef = push(blueprintsRef, blueprintData);
			const newBlueprintKey = newBlueprintRef.key;

			if (!newBlueprintKey) {
				throw new Error('Failed to generate blueprint key');
			}

			const updates: Record<string, unknown> = {};

			updates[`/users/${user.uid}/blueprints/${newBlueprintKey}`] = true;
			updates[`/blueprintSummaries/${newBlueprintKey}`] = blueprintSummary;
			updates[`/blueprintsPrivate/${newBlueprintKey}/imageUrl`] = formData.imageUrl;

			(formData.tags || []).forEach((tag) => {
				updates[`/byTag/${tag}/${newBlueprintKey}`] = true;
			});

			await dbUpdate(ref(getDatabase(app)), updates);

			return {
				blueprintId: newBlueprintKey,
				authorId: user.uid,
			};
		},
		onSuccess: ({blueprintId, authorId}, {formData}) => {
			const now = new Date();
			const unixTimestamp = now.getTime();

			let imgurId = '';
			let imgurType = 'image/png';

			if (formData.resolvedImageData) {
				imgurId = formData.resolvedImageData.id;
				imgurType = formData.resolvedImageData.type;
			} else {
				const regexPatterns: ImgurRegexPatterns = {
					imgurUrl1: /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/,
					imgurUrl2: /^https:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)\.[a-zA-Z0-9]{3,4}$/,
				};

				const matches = Object.values(regexPatterns)
					.map((pattern) => formData.imageUrl.match(pattern))
					.filter(Boolean);

				imgurId = matches.length > 0 ? matches[0]![1]! : '';
			}

			const lastUpdatedDateKey = ['blueprintSummaries', 'orderByField', 'lastUpdatedDate'];
			const lastUpdatedDateData = queryClient.getQueryData(lastUpdatedDateKey);

			if (
				lastUpdatedDateData &&
				typeof lastUpdatedDateData === 'object' &&
				'pages' in lastUpdatedDateData &&
				Array.isArray(lastUpdatedDateData.pages)
			) {
				try {
					const summaryData = {
						title: formData.title,
						imgurId: imgurId,
						imgurType: imgurType,
						numberOfFavorites: 0,
						lastUpdatedDate: unixTimestamp,
					};

					const newSummary = validateRawBlueprintSummary(summaryData);
					const allBlueprints = flatMap(lastUpdatedDateData.pages, (page) =>
						page?.data
							? Object.entries(page.data).map(([key, summary]) => ({
									...(summary as Record<string, unknown>),
									key,
								}))
							: [],
					);

					type BlueprintWithKey = Record<string, unknown> & {key: string};
					const newSummaryWithKey = {
						...newSummary,
						key: blueprintId,
					} as BlueprintWithKey;
					const updatedBlueprints = [
						newSummaryWithKey,
						...allBlueprints.filter(
							(item): item is BlueprintWithKey =>
								typeof item === 'object' && item !== null && 'key' in item && item.key !== blueprintId,
						),
					];

					const updatedPages = lastUpdatedDateData.pages.map((page, index) => {
						if (index === 0 && page?.data && Object.keys(page.data).length > 0) {
							const pageSize = Object.keys(page.data).length;
							const pageData = updatedBlueprints.slice(0, pageSize);
							const lastItem = pageData[pageData.length - 1];

							const pageDataRecord: Record<string, unknown> = {};
							for (const item of pageData) {
								const {key, ...summaryData} = item;
								pageDataRecord[key] = summaryData;
							}

							return {
								...page,
								data: pageDataRecord,
								lastKey: lastItem?.key || page.lastKey,
								lastValue:
									lastItem && 'lastUpdatedDate' in lastItem
										? lastItem.lastUpdatedDate
										: page.lastValue,
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
				} catch (error) {
					console.error('useCreateBlueprint - Error updating paginated cache:', error);
				}
			}

			const summaryKey = ['blueprintSummaries', 'blueprintId', blueprintId];

			const summaryData: Record<string, unknown> = {
				title: formData.title,
				imgurId: imgurId,
				imgurType: imgurType,
				numberOfFavorites: 0,
				lastUpdatedDate: unixTimestamp,
			};

			if (formData.resolvedImageData) {
				if (formData.resolvedImageData.extension) {
					summaryData.imgurExtension = formData.resolvedImageData.extension;
				}
				if (formData.resolvedImageData.title) {
					summaryData.imgurTitle = formData.resolvedImageData.title;
				}
				if (formData.resolvedImageData.isFromAlbum !== undefined) {
					summaryData.imgurIsFromAlbum = formData.resolvedImageData.isFromAlbum;
				}
			}

			const blueprintSummary = validateRawBlueprintSummary(summaryData);
			queryClient.setQueryData(summaryKey, blueprintSummary);

			const userBlueprintsKey = ['users', 'userId', authorId, 'blueprints'];
			const userBlueprintsDataRaw = queryClient.getQueryData(userBlueprintsKey);
			const userBlueprintsData = userBlueprintsDataRaw ? validateRawUserBlueprints(userBlueprintsDataRaw) : {};

			// Add the new blueprint to the user's blueprints object
			queryClient.setQueryData(userBlueprintsKey, {
				...userBlueprintsData,
				[blueprintId]: true,
			});

			const availableTagsKey = ['tags'];
			const availableTags = queryClient.getQueryData(availableTagsKey) || [];

			if (Array.isArray(availableTags)) {
				availableTags.forEach((tag) => {
					const tagKey = ['byTag', tag];
					const tagDataRaw = queryClient.getQueryData(tagKey);

					if (tagDataRaw && typeof tagDataRaw === 'object') {
						const tagData = validateRawUserBlueprints(tagDataRaw);
						const hasTag = (formData.tags || []).includes(tag);

						if (hasTag) {
							queryClient.setQueryData(tagKey, {
								...tagData,
								[blueprintId]: true,
							});
						} else if (blueprintId in tagData) {
							const {[blueprintId]: _, ...rest} = tagData;
							queryClient.setQueryData(tagKey, rest);
						}
					}
				});
			}

			navigate({to: '/view/$blueprintId', params: {blueprintId}, from: '/create'});
		},
	});
};
