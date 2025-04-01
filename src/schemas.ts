import { z } from 'zod';

export const imgurImageSchema = z.object({
	id        : z.string(),
	type      : z.string(),
	deletehash: z.string().optional(),
	height    : z.number().optional(),
	width     : z.number().optional(),
}).strict();

export const blueprintAuthorSchema = z.object({
	displayName: z.string().optional(),
	userId     : z.string(),
}).strict();

export const rawBlueprintSummarySchema = z.object({
	title            : z.string(),
	imgurId          : z.string(),
	imgurType        : z.string(),
	numberOfFavorites: z.number(),
	lastUpdatedDate  : z.number().optional(),
	height           : z.number().optional(),
	width            : z.number().optional(),
}).strict();

export const rawBlueprintSchema = z.object({
	title              : z.string(),
	blueprintString    : z.string(),
	createdDate        : z.number(),
	descriptionMarkdown: z.string(),
	imageUrl           : z.string().optional(),
	lastUpdatedDate    : z.number(),
	numberOfFavorites  : z.number().default(0),
	tags               : z.array(z.string()).optional().default([]),
	authorId           : z.string().optional(),
	author             : blueprintAuthorSchema,
	image              : imgurImageSchema,
	favorites          : z.record(z.boolean()).optional().default({}),
	fileName           : z.string().optional(),
}).strict();

export const enrichedBlueprintSummarySchema = rawBlueprintSummarySchema.extend({
	key      : z.string(),
	thumbnail: z.string().nullable(),
}).strict();

export const enrichedBlueprintSchema = rawBlueprintSchema.extend({
	key                : z.string(),
	thumbnail          : z.string().nullable(),
	renderedDescription: z.string(),
	parsedData         : z.any().nullable(),
	tags               : z.record(z.boolean()),
}).strict();

export const enrichedBlueprintSummariesSchema = z.array(enrichedBlueprintSummarySchema);

export const rawBlueprintSummaryPageSchema = z.object({
	data     : z.record(z.string(), rawBlueprintSummarySchema),
	lastKey  : z.string().nullable(),
	lastValue: z.number().nullable(),
	hasMore  : z.boolean(),
}).strict();

export const rawPaginatedBlueprintSummariesSchema = z.object({
	pages     : z.array(rawBlueprintSummaryPageSchema),
	pageParams: z.array(z.any()).optional(),
}).strict();

export const enrichedBlueprintSummaryPageSchema = z.object({
	data     : z.array(enrichedBlueprintSummarySchema),
	lastKey  : z.string().nullable(),
	lastValue: z.number().nullable(),
	hasMore  : z.boolean(),
}).strict();

export const enrichedPaginatedBlueprintSummariesSchema = z.object({
	pages     : z.array(enrichedBlueprintSummaryPageSchema),
	pageParams: z.array(z.any()).optional(),
}).strict();

export type ImgurImage = z.infer<typeof imgurImageSchema>;
export type BlueprintAuthor = z.infer<typeof blueprintAuthorSchema>;
export type RawBlueprintSummary = z.infer<typeof rawBlueprintSummarySchema>;
export type RawBlueprint = z.infer<typeof rawBlueprintSchema>;
export type EnrichedBlueprintSummary = z.infer<typeof enrichedBlueprintSummarySchema>;
export type EnrichedBlueprint = z.infer<typeof enrichedBlueprintSchema>;
export type EnrichedBlueprintSummaries = z.infer<typeof enrichedBlueprintSummariesSchema>;
export type RawBlueprintSummaryPage = z.infer<typeof rawBlueprintSummaryPageSchema>;
export type RawPaginatedBlueprintSummaries = z.infer<typeof rawPaginatedBlueprintSummariesSchema>;
export type EnrichedBlueprintSummaryPage = z.infer<typeof enrichedBlueprintSummaryPageSchema>;
export type EnrichedPaginatedBlueprintSummaries = z.infer<typeof enrichedPaginatedBlueprintSummariesSchema>;

// Raw tag schemas - matching Firebase data structure
export const rawTagsSchema = z.record(z.string(), z.array(z.string()));

export const rawTagIndexSchema = z.record(z.string(), z.boolean());

// Enriched tag schemas - transformed for UI consumption
export const enrichedTagSchema = z.object({
	path    : z.string(), // Full tag path with slashes (e.g., "/belt/balancer/")
	category: z.string(), // Category name (e.g., "belt")
	name    : z.string(), // Tag name (e.g., "balancer")
	label   : z.string(), // Display-friendly label (e.g., "Balancer")
}).strict();

export const enrichedTagsSchema = z.array(enrichedTagSchema);

export type RawTags = z.infer<typeof rawTagsSchema>;
export type RawTagIndex = z.infer<typeof rawTagIndexSchema>;
export type EnrichedTag = z.infer<typeof enrichedTagSchema>;
export type EnrichedTags = z.infer<typeof enrichedTagsSchema>;

