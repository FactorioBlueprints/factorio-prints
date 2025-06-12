import { describe, it, expect, vi } from 'vitest';
import buildImageUrl from './buildImageUrl';

describe('buildImageUrl', () => {
	it('should build URL with resolved image data', () => {
		const resolvedData = {
			id: 'abc123',
			type: 'image/jpeg',
			extension: 'jpg',
			width: 800,
			height: 600,
			isFromAlbum: false,
			warnings: [],
		};

		const result = buildImageUrl('abc123', { resolvedData }, 'b');
		expect(result).toBe('https://i.imgur.com/abc123b.jpg');
	});

	it('should build URL with legacy MIME type format', () => {
		const result = buildImageUrl('abc123', 'image/png', 'l');
		expect(result).toBe('https://i.imgur.com/abc123l.png');
	});

	it('should prefer resolved data over legacy MIME type', () => {
		const resolvedData = {
			id: 'abc123',
			type: 'image/gif',
			extension: 'gif',
			width: 400,
			height: 300,
			isFromAlbum: false,
			warnings: [],
		};

		const result = buildImageUrl('abc123', { resolvedData, imgurType: 'image/png' }, 'b');
		expect(result).toBe('https://i.imgur.com/abc123b.gif');
	});

	it('should fall back to MIME type extraction when resolved data missing', () => {
		const result = buildImageUrl('abc123', { imgurType: 'image/webp' }, 'l');
		expect(result).toBe('https://i.imgur.com/abc123l.webp');
	});

	it('should use default PNG extension when no type info provided', () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const result = buildImageUrl('abc123', {}, 'b');
		expect(result).toBe('https://i.imgur.com/abc123b.png');
		expect(consoleWarnSpy).toHaveBeenCalledWith('No image type information provided to buildImageUrl, using default png extension');

		consoleWarnSpy.mockRestore();
	});

	it('should handle missing imgurId gracefully', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = buildImageUrl('', 'image/png', 'b');
		expect(result).toBe('/icons/entity-unknown.png');
		expect(consoleErrorSpy).toHaveBeenCalledWith('Missing imgurId in buildImageUrl');

		consoleErrorSpy.mockRestore();
	});

	it('should handle malformed MIME type gracefully', () => {
		const result = buildImageUrl('abc123', 'not-a-mime-type', 'b');
		expect(result).toBe('https://i.imgur.com/abc123b.png');
	});

	it('should handle errors gracefully', () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		// Force an error by passing a malformed object
		const badOptions = Object.create(null);
		Object.defineProperty(badOptions, 'imgurType', {
			get() { throw new Error('Test error'); }
		});

		const result = buildImageUrl('abc123', badOptions, 'b');
		expect(result).toBe('https://i.imgur.com/abc123b.png');
		expect(consoleErrorSpy).toHaveBeenCalledWith('Error in buildImageUrl:', expect.any(Error));

		consoleErrorSpy.mockRestore();
	});

	it('should work with all common image formats', () => {
		const formats = [
			{ mime: 'image/jpeg', ext: 'jpeg' },
			{ mime: 'image/jpg', ext: 'jpg' },
			{ mime: 'image/png', ext: 'png' },
			{ mime: 'image/gif', ext: 'gif' },
			{ mime: 'image/webp', ext: 'webp' },
		];

		formats.forEach(({ mime, ext }) => {
			const resolvedData = {
				id: 'test123',
				type: mime,
				extension: ext,
				isFromAlbum: false,
				warnings: [],
			};

			const result = buildImageUrl('test123', { resolvedData }, 'b');
			expect(result).toBe(`https://i.imgur.com/test123b.${ext}`);
		});
	});
});
