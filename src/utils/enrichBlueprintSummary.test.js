import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enrichBlueprintSummary } from './enrichBlueprintSummary';
import buildImageUrl from '../helpers/buildImageUrl';
import { validateRawBlueprintSummary, validateEnrichedBlueprintSummary } from '../schemas';

// Mock the dependencies
vi.mock('../helpers/buildImageUrl');
vi.mock('../schemas');

describe('enrichBlueprintSummary', () =>
{
	const mockBlueprintId = 'test-blueprint-123';

	beforeEach(() =>
	{
		// Set up mock implementations
		buildImageUrl.mockImplementation((imgurId, imgurType, suffix) =>
		{
			return `https://i.imgur.com/${imgurId}${suffix}.${imgurType.split('/')[1] || 'png'}`;
		});

		validateRawBlueprintSummary.mockImplementation(data => data);
		validateEnrichedBlueprintSummary.mockImplementation(data => data);
	});

	afterEach(() =>
	{
		vi.resetAllMocks();
	});

	it('should return null if rawBlueprintSummary is null', () =>
	{
		expect(enrichBlueprintSummary(null, mockBlueprintId)).toBeNull();
	});

	it('should validate the raw blueprint summary data', () =>
	{
		const mockData = {
			title            : 'Test Blueprint',
			imgurId          : 'abc123',
			imgurType        : 'image/png',
			numberOfFavorites: 5,
		};

		enrichBlueprintSummary(mockData, mockBlueprintId);
		expect(validateRawBlueprintSummary).toHaveBeenCalledWith(mockData);
	});

	it('should add the key field to the enriched summary', () =>
	{
		const mockData = {
			title            : 'Test Blueprint',
			imgurId          : 'abc123',
			imgurType        : 'image/png',
			numberOfFavorites: 5,
		};

		const result = enrichBlueprintSummary(mockData, mockBlueprintId);
		expect(result.key).toBe(mockBlueprintId);
	});

	it('should generate a thumbnail URL when imgurId is available', () =>
	{
		const mockData = {
			title            : 'Test Blueprint',
			imgurId          : 'abc123',
			imgurType        : 'image/png',
			numberOfFavorites: 5,
		};

		const result = enrichBlueprintSummary(mockData, mockBlueprintId);
		expect(buildImageUrl).toHaveBeenCalledWith('abc123', 'image/png', 'b');
		expect(result.thumbnail).toBe('https://i.imgur.com/abc123b.png');
	});

	it('should handle missing imgurType by defaulting to image/png', () =>
	{
		enrichBlueprintSummary({
			title            : 'Test Blueprint',
			imgurId          : 'abc123',
			numberOfFavorites: 5,
		}, mockBlueprintId);


		expect(buildImageUrl).toHaveBeenCalledWith('abc123', 'image/png', 'b');
	});

	it('should have a null thumbnail if imgurId is missing', () =>
	{
		const mockData = {
			title            : 'Test Blueprint',
			numberOfFavorites: 5,
		};

		const result = enrichBlueprintSummary(mockData, mockBlueprintId);
		expect(buildImageUrl).not.toHaveBeenCalled();
		expect(result.thumbnail).toBeNull();
	});

	it('should validate the enriched blueprint summary data', () =>
	{
		const mockData = {
			title            : 'Test Blueprint',
			imgurId          : 'abc123',
			imgurType        : 'image/png',
			numberOfFavorites: 5,
		};

		enrichBlueprintSummary(mockData, mockBlueprintId);

		expect(validateEnrichedBlueprintSummary).toHaveBeenCalledWith(expect.objectContaining({
			...mockData,
			key      : mockBlueprintId,
			thumbnail: expect.any(String),
		}));
	});

	it('should preserve all original fields from the raw summary', () =>
	{
		const mockData = {
			title            : 'Test Blueprint',
			imgurId          : 'abc123',
			imgurType        : 'image/png',
			numberOfFavorites: 5,
			lastUpdatedDate  : 1625097600000,
			height           : 200,
			width            : 300,
		};

		const result = enrichBlueprintSummary(mockData, mockBlueprintId);
		Object.keys(mockData).forEach(key =>
		{
			expect(result[key]).toBe(mockData[key]);
		});
	});
});