export const validate = <T>(data: unknown, schema: z.ZodSchema<T>, description: string): T => {
	try {
		return schema.parse(data);
	} catch (error) {
		console.error('Schema validation failed', { description, data, error });
		throw new Error(`Invalid ${description}: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
};

export const validateRawBlueprintSummary = (data: unknown): RawBlueprintSummary => {
	return validate(data, rawBlueprintSummarySchema, 'raw blueprint summary');
};

export const validateRawBlueprint = (data: unknown): RawBlueprint => {
	return validate(data, rawBlueprintSchema, 'raw blueprint');
};

export const validateEnrichedBlueprintSummary = (data: unknown): EnrichedBlueprintSummary => {
	return validate(data, enrichedBlueprintSummarySchema, 'enriched blueprint summary');
};

export const validateEnrichedBlueprintSummaries = (data: unknown): EnrichedBlueprintSummaries => {
	return validate(data, enrichedBlueprintSummariesSchema, 'enriched blueprint summaries array');
};

export const validateEnrichedBlueprint = (data: unknown): EnrichedBlueprint => {
	return validate(data, enrichedBlueprintSchema, 'enriched blueprint');
};

export const validateRawBlueprintSummaryPage = (data: unknown): RawBlueprintSummaryPage => {
	return validate(data, rawBlueprintSummaryPageSchema, 'raw blueprint summary page');
};

export const validateRawPaginatedBlueprintSummaries = (data: unknown): RawPaginatedBlueprintSummaries => {
	return validate(data, rawPaginatedBlueprintSummariesSchema, 'raw paginated blueprint summaries');
};

// TODO: Remove this deprecated alias after verifying no usage
export const validateRawBlueprintSummaryPages = validateRawPaginatedBlueprintSummaries;

export const validateEnrichedBlueprintSummaryPage = (data: unknown): EnrichedBlueprintSummaryPage => {
	return validate(data, enrichedBlueprintSummaryPageSchema, 'enriched blueprint summary page');
};

export const validateEnrichedPaginatedBlueprintSummaries = (data: unknown): EnrichedPaginatedBlueprintSummaries => {
	return validate(data, enrichedPaginatedBlueprintSummariesSchema, 'enriched paginated blueprint summaries');
};

export const validateRawTags = (data: unknown): RawTags => {
	return validate(data, rawTagsSchema, 'raw tags');
};

export const validateEnrichedTags = (data: unknown): EnrichedTags => {
	return validate(data, enrichedTagsSchema, 'enriched tags');
};

// Raw user schemas - matching Firebase data structure
export const rawUserSchema = z.object({
	id          : z.string(),
	displayName : z.string().optional(),
	email       : z.string().optional(),
	favorites   : z.record(z.string(), z.boolean()).optional().default({}),
	blueprints  : z.record(z.string(), z.boolean()).optional().default({}),
}).strict();

// Enriched user schemas - transformed for UI consumption
export const enrichedUserSchema = rawUserSchema.extend({
	favoritesCount : z.number(),
	blueprintsCount: z.number(),
}).strict();

export type RawUser = z.infer<typeof rawUserSchema>;
export type EnrichedUser = z.infer<typeof enrichedUserSchema>;

export const validateRawUser = (data: unknown): RawUser => {
	return validate(data, rawUserSchema, 'raw user');
};

export const validateEnrichedUser = (data: unknown): EnrichedUser => {
	return validate(data, enrichedUserSchema, 'enriched user');
};

// Raw user blueprints schema - matching Firebase data structure
export const rawUserBlueprintsSchema = z.record(z.string(), z.boolean());

// Enriched user blueprints schema - transformed for UI consumption
export const enrichedUserBlueprintsSchema = z.object({
	blueprintIds: z.record(z.string(), z.boolean()),
	count       : z.number(),
}).strict();

// Raw user favorites schema - matching Firebase data structure
export const rawUserFavoritesSchema = z.record(z.string(), z.boolean());

// Enriched user favorites schema - transformed for UI consumption
export const enrichedUserFavoritesSchema = z.object({
	favoriteIds: z.record(z.string(), z.boolean()),
	count      : z.number(),
}).strict();

export type RawUserBlueprints = z.infer<typeof rawUserBlueprintsSchema>;
export type EnrichedUserBlueprints = z.infer<typeof enrichedUserBlueprintsSchema>;
export type RawUserFavorites = z.infer<typeof rawUserFavoritesSchema>;
export type EnrichedUserFavorites = z.infer<typeof enrichedUserFavoritesSchema>;

export const validateRawUserBlueprints = (data: unknown): RawUserBlueprints => {
	return validate(data, rawUserBlueprintsSchema, 'raw user blueprints');
};

export const validateEnrichedUserBlueprints = (data: unknown): EnrichedUserBlueprints => {
	return validate(data, enrichedUserBlueprintsSchema, 'enriched user blueprints');
};

export const validateRawUserFavorites = (data: unknown): RawUserFavorites => {
	return validate(data, rawUserFavoritesSchema, 'raw user favorites');
};

export const validateEnrichedUserFavorites = (data: unknown): EnrichedUserFavorites => {
	return validate(data, enrichedUserFavoritesSchema, 'enriched user favorites');
};
