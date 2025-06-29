import { describe, it, expect } from 'vitest';
import { enrichBlueprintSummaryPage, enrichPaginatedBlueprintSummaries } from './enrichPaginatedBlueprintSummaries';

describe('enrichBlueprintSummaryPage', () =>
{
	it('should return null if input is null', () =>
	{
		const result = enrichBlueprintSummaryPage(null);
		expect(result).toBeNull();
	});

	it('should transform raw page data into enriched page data', () =>
	{
		const rawPage: any = {
			data: {
				key1: {
					title            : 'Blueprint 1',
					imgurId          : 'img1',
					imgurType        : 'image/png',
					numberOfFavorites: 10,
					lastUpdatedDate  : 1000,
				},
				key2: {
					title            : 'Blueprint 2',
					imgurId          : 'img2',
					imgurType        : 'image/jpeg',
					numberOfFavorites: 20,
					lastUpdatedDate  : 2000,
				},
			},
			hasMore  : true,
			lastKey  : 'lastKey',
			lastValue: 500,
		};

		const expectedEnrichedPage = {
			data: [
				{
					title            : 'Blueprint 1',
					imgurId          : 'img1',
					imgurType        : 'image/png',
					numberOfFavorites: 10,
					lastUpdatedDate  : 1000,
					key              : 'key1',
					thumbnail        : 'https://i.imgur.com/img1b.png',
				},
				{
					title            : 'Blueprint 2',
					imgurId          : 'img2',
					imgurType        : 'image/jpeg',
					numberOfFavorites: 20,
					lastUpdatedDate  : 2000,
					key              : 'key2',
					thumbnail        : 'https://i.imgur.com/img2b.jpeg',
				},
			],
			hasMore  : true,
			lastKey  : 'lastKey',
			lastValue: 500,
		};

		const result = enrichBlueprintSummaryPage(rawPage);
		expect(result).to.deep.equal(expectedEnrichedPage);
	});

	it('should handle empty data object', () =>
	{
		const rawPage: any = {
			data     : {},
			hasMore  : false,
			lastKey  : null,
			lastValue: null,
		};

		const expectedEnrichedPage = {
			data     : [],
			hasMore  : false,
			lastKey  : null,
			lastValue: null,
		};

		const result = enrichBlueprintSummaryPage(rawPage);
		expect(result).to.deep.equal(expectedEnrichedPage);
	});

	it('should throw validation error for invalid raw data', () =>
	{
		const invalidRawPage: any = {
			// Missing required fields
			data: { key1: { title: 'Test' } },
		};

		expect(() => enrichBlueprintSummaryPage(invalidRawPage))
			.toThrow(/Invalid raw blueprint summary page/);
	});

	it('should handle summaries without optional fields', () =>
	{
		const rawPage: any = {
			data: {
				key1: {
					title            : 'Blueprint 1',
					imgurId          : 'img1',
					imgurType        : 'image/png',
					numberOfFavorites: 10,
					// No lastUpdatedDate, height, or width
				},
			},
			hasMore  : false,
			lastKey  : null,
			lastValue: null,
		};

		const expectedEnrichedPage = {
			data: [
				{
					title            : 'Blueprint 1',
					imgurId          : 'img1',
					imgurType        : 'image/png',
					numberOfFavorites: 10,
					key              : 'key1',
					thumbnail        : 'https://i.imgur.com/img1b.png',
				},
			],
			hasMore  : false,
			lastKey  : null,
			lastValue: null,
		};

		const result = enrichBlueprintSummaryPage(rawPage);
		expect(result).to.deep.equal(expectedEnrichedPage);
	});
});

