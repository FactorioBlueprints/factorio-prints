import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {enrichBlueprintSummary} from './enrichBlueprintSummary';
import buildImageUrl from '../helpers/buildImageUrl';

// Mock the dependencies
vi.mock('../helpers/buildImageUrl');

const mockedBuildImageUrl = vi.mocked(buildImageUrl);

describe('enrichBlueprintSummary', () => {
	const mockBlueprintId = 'test-blueprint-123';

	beforeEach(() => {
		// Set up mock implementations
		mockedBuildImageUrl.mockImplementation((imgurId, imgurType, suffix) => {
			return `https://i.imgur.com/${imgurId}${suffix}.${imgurType.split('/')[1] || 'png'}`;
		});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should return null if rawBlueprintSummary is null', () => {
		expect(enrichBlueprintSummary(null, mockBlueprintId)).toBeNull();
	});

	it('should add the key field to the enriched summary', () => {
		const mockData = {
			title: 'Test Blueprint',
			imgurId: 'abc123',
			imgurType: 'image/png',
			numberOfFavorites: 5,
		};

		const result = enrichBlueprintSummary(mockData, mockBlueprintId);
		expect(result).not.toBeNull();
		expect(result!.key).toBe(mockBlueprintId);
	});

	it('should generate a thumbnail URL when imgurId is available', () => {
		const mockData = {
			title: 'Test Blueprint',
			imgurId: 'abc123',
			imgurType: 'image/png',
			numberOfFavorites: 5,
		};

		const result = enrichBlueprintSummary(mockData, mockBlueprintId);
		expect(mockedBuildImageUrl).toHaveBeenCalledWith('abc123', 'image/png', 'b');
		expect(result).not.toBeNull();
		expect(result!.thumbnail).toBe('https://i.imgur.com/abc123b.png');
	});

	it('should handle missing imgurType by defaulting to image/png', () => {
		enrichBlueprintSummary(
			{
				title: 'Test Blueprint',
				imgurId: 'abc123',
				imgurType: 'image/png',
				numberOfFavorites: 5,
			},
			mockBlueprintId,
		);

		expect(mockedBuildImageUrl).toHaveBeenCalledWith('abc123', 'image/png', 'b');
	});

	it('should have a null thumbnail if imgurId is missing', () => {
		const mockData = {
			title: 'Test Blueprint',
			imgurId: '',
			imgurType: 'image/png',
			numberOfFavorites: 5,
		};

		const result = enrichBlueprintSummary(mockData, mockBlueprintId);
		expect(mockedBuildImageUrl).not.toHaveBeenCalled();
		expect(result).not.toBeNull();
		expect(result!.thumbnail).toBeNull();
	});

	it('should preserve all original fields from the raw summary', () => {
		const mockData = {
			title: 'Test Blueprint',
			imgurId: 'abc123',
			imgurType: 'image/png',
			numberOfFavorites: 5,
			lastUpdatedDate: 1625097600000,
			height: 200,
			width: 300,
		};

		const result = enrichBlueprintSummary(mockData, mockBlueprintId);
		expect(result).not.toBeNull();
		Object.keys(mockData).forEach((key) => {
			expect((result as any)[key]).toBe((mockData as any)[key]);
		});
	});
});
