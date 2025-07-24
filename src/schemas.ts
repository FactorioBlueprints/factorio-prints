import {z} from 'zod';

export const imgurImageSchema = z
	.object({
		id: z.string(),
		type: z.string(),
		deletehash: z.string().optional(),
		height: z.number().optional(),
		width: z.number().optional(),
	})
	.strict();

export const blueprintAuthorSchema = z
	.object({
		displayName: z.string().optional(),
		userId: z.string(),
	})
	.strict();

export const rawBlueprintSummarySchema = z
	.object({
		title: z.string(),
		imgurId: z.string(),
		imgurType: z.string(),
		numberOfFavorites: z.number(),
		lastUpdatedDate: z.number().optional(),
		height: z.number().optional(),
		width: z.number().optional(),
	})
	.strict();

export const rawBlueprintSchema = z
	.object({
		title: z.string(),
		blueprintString: z.string(),
		createdDate: z.number(),
		descriptionMarkdown: z.string(),
		imageUrl: z.string().optional(),
		lastUpdatedDate: z.number(),
		numberOfFavorites: z.number().optional().default(0),
		tags: z.array(z.string()).optional().default([]),
		authorId: z.string().optional(),
		author: blueprintAuthorSchema,
		image: imgurImageSchema,
		favorites: z.record(z.string(), z.boolean()).optional().default({}),
		fileName: z.string().optional(),
	})
	.strict();

export const enrichedBlueprintSummarySchema = rawBlueprintSummarySchema
	.extend({
		key: z.string(),
		thumbnail: z.string().nullable(),
	})
	.strict();

export const enrichedBlueprintSchema = rawBlueprintSchema
	.extend({
		key: z.string(),
		thumbnail: z.string().nullable(),
		renderedDescription: z.string(),
		parsedData: z.any().nullable(),
		tags: z.record(z.string(), z.boolean()),
	})
	.strict();

export const enrichedBlueprintSummariesSchema = z.array(enrichedBlueprintSummarySchema);

export const rawBlueprintSummaryPageSchema = z
	.object({
		data: z.record(z.string(), rawBlueprintSummarySchema),
		lastKey: z.string().nullable(),
		lastValue: z.number().nullable(),
		hasMore: z.boolean(),
	})
	.strict();

export const rawPaginatedBlueprintSummariesSchema = z
	.object({
		pages: z.array(rawBlueprintSummaryPageSchema),
		pageParams: z.array(z.any()).optional(),
	})
	.strict();

export const enrichedBlueprintSummaryPageSchema = z
	.object({
		data: z.array(enrichedBlueprintSummarySchema),
		lastKey: z.string().nullable(),
		lastValue: z.number().nullable(),
		hasMore: z.boolean(),
	})
	.strict();

export const enrichedPaginatedBlueprintSummariesSchema = z
	.object({
		pages: z.array(enrichedBlueprintSummaryPageSchema),
		pageParams: z.array(z.any()).optional(),
	})
	.strict();

export type ImgurImage = z.infer<typeof imgurImageSchema>;
export type BlueprintAuthor = z.infer<typeof blueprintAuthorSchema>;
export type RawBlueprintSummary = z.infer<typeof rawBlueprintSummarySchema>;
export type RawBlueprint = z.output<typeof rawBlueprintSchema>;
export type EnrichedBlueprintSummary = z.infer<typeof enrichedBlueprintSummarySchema>;
export type EnrichedBlueprint = z.output<typeof enrichedBlueprintSchema>;
export type EnrichedBlueprintSummaries = z.infer<typeof enrichedBlueprintSummariesSchema>;
export type RawBlueprintSummaryPage = z.infer<typeof rawBlueprintSummaryPageSchema>;
export type RawPaginatedBlueprintSummaries = z.infer<typeof rawPaginatedBlueprintSummariesSchema>;
export type EnrichedBlueprintSummaryPage = z.infer<typeof enrichedBlueprintSummaryPageSchema>;
export type EnrichedPaginatedBlueprintSummaries = z.infer<typeof enrichedPaginatedBlueprintSummariesSchema>;

// Raw tag schemas - matching Firebase data structure
export const rawTagsSchema = z.record(z.string(), z.array(z.string()));

export const rawTagIndexSchema = z.record(z.string(), z.boolean());