describe('enrichPaginatedBlueprintSummaries', () =>
{
	it('should return null if input is null', () =>
	{
		const result = enrichPaginatedBlueprintSummaries(null);
		expect(result).toBeNull();
	});

	it('should transform raw paginated data into enriched paginated data', () =>
	{
		const rawPaginated: any = {
			pages: [
				{
					data: {
						key1: {
							title            : 'Test 1',
							imgurId          : 'img1',
							imgurType        : 'image/png',
							numberOfFavorites: 5,
						},
					},
					hasMore  : true,
					lastKey  : 'key1',
					lastValue: 1000,
				},
				{
					data: {
						key2: {
							title            : 'Test 2',
							imgurId          : 'img2',
							imgurType        : 'image/jpeg',
							numberOfFavorites: 10,
						},
					},
					hasMore  : false,
					lastKey  : null,
					lastValue: null,
				},
			],
			pageParams: [null, { key: 'key1', value: 1000 }],
		};

		const expectedEnrichedPaginated = {
			pages: [
				{
					data: [
						{
							title            : 'Test 1',
							imgurId          : 'img1',
							imgurType        : 'image/png',
							numberOfFavorites: 5,
							key              : 'key1',
							thumbnail        : 'https://i.imgur.com/img1b.png',
						},
					],
					hasMore  : true,
					lastKey  : 'key1',
					lastValue: 1000,
				},
				{
					data: [
						{
							title            : 'Test 2',
							imgurId          : 'img2',
							imgurType        : 'image/jpeg',
							numberOfFavorites: 10,
							key              : 'key2',
							thumbnail        : 'https://i.imgur.com/img2b.jpeg',
						},
					],
					hasMore  : false,
					lastKey  : null,
					lastValue: null,
				},
			],
			pageParams: [null, { key: 'key1', value: 1000 }],
		};

		const result = enrichPaginatedBlueprintSummaries(rawPaginated);
		expect(result).to.deep.equal(expectedEnrichedPaginated);
	});

	it('should handle empty pages array', () =>
	{
		const rawPaginated: any = {
			pages     : [],
			pageParams: [],
		};

		const expectedEnrichedPaginated = {
			pages     : [],
			pageParams: [],
		};

		const result = enrichPaginatedBlueprintSummaries(rawPaginated);
		expect(result).to.deep.equal(expectedEnrichedPaginated);
	});

	it('should handle paginated data without pageParams', () =>
	{
		const rawPaginated: any = {
			pages: [
				{
					data: {
						key1: {
							title            : 'Test 1',
							imgurId          : 'img1',
							imgurType        : 'image/png',
							numberOfFavorites: 5,
						},
					},
					hasMore  : false,
					lastKey  : null,
					lastValue: null,
				},
			],
			// pageParams is optional
		};

		const expectedEnrichedPaginated = {
			pages: [
				{
					data: [
						{
							title            : 'Test 1',
							imgurId          : 'img1',
							imgurType        : 'image/png',
							numberOfFavorites: 5,
							key              : 'key1',
							thumbnail        : 'https://i.imgur.com/img1b.png',
						},
					],
					hasMore  : false,
					lastKey  : null,
					lastValue: null,
				},
			],
			pageParams: undefined,
		};

		const result = enrichPaginatedBlueprintSummaries(rawPaginated);
		expect(result).to.deep.equal(expectedEnrichedPaginated);
	});

	it('should throw validation error for invalid raw data', () =>
	{
		const invalidRawPaginated: any = {
			// Missing required 'pages' field
			pageParams: [],
		};

		expect(() => enrichPaginatedBlueprintSummaries(invalidRawPaginated))
			.toThrow(/Invalid raw paginated blueprint summaries/);
	});

	it('should handle pages with empty data objects', () =>
	{
		const rawPaginated: any = {
			pages: [
				{
					data     : {}, // Empty data object
					hasMore  : false,
					lastKey  : null,
					lastValue: null,
				},
			],
			pageParams: [null],
		};

		const expectedEnrichedPaginated = {
			pages: [
				{
					data     : [],
					hasMore  : false,
					lastKey  : null,
					lastValue: null,
				},
			],
			pageParams: [null],
		};

		const result = enrichPaginatedBlueprintSummaries(rawPaginated);
		expect(result).to.deep.equal(expectedEnrichedPaginated);
	});

	it('should preserve original structure when enriching multiple pages', () =>
	{
		const rawPaginated: any = {
			pages: [
				{
					data: {
						blueprint1: {
							title            : 'Blueprint 1',
							imgurId          : 'img1',
							imgurType        : 'image/png',
							numberOfFavorites: 1,
						},
						blueprint2: {
							title            : 'Blueprint 2',
							imgurId          : 'img2',
							imgurType        : 'image/jpeg',
							numberOfFavorites: 2,
						},
					},
					hasMore  : true,
					lastKey  : 'blueprint2',
					lastValue: 2000,
				},
				{
					data: {
						blueprint3: {
							title            : 'Blueprint 3',
							imgurId          : 'img3',
							imgurType        : 'image/gif',
							numberOfFavorites: 3,
						},
					},
					hasMore  : false,
					lastKey  : null,
					lastValue: null,
				},
			],
			pageParams: [null, { key: 'blueprint2', value: 2000 }],
		};

		const expectedEnrichedPaginated = {
			pages: [
				{
					data: [
						{
							title            : 'Blueprint 1',
							imgurId          : 'img1',
							imgurType        : 'image/png',
							numberOfFavorites: 1,
							key              : 'blueprint1',
							thumbnail        : 'https://i.imgur.com/img1b.png',
						},
						{
							title            : 'Blueprint 2',
							imgurId          : 'img2',
							imgurType        : 'image/jpeg',
							numberOfFavorites: 2,
							key              : 'blueprint2',
							thumbnail        : 'https://i.imgur.com/img2b.jpeg',
						},
					],
					hasMore  : true,
					lastKey  : 'blueprint2',
					lastValue: 2000,
				},
				{
					data: [
						{
							title            : 'Blueprint 3',
							imgurId          : 'img3',
							imgurType        : 'image/gif',
							numberOfFavorites: 3,
							key              : 'blueprint3',
							thumbnail        : 'https://i.imgur.com/img3b.gif',
						},
					],
					hasMore  : false,
					lastKey  : null,
					lastValue: null,
				},
			],
			pageParams: [null, { key: 'blueprint2', value: 2000 }],
		};

		const result = enrichPaginatedBlueprintSummaries(rawPaginated);
		expect(result).to.deep.equal(expectedEnrichedPaginated);
	});

	it('should handle page with null values in pagination metadata', () =>
	{
		const rawPaginated: any = {
			pages: [
				{
					data: {
						key1: {
							title            : 'Test 1',
							imgurId          : 'img1',
							imgurType        : 'image/png',
							numberOfFavorites: 5,
						},
					},
					hasMore  : false,
					lastKey  : null,
					lastValue: null,
				},
			],
			pageParams: [null],
		};

		const expectedEnrichedPaginated = {
			pages: [
				{
					data: [
						{
							title            : 'Test 1',
							imgurId          : 'img1',
							imgurType        : 'image/png',
							numberOfFavorites: 5,
							key              : 'key1',
							thumbnail        : 'https://i.imgur.com/img1b.png',
						},
					],
					hasMore  : false,
					lastKey  : null,
					lastValue: null,
				},
			],
			pageParams: [null],
		};

		const result = enrichPaginatedBlueprintSummaries(rawPaginated);
		expect(result).to.deep.equal(expectedEnrichedPaginated);
	});
});
