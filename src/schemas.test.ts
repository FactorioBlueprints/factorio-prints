import {describe, expect, it, vi} from 'vitest';
import {z} from 'zod';
import {
	validate,
	validateEnrichedBlueprint,
	validateEnrichedBlueprintSummary,
	validateEnrichedBlueprintSummaries,
	validateEnrichedPaginatedBlueprintSummaries,
	validateRawBlueprintSummaryPage,
	validateRawPaginatedBlueprintSummaries,
	enrichedBlueprintSchema,
	enrichedBlueprintSummarySchema,
	enrichedBlueprintSummariesSchema,
	enrichedPaginatedBlueprintSummariesSchema,
	rawBlueprintSchema,
	rawBlueprintSummarySchema,
	rawBlueprintSummaryPageSchema,
	rawPaginatedBlueprintSummariesSchema,
	rawTagsSchema,
	enrichedTagSchema,
	enrichedTagsSchema,
	validateRawTags,
	validateEnrichedTags,
	validateRawUser,
	validateEnrichedUser,
	validateRawUserBlueprints,
	validateEnrichedUserBlueprints,
	validateRawUserFavorites,
	validateEnrichedUserFavorites,
} from './schemas';

describe('Schema validation', () => {
	describe('validate function', () => {
		it('should validate valid data without errors', () => {
			const mockSchema = {parse: vi.fn((data) => data)};
			const mockData = {test: 'data'};

			const result = validate(mockData, mockSchema as any, 'test data');

			expect(mockSchema.parse).toHaveBeenCalledWith(mockData);
			expect(result).toEqual(mockData);
		});

		it('should throw error with description for invalid data', () => {
			const mockError = new Error('Validation error') as any;
			mockError.errors = ['error details'];

			const mockSchema = {
				parse: vi.fn(() => {
					throw mockError;
				}),
			};

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			expect(() => validate({test: 'invalid'}, mockSchema as any, 'test data')).toThrow(
				'Invalid test data: Validation error',
			);

			expect(consoleSpy).toHaveBeenCalledTimes(1);

			consoleSpy.mockRestore();
		});

		it('should handle ZodError with detailed error information', () => {
			const zodError = {
				errors: [
					{
						path: ['field1', 'nested'],
						message: 'Invalid type',
						code: 'invalid_type',
					},
					{
						path: ['field2'],
						message: 'Required',
						code: 'required',
					},
				],
			};
			Object.setPrototypeOf(zodError, z.ZodError.prototype);

			const mockSchema = {
				parse: vi.fn(() => {
					throw zodError;
				}),
			};

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			expect(() => validate({test: 'invalid'}, mockSchema as any, 'test data')).toThrow(
				'Invalid test data: field1.nested: Invalid type, field2: Required',
			);

			expect(consoleSpy).toHaveBeenCalledWith(
				'Schema validation failed',
				expect.objectContaining({
					description: 'test data',
					errorCount: 2,
					errors: [
						{path: 'field1.nested', message: 'Invalid type', code: 'invalid_type'},
						{path: 'field2', message: 'Required', code: 'required'},
					],
					dataType: 'object',
					dataKeys: ['test'],
				}),
			);

			consoleSpy.mockRestore();
		});
	});

	describe('raw schemas', () => {
		it('should validate a raw blueprint summary', () => {
			const fakeRawSummary = {
				title: 'Test Blueprint',
				imgurId: 'img123',
				imgurType: 'image/png',
				numberOfFavorites: 5,
				lastUpdatedDate: 1625097600000,
				height: 200,
				width: 300,
			};

			expect(() => rawBlueprintSummarySchema.parse(fakeRawSummary)).not.toThrow();

			const invalidRawSummary = {
				...fakeRawSummary,
				extraField: 'should fail strict validation',
			};

			expect(() => rawBlueprintSummarySchema.parse(invalidRawSummary)).toThrow();
		});

		it('should validate a raw blueprint', () => {
			const fakeRawBlueprint = {
				title: 'Test Blueprint',
				blueprintString: 'base64string',
				createdDate: 1625097600000,
				descriptionMarkdown: 'Description',
				lastUpdatedDate: 1625097600000,
				numberOfFavorites: 0,
				tags: ['tag1', 'tag2'],
				author: {
					userId: 'user123',
					displayName: 'Test User',
				},
				image: {
					id: 'img123',
					type: 'image/png',
				},
				favorites: {},
			};

			expect(() => rawBlueprintSchema.parse(fakeRawBlueprint)).not.toThrow();

			const invalidRawBlueprint = {
				...fakeRawBlueprint,
				unexpectedField: 'should fail',
			};

			expect(() => rawBlueprintSchema.parse(invalidRawBlueprint)).toThrow();
		});

		it('should validate a raw blueprint summary page', () => {
			const fakeRawPage = {
				data: {
					key1: {
						title: 'Test Blueprint 1',
						imgurId: 'img123',
						imgurType: 'image/png',
						numberOfFavorites: 5,
						lastUpdatedDate: 1625097600000,
						height: 200,
						width: 300,
					},
					key2: {
						title: 'Test Blueprint 2',
						imgurId: 'img456',
						imgurType: 'image/jpeg',
						numberOfFavorites: 10,
						lastUpdatedDate: 1625097700000,
					},
				},
				lastKey: 'key2',
				lastValue: 1625097700000,
				hasMore: true,
			};

			expect(() => rawBlueprintSummaryPageSchema.parse(fakeRawPage)).not.toThrow();

			const invalidRawPage = {
				...fakeRawPage,
				unexpectedField: 'should fail',
			};

			expect(() => rawBlueprintSummaryPageSchema.parse(invalidRawPage)).toThrow();
		});

		it('should validate raw paginated blueprint summaries', () => {
			const fakeRawPaginated = {
				pages: [
					{
						data: {
							key1: {
								title: 'Test Blueprint 1',
								imgurId: 'img123',
								imgurType: 'image/png',
								numberOfFavorites: 5,
								lastUpdatedDate: 1625097600000,
							},
						},
						lastKey: 'key1',
						lastValue: 1625097600000,
						hasMore: true,
					},
					{
						data: {
							key2: {
								title: 'Test Blueprint 2',
								imgurId: 'img456',
								imgurType: 'image/jpeg',
								numberOfFavorites: 10,
								lastUpdatedDate: 1625097500000,
							},
						},
						lastKey: 'key2',
						lastValue: 1625097500000,
						hasMore: false,
					},
				],
				pageParams: [null, {key: 'key1', value: 1625097600000}],
			};

			expect(() => rawPaginatedBlueprintSummariesSchema.parse(fakeRawPaginated)).not.toThrow();

			// Test with missing required fields
			const invalidPaginated = {
				pages: [
					{
						data: {},
						// Missing lastKey, lastValue, hasMore
					},
				],
			};

			expect(() => rawPaginatedBlueprintSummariesSchema.parse(invalidPaginated)).toThrow();
		});
	});

	describe('validateEnrichedBlueprint', () => {
		it('should validate a valid enriched blueprint', () => {
			const mockBlueprint = {
				title: 'Test Blueprint',
				blueprintString: 'base64string',
				createdDate: 1625097600000,
				descriptionMarkdown: 'Description',
				lastUpdatedDate: 1625097600000,
				numberOfFavorites: 0,
				tags: {tag1: true, tag2: true},
				author: {
					userId: 'user123',
					displayName: 'Test User',
				},
				image: {
					id: 'img123',
					type: 'image/png',
				},
				favorites: {},
				renderedDescription: '<p>Description</p>',
				key: 'key123',
				thumbnail: 'https://i.imgur.com/img123b.png',
				parsedData: null,
			};

			const validateSpy = vi.spyOn(enrichedBlueprintSchema, 'parse').mockReturnValue(mockBlueprint);

			const result = validateEnrichedBlueprint(mockBlueprint);

			expect(result).toEqual(mockBlueprint);
			expect(validateSpy).toHaveBeenCalledWith(mockBlueprint);

			validateSpy.mockRestore();
		});
	});

	describe('validateEnrichedBlueprintSummary', () => {
		it('should validate a valid blueprint summary', () => {
			const mockSummary = {
				key: 'key123',
				title: 'Test Blueprint',
				imgurId: 'img123',
				imgurType: 'image/png',
				numberOfFavorites: 5,
				lastUpdatedDate: 1625097600000,
				height: 200,
				width: 300,
				thumbnail: 'https://i.imgur.com/img123b.png',
			};

			const validateSpy = vi.spyOn(enrichedBlueprintSummarySchema, 'parse').mockReturnValue(mockSummary);

			const result = validateEnrichedBlueprintSummary(mockSummary);

			expect(result).toEqual(mockSummary);
			expect(validateSpy).toHaveBeenCalledWith(mockSummary);

			validateSpy.mockRestore();
		});

		it('should reject blueprint summary with unexpected fields', () => {
			const mockSummary = {
				key: 'key123',
				title: 'Test Blueprint',
				imgurId: 'img123',
				imgurType: 'image/png',
				numberOfFavorites: 5,
				lastUpdatedDate: 1625097600000,
				height: 200,
				width: 300,
				thumbnail: 'https://i.imgur.com/img123b.png',
				extraField: 'should fail',
			};

			expect(() => enrichedBlueprintSummarySchema.parse(mockSummary)).toThrow();
		});
	});

	describe('validateEnrichedBlueprintSummaries', () => {
		it('should validate an array of blueprint summaries', () => {
			const mockSummaries = [
				{
					key: 'key1',
					title: 'Blueprint 1',
					imgurId: 'img1',
					imgurType: 'image/png',
					numberOfFavorites: 5,
					lastUpdatedDate: 1625097600000,
					height: 200,
					width: 300,
					thumbnail: 'https://i.imgur.com/img1b.png',
				},
				{
					key: 'key2',
					title: 'Blueprint 2',
					imgurId: 'img2',
					imgurType: 'image/png',
					numberOfFavorites: 10,
					lastUpdatedDate: 1625097700000,
					height: 400,
					width: 500,
					thumbnail: 'https://i.imgur.com/img2b.png',
				},
			];

			const validateSpy = vi.spyOn(enrichedBlueprintSummariesSchema, 'parse').mockReturnValue(mockSummaries);

			const result = validateEnrichedBlueprintSummaries(mockSummaries);

			expect(result).toEqual(mockSummaries);
			expect(validateSpy).toHaveBeenCalledWith(mockSummaries);

			validateSpy.mockRestore();
		});
	});

	describe('validateEnrichedPaginatedBlueprintSummaries', () => {
		it('should validate paginated blueprint summaries', () => {
			const mockPaginatedData = {
				pages: [
					{
						data: [
							{
								key: 'key1',
								title: 'Blueprint 1',
								imgurId: 'img1',
								imgurType: 'image/png',
								numberOfFavorites: 5,
								lastUpdatedDate: 1625097600000,
								height: 200,
								width: 300,
								thumbnail: 'https://i.imgur.com/img1b.png',
							},
						],
						lastKey: 'key1',
						lastValue: 1625097600000,
						hasMore: true,
					},
					{
						data: [
							{
								key: 'key2',
								title: 'Blueprint 2',
								imgurId: 'img2',
								imgurType: 'image/png',
								numberOfFavorites: 10,
								lastUpdatedDate: 1625097500000,
								thumbnail: 'https://i.imgur.com/img2b.png',
							},
						],
						lastKey: 'key2',
						lastValue: 1625097500000,
						hasMore: false,
					},
				],
				pageParams: [null, {key: 'key1', value: 1625097600000}],
			};

			const validateSpy = vi
				.spyOn(enrichedPaginatedBlueprintSummariesSchema, 'parse')
				.mockReturnValue(mockPaginatedData);

			const result = validateEnrichedPaginatedBlueprintSummaries(mockPaginatedData);

			expect(result).toEqual(mockPaginatedData);
			expect(validateSpy).toHaveBeenCalledWith(mockPaginatedData);

			validateSpy.mockRestore();
		});
	});

	describe('validateRawBlueprintSummaryPage', () => {
		it('should validate a valid raw blueprint summary page', () => {
			const fakePage = {
				data: {
					key1: {
						title: 'Test Blueprint',
						imgurId: 'img123',
						imgurType: 'image/png',
						numberOfFavorites: 5,
						lastUpdatedDate: 1625097600000,
					},
				},
				lastKey: 'key1',
				lastValue: 1625097600000,
				hasMore: false,
			};

			const result = validateRawBlueprintSummaryPage(fakePage);
			expect(result).toEqual(fakePage);
		});

		it('should throw error for invalid page structure', () => {
			const invalidPage = {
				data: {
					key1: {
						title: 'Missing required fields',
						// Missing imgurId, imgurType, numberOfFavorites
					},
				},
				lastKey: 'key1',
				lastValue: 1625097600000,
				hasMore: false,
			};

			expect(() => validateRawBlueprintSummaryPage(invalidPage)).toThrow('Invalid raw blueprint summary page');
		});
	});

	describe('validateRawPaginatedBlueprintSummaries', () => {
		it('should validate valid raw paginated blueprint summaries', () => {
			const fakePaginatedData = {
				pages: [
					{
						data: {
							key1: {
								title: 'Test Blueprint',
								imgurId: 'img123',
								imgurType: 'image/png',
								numberOfFavorites: 5,
								lastUpdatedDate: 1625097600000,
							},
						},
						lastKey: 'key1',
						lastValue: 1625097600000,
						hasMore: false,
					},
				],
				pageParams: [null],
			};

			const result = validateRawPaginatedBlueprintSummaries(fakePaginatedData);
			expect(result).toEqual(fakePaginatedData);
		});

		it('should validate paginated data without pageParams', () => {
			const fakePaginatedData = {
				pages: [
					{
						data: {},
						lastKey: null,
						lastValue: null,
						hasMore: false,
					},
				],
			};

			const result = validateRawPaginatedBlueprintSummaries(fakePaginatedData);
			expect(result).toEqual(fakePaginatedData);
		});

		it('should throw error for missing pages array', () => {
			const invalidData = {
				// Missing pages array
				pageParams: [],
			};

			expect(() => validateRawPaginatedBlueprintSummaries(invalidData)).toThrow(
				'Invalid raw paginated blueprint summaries',
			);
		});

		describe('tag schemas', () => {
			describe('rawTagsSchema', () => {
				it('should validate valid raw tags data', () => {
					const validRawTags = {
						belt: ['balancer', 'bus', 'loader'],
						production: ['science', 'smelting', 'mining', 'oil processing'],
						power: ['nuclear', 'solar', 'steam'],
						train: ['junction', 'station', 'stacker'],
						circuit: ['clock', 'counter', 'display'],
						mods: ['vanilla', 'bobs', 'angels'],
					};

					expect(() => rawTagsSchema.parse(validRawTags)).not.toThrow();
					const result = validateRawTags(validRawTags);
					expect(result).toEqual(validRawTags);
				});

				it('should validate empty raw tags', () => {
					const emptyTags = {};
					expect(() => rawTagsSchema.parse(emptyTags)).not.toThrow();
					const result = validateRawTags(emptyTags);
					expect(result).toEqual(emptyTags);
				});

				it('should validate single category with tags', () => {
					const singleCategory = {
						belt: ['balancer', 'express transport belt (blue)'],
					};
					expect(() => rawTagsSchema.parse(singleCategory)).not.toThrow();
				});

				it('should reject non-string tag names', () => {
					const invalidTags = {
						belt: ['balancer', 123, 'bus'], // Number in array
					};
					expect(() => rawTagsSchema.parse(invalidTags)).toThrow();
				});

				it('should reject non-array values', () => {
					const invalidTags = {
						belt: 'balancer', // String instead of array
					};
					expect(() => rawTagsSchema.parse(invalidTags)).toThrow();
				});

				it('should reject nested objects', () => {
					const invalidTags = {
						belt: {balancer: true}, // Object instead of array
					};
					expect(() => rawTagsSchema.parse(invalidTags)).toThrow();
				});

				it('should handle real-world tag data from tags.json', () => {
					const realWorldTags = {
						belt: [
							'balancer',
							'bus',
							'express transport belt (blue)',
							'fast transport belt (red)',
							'loader',
							'transport belt (yellow)',
						],
						circuit: [
							'clock',
							'combinator',
							'counter',
							'display',
							'indicator',
							'memory cell',
							'power switch',
						],
						general: [
							'beaconized',
							'book',
							'compact',
							'early game',
							'late game (megabase)',
							'mid game',
							'modular',
							'safe',
							'tileable',
							'tricks',
							'upgradeable',
						],
						meta: ['copypasta', 'tutorial'],
						mods: [
							'angels',
							'bobs',
							'creative',
							'expensive',
							'factorissimo',
							'lighted-electric-poles',
							'other',
							'vanilla',
							'warehousing',
						],
						other: ['art', 'defenses', 'storage'],
						power: ['accumulator', 'kovarex enrichment', 'nuclear', 'solar', 'steam'],
						production: [
							'advanced circuit (red)',
							'batteries',
							'belts',
							'circuits',
							'coal liquification',
							'electronic circuit (green)',
							'fluids',
							'guns and ammo',
							'inserters',
							'mall (make everything)',
							'mining',
							'modules',
							'oil processing',
							'plastic',
							'processing unit (blue)',
							'research (labs)',
							'robots',
							'rocket parts',
							'science',
							'smelting',
							'uranium',
						],
						train: [
							'crossing',
							'junction',
							'left-hand-drive',
							'loading station',
							'multi-station',
							'pax',
							'right-hand-drive',
							'roundabout',
							'stacker',
							'unloading station',
						],
						version: ['0,14', '0,15'],
					};

					expect(() => rawTagsSchema.parse(realWorldTags)).not.toThrow();
					const result = validateRawTags(realWorldTags);
					expect(result).toEqual(realWorldTags);
				});
			});

			describe('enrichedTagSchema', () => {
				it('should validate valid enriched tag', () => {
					const validTag = {
						path: '/belt/balancer/',
						category: 'belt',
						name: 'balancer',
						label: 'Balancer',
					};

					expect(() => enrichedTagSchema.parse(validTag)).not.toThrow();
				});

				it('should reject tag with missing fields', () => {
					const missingPath = {
						category: 'belt',
						name: 'balancer',
						label: 'Balancer',
					};
					expect(() => enrichedTagSchema.parse(missingPath)).toThrow();

					const missingCategory = {
						path: '/belt/balancer/',
						name: 'balancer',
						label: 'Balancer',
					};
					expect(() => enrichedTagSchema.parse(missingCategory)).toThrow();

					const missingName = {
						path: '/belt/balancer/',
						category: 'belt',
						label: 'Balancer',
					};
					expect(() => enrichedTagSchema.parse(missingName)).toThrow();

					const missingLabel = {
						path: '/belt/balancer/',
						category: 'belt',
						name: 'balancer',
					};
					expect(() => enrichedTagSchema.parse(missingLabel)).toThrow();
				});

				it('should reject tag with extra fields due to strict mode', () => {
					const extraField = {
						path: '/belt/balancer/',
						category: 'belt',
						name: 'balancer',
						label: 'Balancer',
						description: 'This should fail',
					};
					expect(() => enrichedTagSchema.parse(extraField)).toThrow();
				});

				it('should reject non-string field values', () => {
					const invalidTypes = {
						path: 123, // Should be string
						category: 'belt',
						name: 'balancer',
						label: 'Balancer',
					};
					expect(() => enrichedTagSchema.parse(invalidTypes)).toThrow();
				});

				it('should validate real-world tag examples', () => {
					const realWorldExamples = [
						{
							path: '/production/science/',
							category: 'production',
							name: 'science',
							label: 'Science',
						},
						{
							path: '/belt/express transport belt (blue)/',
							category: 'belt',
							name: 'express transport belt (blue)',
							label: 'Express Transport Belt (Blue)',
						},
						{
							path: '/train/left-hand-drive/',
							category: 'train',
							name: 'left-hand-drive',
							label: 'Left-Hand-Drive',
						},
						{
							path: '/power/kovarex enrichment/',
							category: 'power',
							name: 'kovarex enrichment',
							label: 'Kovarex Enrichment',
						},
					];

					realWorldExamples.forEach((tag) => {
						expect(() => enrichedTagSchema.parse(tag)).not.toThrow();
					});
				});
			});

			describe('enrichedTagsSchema', () => {
				it('should validate array of enriched tags', () => {
					const validTags = [
						{
							path: '/belt/balancer/',
							category: 'belt',
							name: 'balancer',
							label: 'Balancer',
						},
						{
							path: '/production/science/',
							category: 'production',
							name: 'science',
							label: 'Science',
						},
						{
							path: '/train/junction/',
							category: 'train',
							name: 'junction',
							label: 'Junction',
						},
					];

					expect(() => enrichedTagsSchema.parse(validTags)).not.toThrow();
					const result = validateEnrichedTags(validTags);
					expect(result).toEqual(validTags);
				});

				it('should validate empty array', () => {
					const emptyArray: any[] = [];
					expect(() => enrichedTagsSchema.parse(emptyArray)).not.toThrow();
					const result = validateEnrichedTags(emptyArray);
					expect(result).toEqual(emptyArray);
				});

				it('should reject non-array values', () => {
					const notArray = {path: '/belt/balancer/', category: 'belt', name: 'balancer', label: 'Balancer'};
					expect(() => enrichedTagsSchema.parse(notArray)).toThrow();
				});

				it('should reject array with invalid tag objects', () => {
					const invalidArray = [
						{
							path: '/belt/balancer/',
							category: 'belt',
							name: 'balancer',
							label: 'Balancer',
						},
						{
							// Missing required fields
							path: '/production/science/',
						},
					];
					expect(() => enrichedTagsSchema.parse(invalidArray)).toThrow();
				});

				it('should reject array with non-object elements', () => {
					const mixedArray = [
						{
							path: '/belt/balancer/',
							category: 'belt',
							name: 'balancer',
							label: 'Balancer',
						},
						'string element', // Not an object
						123, // Not an object
					];
					expect(() => enrichedTagsSchema.parse(mixedArray)).toThrow();
				});
			});

			describe('tag validation functions', () => {
				it('validateRawTags should provide clear error messages', () => {
					const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

					const invalidData = {
						belt: 'not an array',
					};

					expect(() => validateRawTags(invalidData)).toThrow(/Invalid raw tags/);

					expect(consoleSpy).toHaveBeenCalledWith(
						'Schema validation failed',
						expect.objectContaining({
							description: 'raw tags',
							errorCount: 1,
							errors: expect.arrayContaining([
								expect.objectContaining({
									path: 'belt',
									message: 'Expected array, received string',
									code: 'invalid_type',
								}),
							]),
							dataType: 'object',
							dataKeys: ['belt'],
						}),
					);

					consoleSpy.mockRestore();
				});

				it('validateEnrichedTags should provide clear error messages', () => {
					const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

					const invalidData = [
						{
							path: '/belt/balancer/',
							// Missing other required fields
						},
					];

					expect(() => validateEnrichedTags(invalidData)).toThrow(/Invalid enriched tags/);

					expect(consoleSpy).toHaveBeenCalledWith(
						'Schema validation failed',
						expect.objectContaining({
							description: 'enriched tags',
							errorCount: 3,
							errors: expect.arrayContaining([
								expect.objectContaining({
									path: '0.category',
									message: 'Required',
									code: 'invalid_type',
								}),
								expect.objectContaining({
									path: '0.name',
									message: 'Required',
									code: 'invalid_type',
								}),
								expect.objectContaining({
									path: '0.label',
									message: 'Required',
									code: 'invalid_type',
								}),
							]),
							dataType: 'object',
							dataKeys: ['0'],
						}),
					);

					consoleSpy.mockRestore();
				});

				it('should handle null and undefined inputs', () => {
					expect(() => validateRawTags(null as any)).toThrow();
					expect(() => validateRawTags(undefined as any)).toThrow();
					expect(() => validateEnrichedTags(null as any)).toThrow();
					expect(() => validateEnrichedTags(undefined as any)).toThrow();
				});

				it('should validate complex nested structures', () => {
					const complexRawTags = {
						'very-long-category-name-that-should-still-work': [
							'tag with spaces',
							'tag-with-dashes',
							'tag_with_underscores',
							'tag (with parentheses)',
							'tag/with/slashes',
						],
					};

					expect(() => validateRawTags(complexRawTags)).not.toThrow();
				});
			});
		});

		describe('user schemas', () => {
			describe('rawUserSchema', () => {
				it('should validate valid raw user data', () => {
					const validUser = {
						id: 'user123',
						displayName: 'John Doe',
						email: 'john@example.com',
						favorites: {
							blueprint1: true,
							blueprint2: false,
						},
						blueprints: {
							blueprint3: true,
							blueprint4: true,
						},
					};

					expect(() => validateRawUser(validUser)).not.toThrow();
				});

				it('should validate user with minimal data', () => {
					const minimalUser = {
						id: 'user123',
					};

					expect(() => validateRawUser(minimalUser)).not.toThrow();
				});

				it('should apply defaults for optional fields', () => {
					const userWithoutOptionals = {
						id: 'user123',
					};

					const result = validateRawUser(userWithoutOptionals);
					expect(result.favorites).toEqual({});
					expect(result.blueprints).toEqual({});
				});

				it('should reject user without id', () => {
					const userWithoutId = {
						displayName: 'John Doe',
					};

					expect(() => validateRawUser(userWithoutId)).toThrow();
				});

				it('should reject user with extra fields', () => {
					const userWithExtra = {
						id: 'user123',
						extraField: 'should not be allowed',
					};

					expect(() => validateRawUser(userWithExtra)).toThrow();
				});
			});

			describe('enrichedUserSchema', () => {
				it('should validate valid enriched user data', () => {
					const validEnrichedUser = {
						id: 'user123',
						displayName: 'John Doe',
						email: 'john@example.com',
						favorites: {
							blueprint1: true,
							blueprint2: false,
						},
						blueprints: {
							blueprint3: true,
							blueprint4: true,
						},
						favoritesCount: 1,
						blueprintsCount: 2,
					};

					expect(() => validateEnrichedUser(validEnrichedUser)).not.toThrow();
				});

				it('should require count fields', () => {
					const userWithoutCounts = {
						id: 'user123',
					};

					expect(() => validateEnrichedUser(userWithoutCounts)).toThrow();
				});

				it('should reject enriched user with extra fields', () => {
					const userWithExtra = {
						id: 'user123',
						favoritesCount: 0,
						blueprintsCount: 0,
						extraField: 'should not be allowed',
					};

					expect(() => validateEnrichedUser(userWithExtra)).toThrow();
				});
			});

			describe('user validation functions', () => {
				it('should handle null and undefined inputs', () => {
					expect(() => validateRawUser(null as any)).toThrow();
					expect(() => validateRawUser(undefined as any)).toThrow();
					expect(() => validateEnrichedUser(null as any)).toThrow();
					expect(() => validateEnrichedUser(undefined as any)).toThrow();
				});

				it('should validate user with empty favorites and blueprints', () => {
					const userWithEmptyRecords = {
						id: 'user123',
						favorites: {},
						blueprints: {},
						favoritesCount: 0,
						blueprintsCount: 0,
					};

					expect(() => validateEnrichedUser(userWithEmptyRecords)).not.toThrow();
				});
			});

			describe('userBlueprints schemas', () => {
				describe('rawUserBlueprintsSchema', () => {
					it('should validate valid raw user blueprints data', () => {
						const validUserBlueprints = {
							'blueprint-1': true,
							'blueprint-2': true,
							'blueprint-3': false,
						};

						expect(() => validateRawUserBlueprints(validUserBlueprints)).not.toThrow();
					});

					it('should validate empty blueprints object', () => {
						const emptyBlueprints = {};
						expect(() => validateRawUserBlueprints(emptyBlueprints)).not.toThrow();
					});

					it('should reject non-boolean values', () => {
						const invalidBlueprints = {
							'blueprint-1': true,
							'blueprint-2': 'not a boolean',
						};

						expect(() => validateRawUserBlueprints(invalidBlueprints)).toThrow();
					});

					it('should reject non-object types', () => {
						expect(() => validateRawUserBlueprints([] as any)).toThrow();
						expect(() => validateRawUserBlueprints('string' as any)).toThrow();
						expect(() => validateRawUserBlueprints(123 as any)).toThrow();
					});

					it('should validate real-world blueprint data', () => {
						const realWorldData = {
							'-KnQ865j-qQ21WoUPbd3': true,
							'-L_jADWYOzVoz7tNRFf0': true,
							'-MhFKv_xHyTpGxP5ABCD': false,
						};

						expect(() => validateRawUserBlueprints(realWorldData)).not.toThrow();
					});
				});

				describe('enrichedUserBlueprintsSchema', () => {
					it('should validate valid enriched user blueprints data', () => {
						const validEnrichedBlueprints = {
							blueprintIds: {
								'blueprint-1': true,
								'blueprint-2': true,
							},
							count: 2,
						};

						expect(() => validateEnrichedUserBlueprints(validEnrichedBlueprints)).not.toThrow();
					});

					it('should validate empty blueprints with zero count', () => {
						const emptyEnrichedBlueprints = {
							blueprintIds: {},
							count: 0,
						};

						expect(() => validateEnrichedUserBlueprints(emptyEnrichedBlueprints)).not.toThrow();
					});

					it('should reject missing count field', () => {
						const missingCount = {
							blueprintIds: {'blueprint-1': true},
						};

						expect(() => validateEnrichedUserBlueprints(missingCount)).toThrow();
					});

					it('should reject missing blueprintIds field', () => {
						const missingIds = {
							count: 5,
						};

						expect(() => validateEnrichedUserBlueprints(missingIds)).toThrow();
					});

					it('should reject extra fields due to strict mode', () => {
						const extraFields = {
							blueprintIds: {},
							count: 0,
							extraField: 'not allowed',
						};

						expect(() => validateEnrichedUserBlueprints(extraFields)).toThrow();
					});
				});
			});

			describe('userFavorites schemas', () => {
				describe('rawUserFavoritesSchema', () => {
					it('should validate valid raw user favorites data', () => {
						const validUserFavorites = {
							'blueprint-1': true,
							'blueprint-2': false,
							'blueprint-3': true,
						};

						expect(() => validateRawUserFavorites(validUserFavorites)).not.toThrow();
					});

					it('should validate empty favorites object', () => {
						const emptyFavorites = {};
						expect(() => validateRawUserFavorites(emptyFavorites)).not.toThrow();
					});

					it('should reject non-boolean values', () => {
						const invalidFavorites = {
							'blueprint-1': true,
							'blueprint-2': 1,
						};

						expect(() => validateRawUserFavorites(invalidFavorites)).toThrow();
					});

					it('should reject non-object types', () => {
						expect(() => validateRawUserFavorites(null as any)).toThrow();
						expect(() => validateRawUserFavorites(undefined as any)).toThrow();
						expect(() => validateRawUserFavorites([] as any)).toThrow();
					});

					it('should validate real-world favorite data with mixed boolean values', () => {
						const realWorldFavorites = {
							'-KnQ865j-qQ21WoUPbd3': true,
							'-L_jADWYOzVoz7tNRFf0': false,
							'-MhFKv_xHyTpGxP5ABCD': true,
							'-NjKLm_nOpQrStUvWxYZ': false,
						};

						const result = validateRawUserFavorites(realWorldFavorites);
						expect(result).toEqual(realWorldFavorites);
					});
				});

				describe('enrichedUserFavoritesSchema', () => {
					it('should validate valid enriched user favorites data', () => {
						const validEnrichedFavorites = {
							favoriteIds: {
								'blueprint-1': true,
								'blueprint-2': false,
								'blueprint-3': true,
							},
							count: 2, // Only counts true values
						};

						expect(() => validateEnrichedUserFavorites(validEnrichedFavorites)).not.toThrow();
					});

					it('should validate empty favorites with zero count', () => {
						const emptyEnrichedFavorites = {
							favoriteIds: {},
							count: 0,
						};

						expect(() => validateEnrichedUserFavorites(emptyEnrichedFavorites)).not.toThrow();
					});

					it('should reject missing count field', () => {
						const missingCount = {
							favoriteIds: {'blueprint-1': true},
						};

						expect(() => validateEnrichedUserFavorites(missingCount)).toThrow();
					});

					it('should reject missing favoriteIds field', () => {
						const missingIds = {
							count: 3,
						};

						expect(() => validateEnrichedUserFavorites(missingIds)).toThrow();
					});

					it('should reject extra fields due to strict mode', () => {
						const extraFields = {
							favoriteIds: {},
							count: 0,
							additionalData: 'not allowed',
						};

						expect(() => validateEnrichedUserFavorites(extraFields)).toThrow();
					});

					it('should reject non-number count values', () => {
						const invalidCount = {
							favoriteIds: {},
							count: '5',
						};

						expect(() => validateEnrichedUserFavorites(invalidCount)).toThrow();
					});
				});
			});

			describe('user data validation functions', () => {
				it('validateRawUserBlueprints should provide clear error messages', () => {
					const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

					const invalidData = {
						'blueprint-1': 'not a boolean',
					};

					expect(() => validateRawUserBlueprints(invalidData)).toThrow(/Invalid raw user blueprints/);

					expect(consoleSpy).toHaveBeenCalledWith(
						'Schema validation failed',
						expect.objectContaining({
							description: 'raw user blueprints',
							errorCount: 1,
							errors: expect.arrayContaining([
								expect.objectContaining({
									path: 'blueprint-1',
									message: 'Expected boolean, received string',
									code: 'invalid_type',
								}),
							]),
							dataType: 'object',
							dataKeys: ['blueprint-1'],
						}),
					);

					consoleSpy.mockRestore();
				});

				it('validateEnrichedUserFavorites should provide clear error messages', () => {
					const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

					const invalidData = {
						count: 5,
						// Missing favoriteIds
					};

					expect(() => validateEnrichedUserFavorites(invalidData)).toThrow(/Invalid enriched user favorites/);

					expect(consoleSpy).toHaveBeenCalledWith(
						'Schema validation failed',
						expect.objectContaining({
							description: 'enriched user favorites',
							errorCount: 1,
							errors: expect.arrayContaining([
								expect.objectContaining({
									path: 'favoriteIds',
									message: 'Required',
									code: 'invalid_type',
								}),
							]),
							dataType: 'object',
							dataKeys: ['count'],
						}),
					);

					consoleSpy.mockRestore();
				});
			});
		});
	});
});
