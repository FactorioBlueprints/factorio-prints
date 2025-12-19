import {z} from 'zod';

export const sortOrderSchema = z.enum(['Favorites', 'Updated']);
export type SortOrder = z.infer<typeof sortOrderSchema>;

export const blueprintTypeSchema = z.enum(['blueprint', 'blueprint-book', 'upgrade-planner', 'deconstruction-planner']);
export type BlueprintType = z.infer<typeof blueprintTypeSchema>;

export const modFilterSchema = z.enum([
	'base',
	'base&creative',
	'unknown',
	'aai',
	'ltn',
	'krastorio',
	'space-exploration',
	'bobs',
	'creative-mod',
	'lighted-electric-poles',
]);
export type ModFilter = z.infer<typeof modFilterSchema>;

export const restBlueprintSummarySchema = z
	.object({
		key: z.string(),
		title: z.string(),
		imgurId: z.string(),
		imgurType: z.string(),
		numberOfFavorites: z.number(),
		lastUpdatedDate: z.number().optional(),
		height: z.number().optional(),
		width: z.number().optional(),
	})
	.strict();

export type RestBlueprintSummary = z.infer<typeof restBlueprintSummarySchema>;

export const restPaginationMetadataSchema = z
	.object({
		pagination: z.object({
			numberOfPages: z.number(),
			pageNumber: z.number(),
			pageSize: z.number(),
		}),
	})
	.strict();

export type RestPaginationMetadata = z.infer<typeof restPaginationMetadataSchema>;

export const restPaginatedResponseSchema = z
	.object({
		_data: z.array(restBlueprintSummarySchema),
		_metadata: restPaginationMetadataSchema,
	})
	.strict();

export type RestPaginatedResponse = z.infer<typeof restPaginatedResponseSchema>;

export const restTagSchema = z
	.object({
		category: z.string(),
		name: z.string(),
	})
	.strict();

export type RestTag = z.infer<typeof restTagSchema>;

export interface AdvancedSearchParams {
	page: number;
	pageSize: number;
	text?: string;
	orderBy?: SortOrder;
	tag?: string;
	entity?: string;
	recipe?: string;
	gameVersionLong?: number;
	blueprintType?: BlueprintType;
	mod?: ModFilter;
}
