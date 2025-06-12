import { describe, it, expect } from 'vitest';
import {
	parseImgurUrl,
	isValidImgurUrl,
	extractImgurId,
	normalizeImgurUrl,
	type ParsedImgurUrl
} from './parseImgurUrl';

describe('parseImgurUrl', () => {
	describe('Input validation', () => {
		it('should reject null/undefined input', () => {
			expect(parseImgurUrl(null as any)).toEqual({
				success: false,
				error: 'URL is required and must be a string'
			});

			expect(parseImgurUrl(undefined as any)).toEqual({
				success: false,
				error: 'URL is required and must be a string'
			});
		});

		it('should reject non-string input', () => {
			expect(parseImgurUrl(123 as any)).toEqual({
				success: false,
				error: 'URL is required and must be a string'
			});

			expect(parseImgurUrl({} as any)).toEqual({
				success: false,
				error: 'URL is required and must be a string'
			});
		});

		it('should reject empty string', () => {
			// Empty string is falsy and gets caught by first condition
			expect(parseImgurUrl('')).toEqual({
				success: false,
				error: 'URL is required and must be a string'
			});

			// Whitespace-only string gets trimmed to empty
			expect(parseImgurUrl('   ')).toEqual({
				success: false,
				error: 'URL cannot be empty'
			});
		});

		it('should reject invalid URL format', () => {
			expect(parseImgurUrl('not-a-url')).toEqual({
				success: false,
				error: 'Invalid URL format'
			});

			expect(parseImgurUrl('http://[invalid')).toEqual({
				success: false,
				error: 'Invalid URL format'
			});
		});

		it('should reject non-Imgur domains', () => {
			expect(parseImgurUrl('https://example.com/abc123')).toEqual({
				success: false,
				error: 'URL must be from imgur.com domain'
			});

			expect(parseImgurUrl('https://reddit.com/abc123')).toEqual({
				success: false,
				error: 'URL must be from imgur.com domain'
			});
		});
	});

	describe('Direct image URLs (i.imgur.com)', () => {
		it('should parse direct JPEG image URL', () => {
			const result = parseImgurUrl('https://i.imgur.com/abc123.jpg');

			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				id: 'abc123',
				type: 'jpg',
				isDirect: true,
				isFromAlbum: false,
				normalizedUrl: 'https://i.imgur.com/abc123.jpg',
				warnings: []
			});
		});

		it('should parse direct PNG image URL', () => {
			const result = parseImgurUrl('https://i.imgur.com/xyz789.png');

			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				id: 'xyz789',
				type: 'png',
				isDirect: true,
				isFromAlbum: false,
				normalizedUrl: 'https://i.imgur.com/xyz789.png',
				warnings: []
			});
		});

		it('should parse direct GIF image URL', () => {
			const result = parseImgurUrl('https://i.imgur.com/def456.gif');

			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				id: 'def456',
				type: 'gif',
				isDirect: true,
				isFromAlbum: false,
				normalizedUrl: 'https://i.imgur.com/def456.gif',
				warnings: []
			});
		});

		it('should parse direct WebP image URL', () => {
			const result = parseImgurUrl('https://i.imgur.com/ghi789.webp');

			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				id: 'ghi789',
				type: 'webp',
				isDirect: true,
				isFromAlbum: false,
				normalizedUrl: 'https://i.imgur.com/ghi789.webp',
				warnings: []
			});
		});

		it('should handle various ID lengths', () => {
			// 5 characters (minimum)
			const result5 = parseImgurUrl('https://i.imgur.com/ab123.jpg');
			expect(result5.success).toBe(true);
			expect(result5.data?.id).toBe('ab123');

			// 7 characters (typical)
			const result7 = parseImgurUrl('https://i.imgur.com/abcde12.jpg');
			expect(result7.success).toBe(true);
			expect(result7.data?.id).toBe('abcde12');

			// 10 characters (maximum)
			const result10 = parseImgurUrl('https://i.imgur.com/abcdefgh12.jpg');
			expect(result10.success).toBe(true);
			expect(result10.data?.id).toBe('abcdefgh12');
		});

		it('should warn about unusual ID lengths', () => {
			// Too short
			const resultShort = parseImgurUrl('https://i.imgur.com/ab12.jpg');
			expect(resultShort.success).toBe(true);
			expect(resultShort.data?.warnings).toContain('Image ID length is outside typical range (5-10 characters)');

			// Too long
			const resultLong = parseImgurUrl('https://i.imgur.com/abcdefghijk.jpg');
			expect(resultLong.success).toBe(true);
			expect(resultLong.data?.warnings).toContain('Image ID length is outside typical range (5-10 characters)');
		});

		it('should reject invalid direct image URL format', () => {
			expect(parseImgurUrl('https://i.imgur.com/invalid')).toEqual({
				success: false,
				error: 'Invalid direct image URL format'
			});

			expect(parseImgurUrl('https://i.imgur.com/123/abc.jpg')).toEqual({
				success: false,
				error: 'Invalid direct image URL format'
			});
		});
	});

	describe('Gallery/page URLs (imgur.com)', () => {
		it('should parse simple gallery URL', () => {
			const result = parseImgurUrl('https://imgur.com/abc123');

			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				id: 'abc123',
				type: undefined,
				isDirect: false,
				isFromAlbum: false,
				normalizedUrl: 'https://imgur.com/abc123',
				warnings: []
			});
		});

		it('should parse gallery URL with mixed case', () => {
			const result = parseImgurUrl('https://imgur.com/AbC123');

			expect(result.success).toBe(true);
			expect(result.data?.id).toBe('AbC123');
		});

		it('should handle URL with query parameters', () => {
			const result = parseImgurUrl('https://imgur.com/abc123?utm_source=test');

			expect(result.success).toBe(true);
			expect(result.data?.id).toBe('abc123');
		});

		it('should reject invalid gallery URL format', () => {
			expect(parseImgurUrl('https://imgur.com/abc123/extra')).toEqual({
				success: false,
				error: 'Invalid Imgur URL format'
			});

			expect(parseImgurUrl('https://imgur.com/')).toEqual({
				success: false,
				error: 'Invalid Imgur URL format'
			});
		});
	});

	describe('Album URLs', () => {
		it('should parse album URL with /a/ prefix', () => {
			const result = parseImgurUrl('https://imgur.com/a/abc123');

			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				id: 'abc123',
				type: undefined,
				isDirect: false,
				isFromAlbum: true,
				normalizedUrl: 'https://imgur.com/abc123',
				warnings: ['Album URL detected - will use first image']
			});
		});

		it('should parse gallery album URL with /gallery/ prefix', () => {
			const result = parseImgurUrl('https://imgur.com/gallery/abc123');

			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				id: 'abc123',
				type: undefined,
				isDirect: false,
				isFromAlbum: true,
				normalizedUrl: 'https://imgur.com/abc123',
				warnings: ['Album URL detected - will use first image']
			});
		});

		it('should handle album URL with hash fragment', () => {
			const result = parseImgurUrl('https://imgur.com/a/abc123#def456');

			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				id: 'def456',
				type: undefined,
				isDirect: false,
				isFromAlbum: true,
				normalizedUrl: 'https://imgur.com/def456',
				warnings: ['Detected hash fragment in album URL - using hash as image ID']
			});
		});

		it('should ignore invalid hash fragments', () => {
			const result = parseImgurUrl('https://imgur.com/a/abc123#invalid-hash!');

			expect(result.success).toBe(true);
			expect(result.data?.id).toBe('abc123');
			// Invalid hash fragments are ignored
			expect(result.data?.warnings).toEqual([]);
		});
	});

	describe('Mobile URLs (m.imgur.com)', () => {
		it('should parse mobile gallery URL', () => {
			const result = parseImgurUrl('https://m.imgur.com/abc123');

			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				id: 'abc123',
				type: undefined,
				isDirect: false,
				isFromAlbum: false,
				normalizedUrl: 'https://imgur.com/abc123',
				warnings: []
			});
		});

		it('should parse mobile album URL', () => {
			const result = parseImgurUrl('https://m.imgur.com/a/abc123');

			expect(result.success).toBe(true);
			expect(result.data?.id).toBe('abc123');
			expect(result.data?.isFromAlbum).toBe(true);
		});
	});

	describe('Edge cases and error handling', () => {
		it('should handle URLs with trailing slashes', () => {
			const result = parseImgurUrl('https://imgur.com/abc123/');
			expect(result.success).toBe(false);
		});

		it('should handle HTTP URLs (not just HTTPS)', () => {
			const result = parseImgurUrl('http://imgur.com/abc123');

			expect(result.success).toBe(true);
			expect(result.data?.id).toBe('abc123');
		});

		it('should trim whitespace from input', () => {
			const result = parseImgurUrl('  https://imgur.com/abc123  ');

			expect(result.success).toBe(true);
			expect(result.data?.id).toBe('abc123');
		});

		it('should handle special characters in ID', () => {
			// Imgur IDs are alphanumeric only
			const result = parseImgurUrl('https://imgur.com/abc-123');
			expect(result.success).toBe(false);
		});
	});
});