// Enriched tag schemas - transformed for UI consumption
export const enrichedTagSchema = z
	.object({
		path: z.string(), // Full tag path with slashes (e.g., "/belt/balancer/")
		category: z.string(), // Category name (e.g., "belt")
		name: z.string(), // Tag name (e.g., "balancer")
		label: z.string(), // Display-friendly label (e.g., "Balancer")
	})
	.strict();

export const enrichedTagsSchema = z.array(enrichedTagSchema);

export type RawTags = z.infer<typeof rawTagsSchema>;
export type RawTagIndex = z.infer<typeof rawTagIndexSchema>;
export type EnrichedTag = z.infer<typeof enrichedTagSchema>;
export type EnrichedTags = z.infer<typeof enrichedTagsSchema>;

export const validate = <T>(data: unknown, schema: z.ZodSchema<T>, description: string): T => {
	try {
		return schema.parse(data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorDetails = error.issues.map((e) => ({
				path: e.path.join('.'),
				message: e.message,
				code: e.code,
			}));
			console.error(
				'Schema validation failed',
				JSON.stringify({
					description,
					errorCount: error.issues.length,
					errors: errorDetails,
					dataType: typeof data,
					dataKeys: data && typeof data === 'object' ? Object.keys(data) : undefined,
				}),
			);
			const errorMessage = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			throw new Error(`Invalid ${description}: ${errorMessage}`);
		}
		console.error(
			'Schema validation failed with unexpected error',
			JSON.stringify({description, error: String(error)}),
		);
		throw new Error(`Invalid ${description}: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
};

export const validateRawBlueprintSummary = (data: unknown): RawBlueprintSummary => {
	return validate(data, rawBlueprintSummarySchema, 'raw blueprint summary');
};

export const validateRawBlueprint = (data: unknown): RawBlueprint => {
	const parsed = validate(data, rawBlueprintSchema, 'raw blueprint');
	// Ensure defaults are applied
	return {
		...parsed,
		numberOfFavorites: parsed.numberOfFavorites ?? 0,
		tags: parsed.tags ?? [],
		favorites: parsed.favorites ?? {},
	};
};

export const validateEnrichedBlueprintSummary = (data: unknown): EnrichedBlueprintSummary => {
	return validate(data, enrichedBlueprintSummarySchema, 'enriched blueprint summary');
};

export const validateEnrichedBlueprintSummaries = (data: unknown): EnrichedBlueprintSummaries => {
	return validate(data, enrichedBlueprintSummariesSchema, 'enriched blueprint summaries array');
};

export const validateEnrichedBlueprint = (data: unknown): EnrichedBlueprint => {
	const parsed = validate(data, enrichedBlueprintSchema, 'enriched blueprint');
	// Ensure defaults are applied
	return {
		...parsed,
		numberOfFavorites: parsed.numberOfFavorites ?? 0,
		tags: parsed.tags ?? {},
		favorites: parsed.favorites ?? {},
	};
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
export const rawUserSchema = z
	.object({
		id: z.string(),
		displayName: z.string().optional(),
		email: z.string().optional(),
		favorites: z.record(z.string(), z.boolean()).optional().default({}),
		blueprints: z.record(z.string(), z.boolean()).optional().default({}),
	})
	.strict();

// Enriched user schemas - transformed for UI consumption
export const enrichedUserSchema = rawUserSchema
	.extend({
		favoritesCount: z.number(),
		blueprintsCount: z.number(),
	})
	.strict();

export type RawUser = z.output<typeof rawUserSchema>;
export type EnrichedUser = z.output<typeof enrichedUserSchema>;

export const validateRawUser = (data: unknown): RawUser => {
	const parsed = validate(data, rawUserSchema, 'raw user');
	// Ensure defaults are applied
	return {
		...parsed,
		favorites: parsed.favorites ?? {},
		blueprints: parsed.blueprints ?? {},
	};
};

export const validateEnrichedUser = (data: unknown): EnrichedUser => {
	const parsed = validate(data, enrichedUserSchema, 'enriched user');
	// Ensure defaults are applied
	return {
		...parsed,
		favorites: parsed.favorites ?? {},
		blueprints: parsed.blueprints ?? {},
	};
};

// Raw user blueprints schema - matching Firebase data structure
export const rawUserBlueprintsSchema = z.record(z.string(), z.boolean());

// Enriched user blueprints schema - transformed for UI consumption
export const enrichedUserBlueprintsSchema = z
	.object({
		blueprintIds: z.record(z.string(), z.boolean()),
		count: z.number(),
	})
	.strict();

// Raw user favorites schema - matching Firebase data structure
export const rawUserFavoritesSchema = z.record(z.string(), z.boolean());

// Enriched user favorites schema - transformed for UI consumption
export const enrichedUserFavoritesSchema = z
	.object({
		favoriteIds: z.record(z.string(), z.boolean()),
		count: z.number(),
	})
	.strict();

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

// Raw blueprint parsing schemas - for parsed blueprint data from game files
export const blueprintIconSchema = z
	.object({
		signal: z
			.object({
				name: z.string(),
				type: z.string().optional(),
				quality: z.string().optional(),
			})
			.strict(),
		index: z.number(),
	})
	.strict();

export const blueprintEntitySchema = z
	.object({
		entity_number: z.number(),
		name: z.string(),
		position: z
			.object({
				x: z.number(),
				y: z.number(),
			})
			.strict(),
	})
	.passthrough(); // Allow additional properties

export const blueprintTileSchema = z
	.object({
		name: z.string(),
		position: z
			.object({
				x: z.number(),
				y: z.number(),
			})
			.strict(),
	})
	.passthrough(); // Allow additional properties

export const blueprintContentSchema = z
	.object({
		label: z.string().optional(),
		description: z.string().optional(),
		version: z.number().optional(),
		icons: z.array(blueprintIconSchema).optional(),
		entities: z.array(blueprintEntitySchema).optional(),
		tiles: z.array(blueprintTileSchema).optional(),
		item: z.string().optional(),
		parameters: z.array(z.any()).optional(),
	})
	.passthrough(); // Allow additional properties

export const blueprintBookEntrySchema: z.ZodSchema<any> = z.lazy(() =>
	z
		.object({
			blueprint: blueprintContentSchema.optional(),
			blueprint_book: blueprintBookSchema.optional(),
			upgrade_planner: upgradePlannerSchema.optional(),
			deconstruction_planner: deconstructionPlannerSchema.optional(),
			index: z.number(),
		})
		.strict(),
);

export const blueprintBookSchema = z
	.object({
		blueprints: z.array(blueprintBookEntrySchema),
		item: z.string().optional(),
		label: z.string().optional(),
		description: z.string().optional(),
		active_index: z.number().optional(),
		version: z.number().optional(),
	})
	.passthrough(); // Allow additional properties

export const upgradePlannerSchema = z
	.object({
		settings: z.unknown().optional(),
		item: z.string().optional(),
		label: z.string().optional(),
		version: z.number().optional(),
	})
	.passthrough();

export const deconstructionPlannerSchema = z
	.object({
		settings: z.unknown().optional(),
		item: z.string().optional(),
		label: z.string().optional(),
		version: z.number().optional(),
	})
	.passthrough();

export const rawBlueprintDataSchema = z
	.object({
		blueprint: blueprintContentSchema.optional(),
		blueprint_book: blueprintBookSchema.optional(),
		upgrade_planner: upgradePlannerSchema.optional(),
		deconstruction_planner: deconstructionPlannerSchema.optional(),
	})
	.passthrough(); // Allow additional properties

export type BlueprintIcon = z.infer<typeof blueprintIconSchema>;
export type BlueprintEntity = z.infer<typeof blueprintEntitySchema>;
export type BlueprintTile = z.infer<typeof blueprintTileSchema>;
export type BlueprintContent = z.infer<typeof blueprintContentSchema>;
export type BlueprintBookEntry = z.infer<typeof blueprintBookEntrySchema>;
export type BlueprintBook = z.infer<typeof blueprintBookSchema>;
export type UpgradePlanner = z.infer<typeof upgradePlannerSchema>;
export type DeconstructionPlanner = z.infer<typeof deconstructionPlannerSchema>;
export type RawBlueprintData = z.infer<typeof rawBlueprintDataSchema>;

export const validateRawBlueprintData = (data: unknown): RawBlueprintData => {
	return validate(data, rawBlueprintDataSchema, 'raw blueprint data');
};
