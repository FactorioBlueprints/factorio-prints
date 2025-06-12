import { describe, it, expect } from 'vitest';
import {
	validateRawBlueprint,
	validateRawBlueprintSummary,
	type RawBlueprint,
	type RawBlueprintSummary
} from './schemas';

describe('Enhanced Image Schema Compatibility', () => {
	describe('RawBlueprint with enhanced image metadata', () => {
		it('should accept blueprint with basic image data (backward compatibility)', () => {
			const blueprintWithBasicImage: RawBlueprint = {
				title: 'Test Blueprint',
				blueprintString: 'test-string',
				createdDate: 1234567890,
				descriptionMarkdown: 'Test description',
				lastUpdatedDate: 1234567890,
				numberOfFavorites: 0,
				tags: [],
				author: {
					userId: 'user123',
					displayName: 'Test User'
				},
				image: {
					id: 'abc123',
					type: 'image/png'
				},
				favorites: {}
			};

			expect(() => validateRawBlueprint(blueprintWithBasicImage)).not.toThrow();
		});

		it('should accept blueprint with enhanced image metadata', () => {
			const blueprintWithEnhancedImage: RawBlueprint = {
				title: 'Test Blueprint',
				blueprintString: 'test-string',
				createdDate: 1234567890,
				descriptionMarkdown: 'Test description',
				lastUpdatedDate: 1234567890,
				numberOfFavorites: 0,
				tags: [],
				author: {
					userId: 'user123',
					displayName: 'Test User'
				},
				image: {
					id: 'abc123',
					type: 'image/jpeg',
					width: 800,
					height: 600,
					extension: 'jpg',
					title: 'My Blueprint Screenshot',
					isFromAlbum: false,
					warnings: ['High resolution image']
				},
				favorites: {}
			};

			expect(() => validateRawBlueprint(blueprintWithEnhancedImage)).not.toThrow();
		});

		it('should accept blueprint with partial enhanced metadata', () => {
			const blueprintWithPartialEnhanced: RawBlueprint = {
				title: 'Test Blueprint',
				blueprintString: 'test-string',
				createdDate: 1234567890,
				descriptionMarkdown: 'Test description',
				lastUpdatedDate: 1234567890,
				numberOfFavorites: 0,
				tags: [],
				author: {
					userId: 'user123',
					displayName: 'Test User'
				},
				image: {
					id: 'abc123',
					type: 'image/gif',
					extension: 'gif',
					isFromAlbum: true
					// Missing other optional fields
				},
				favorites: {}
			};

			expect(() => validateRawBlueprint(blueprintWithPartialEnhanced)).not.toThrow();
		});
	});

	describe('RawBlueprintSummary with enhanced image metadata', () => {
		it('should accept summary with basic image data (backward compatibility)', () => {
			const summaryWithBasicImage: RawBlueprintSummary = {
				title: 'Test Blueprint',
				imgurId: 'abc123',
				imgurType: 'image/png',
				numberOfFavorites: 5
			};

			expect(() => validateRawBlueprintSummary(summaryWithBasicImage)).not.toThrow();
		});

		it('should accept summary with enhanced image metadata', () => {
			const summaryWithEnhanced: RawBlueprintSummary = {
				title: 'Test Blueprint',
				imgurId: 'abc123',
				imgurType: 'image/jpeg',
				numberOfFavorites: 5,
				lastUpdatedDate: 1234567890,
				height: 600,
				width: 800,
				imgurExtension: 'jpg',
				imgurTitle: 'My Blueprint Screenshot',
				imgurIsFromAlbum: false
			};

			expect(() => validateRawBlueprintSummary(summaryWithEnhanced)).not.toThrow();
		});

		it('should accept summary with partial enhanced metadata', () => {
			const summaryWithPartial: RawBlueprintSummary = {
				title: 'Test Blueprint',
				imgurId: 'abc123',
				imgurType: 'image/webp',
				numberOfFavorites: 5,
				imgurExtension: 'webp'
				// Missing other optional enhanced fields
			};

			expect(() => validateRawBlueprintSummary(summaryWithPartial)).not.toThrow();
		});
	});
});