describe('isValidImgurUrl', () => {
	it('should return true for valid URLs', () => {
		expect(isValidImgurUrl('https://imgur.com/abc123')).toBe(true);
		expect(isValidImgurUrl('https://i.imgur.com/abc123.jpg')).toBe(true);
		expect(isValidImgurUrl('https://imgur.com/a/abc123')).toBe(true);
	});

	it('should return false for invalid URLs', () => {
		expect(isValidImgurUrl('invalid')).toBe(false);
		expect(isValidImgurUrl('https://example.com/abc123')).toBe(false);
		expect(isValidImgurUrl('')).toBe(false);
	});
});

describe('extractImgurId', () => {
	it('should extract ID from valid URLs', () => {
		expect(extractImgurId('https://imgur.com/abc123')).toBe('abc123');
		expect(extractImgurId('https://i.imgur.com/def456.jpg')).toBe('def456');
		expect(extractImgurId('https://imgur.com/a/ghi789')).toBe('ghi789');
		expect(extractImgurId('https://imgur.com/a/abc123#def456')).toBe('def456');
	});

	it('should return null for invalid URLs', () => {
		expect(extractImgurId('invalid')).toBe(null);
		expect(extractImgurId('https://example.com/abc123')).toBe(null);
		expect(extractImgurId('')).toBe(null);
	});
});

describe('normalizeImgurUrl', () => {
	it('should normalize URLs to standard format', () => {
		expect(normalizeImgurUrl('https://imgur.com/abc123')).toBe('https://imgur.com/abc123');
		expect(normalizeImgurUrl('https://i.imgur.com/def456.jpg')).toBe('https://i.imgur.com/def456.jpg');
		expect(normalizeImgurUrl('https://imgur.com/a/ghi789')).toBe('https://imgur.com/ghi789');
		expect(normalizeImgurUrl('https://m.imgur.com/abc123')).toBe('https://imgur.com/abc123');
	});

	it('should return null for invalid URLs', () => {
		expect(normalizeImgurUrl('invalid')).toBe(null);
		expect(normalizeImgurUrl('https://example.com/abc123')).toBe(null);
		expect(normalizeImgurUrl('')).toBe(null);
	});
});
