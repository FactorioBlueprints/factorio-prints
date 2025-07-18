import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {
	fetchPaginatedSummaries,
	getBlueprintCdnUrl,
	fetchBlueprintFromCdn,
	getCdnWatermarkUrl,
	fetchCdnWatermark,
	fetchBlueprint,
	clearWatermarkCache,
} from './firebase';
import {get} from 'firebase/database';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {EnrichedBlueprintSummary, RawBlueprint} from '../schemas';
import {fetchBlueprintFromCdn, fetchPaginatedSummaries, getBlueprintCdnUrl} from './firebase';

vi.mock('firebase/database', () => ({
	ref: vi.fn(),
	get: vi.fn(),
	getDatabase: vi.fn(),
	query: vi.fn(),
	orderByChild: vi.fn(),
	limitToLast: vi.fn(),
	endAt: vi.fn(),
}));

vi.mock('../base', () => ({
	app: {},
}));

describe('firebase API', () => {
	describe('getBlueprintCdnUrl', () => {
		it('should transform blueprint key to CDN URL format', () => {
			const blueprintKey = '-KnQ865j-qQ21WoUPbd3';
			const expectedUrl = 'https://factorio-blueprint-firebase-cdn.pages.dev/-Kn/Q865j-qQ21WoUPbd3.json';

			const result = getBlueprintCdnUrl(blueprintKey);

			expect(result).toBe(expectedUrl);
		});

		it('should handle short keys correctly', () => {
			const blueprintKey = 'abc';
			const expectedUrl = 'https://factorio-blueprint-firebase-cdn.pages.dev/abc/.json';

			const result = getBlueprintCdnUrl(blueprintKey);

			expect(result).toBe(expectedUrl);
		});

		it('should handle keys with special characters', () => {
			const blueprintKey = '-_$defghijklmnop';
			const expectedUrl = 'https://factorio-blueprint-firebase-cdn.pages.dev/-_$/defghijklmnop.json';

			const result = getBlueprintCdnUrl(blueprintKey);

			expect(result).toBe(expectedUrl);
		});
	});

	describe('fetchBlueprintFromCdn', () => {
		beforeEach(() => {
			globalThis.fetch = vi.fn();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should fetch blueprint data from CDN successfully', async () => {
			const mockBlueprintSummary: EnrichedBlueprintSummary = {
				key: '-KnQ865j-qQ21WoUPbd3',
				title: 'Test Blueprint',
				lastUpdatedDate: 1607936203137,
				imgurId: 'test123',
				imgurType: 'image/png',
				numberOfFavorites: 0,
				thumbnail: null,
			};

			const mockBlueprintData: Partial<RawBlueprint> = {
				title: 'Test Blueprint',
				lastUpdatedDate: 1607936203137,
				createdDate: 1607936203137,
				blueprintString: 'some-blueprint-string',
				descriptionMarkdown: 'Test description',
				author: {
					userId: 'test-user-id',
					displayName: 'Test User',
				},
				image: {
					id: 'test123',
					type: 'image/png',
				},
			};

			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockBlueprintData,
			} as unknown as Response);

			const result = await fetchBlueprintFromCdn(mockBlueprintSummary);

			const expectedBlueprintData: RawBlueprint = {
				title: 'Test Blueprint',
				lastUpdatedDate: 1607936203137,
				createdDate: 1607936203137,
				blueprintString: 'some-blueprint-string',
				descriptionMarkdown: 'Test description',
				author: {
					userId: 'test-user-id',
					displayName: 'Test User',
				},
				image: {
					id: 'test123',
					type: 'image/png',
				},
				numberOfFavorites: 0,
				tags: [],
				favorites: {},
			};

			expect(globalThis.fetch).toHaveBeenCalledWith(
				'https://factorio-blueprint-firebase-cdn.pages.dev/-Kn/Q865j-qQ21WoUPbd3.json',
			);
			expect(result).toEqual(expectedBlueprintData);
		});

		it('should return null when blueprint summary has no key', async () => {
			const mockBlueprintSummary: Partial<EnrichedBlueprintSummary> = {
				title: 'Test Blueprint',
				lastUpdatedDate: 1607936203137,
			};

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = await fetchBlueprintFromCdn(mockBlueprintSummary as any);

			expect(result).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalledWith('Blueprint summary missing key');
			expect(globalThis.fetch).not.toHaveBeenCalled();

			consoleErrorSpy.mockRestore();
		});

		it('should return null when CDN fetch returns 404 (without logging)', async () => {
			const mockBlueprintSummary: EnrichedBlueprintSummary = {
				key: '-KnQ865j-qQ21WoUPbd3',
				title: 'Test Blueprint',
				lastUpdatedDate: 1607936203137,
				imgurId: 'test123',
				imgurType: 'image/png',
				numberOfFavorites: 0,
				thumbnail: null,
			};

			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found',
			} as unknown as Response);

			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await fetchBlueprintFromCdn(mockBlueprintSummary);

			expect(result).toBeNull();
			expect(consoleWarnSpy).not.toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});

		it('should log warning for non-404 CDN fetch errors', async () => {
			const mockBlueprintSummary: EnrichedBlueprintSummary = {
				key: '-KnQ865j-qQ21WoUPbd3',
				title: 'Test Blueprint',
				lastUpdatedDate: 1607936203137,
				imgurId: 'test123',
				imgurType: 'image/png',
				numberOfFavorites: 0,
				thumbnail: null,
			};

			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
			} as unknown as Response);

			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await fetchBlueprintFromCdn(mockBlueprintSummary);

			expect(result).toBeNull();
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				'CDN fetch failed for blueprint -KnQ865j-qQ21WoUPbd3: 500 Internal Server Error',
			);

			consoleWarnSpy.mockRestore();
		});

		it('should return null when network error occurs', async () => {
			const mockBlueprintSummary: EnrichedBlueprintSummary = {
				key: '-KnQ865j-qQ21WoUPbd3',
				title: 'Test Blueprint',
				lastUpdatedDate: 1607936203137,
				imgurId: 'test123',
				imgurType: 'image/png',
				numberOfFavorites: 0,
				thumbnail: null,
			};

			vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Network error'));

			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await fetchBlueprintFromCdn(mockBlueprintSummary);

			expect(result).toBeNull();
			// Network errors (status 0) should not be logged
			expect(consoleWarnSpy).not.toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});

		it('should return null when JSON parsing fails', async () => {
			const mockBlueprintSummary: EnrichedBlueprintSummary = {
				key: '-KnQ865j-qQ21WoUPbd3',
				title: 'Test Blueprint',
				lastUpdatedDate: 1607936203137,
				imgurId: 'test123',
				imgurType: 'image/png',
				numberOfFavorites: 0,
				thumbnail: null,
			};

			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => {
					throw new Error('Invalid JSON');
				},
			} as unknown as Response);

			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await fetchBlueprintFromCdn(mockBlueprintSummary);

			expect(result).toBeNull();
			expect(consoleWarnSpy).toHaveBeenCalledWith('Error fetching blueprint from CDN:', expect.any(Error));

			consoleWarnSpy.mockRestore();
		});
	});

	describe('getCdnWatermarkUrl', () => {
		it('should return the correct watermark URL', () => {
			const expectedUrl = 'https://factorio-blueprint-firebase-cdn.pages.dev/firebase_cdn_watermark.txt';
			expect(getCdnWatermarkUrl()).toBe(expectedUrl);
		});
	});

	describe('fetchCdnWatermark', () => {
		beforeEach(() => {
			globalThis.fetch = vi.fn();
			clearWatermarkCache();
		});

		afterEach(() => {
			vi.restoreAllMocks();
			clearWatermarkCache();
		});

		it('should fetch and parse watermark date successfully', async () => {
			const mockDate = '2025-05-25T04:18:36Z';
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				text: async () => mockDate,
			} as unknown as Response);

			const result = await fetchCdnWatermark();

			expect(globalThis.fetch).toHaveBeenCalledWith(
				'https://factorio-blueprint-firebase-cdn.pages.dev/firebase_cdn_watermark.txt',
			);
			expect(result).toBeInstanceOf(Date);
			expect(result?.toISOString()).toBe('2025-05-25T04:18:36.000Z');
		});

		it('should handle network errors gracefully', async () => {
			vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Network error'));

			const result = await fetchCdnWatermark();

			expect(result).toBeNull();
		});

		it('should handle non-ok responses', async () => {
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found',
			} as unknown as Response);

			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await fetchCdnWatermark();

			expect(result).toBeNull();
			expect(consoleWarnSpy).toHaveBeenCalledWith('CDN watermark fetch failed: 404 Not Found');

			consoleWarnSpy.mockRestore();
		});

		it('should handle invalid date formats', async () => {
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				text: async () => 'not-a-valid-date',
			} as unknown as Response);

			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await fetchCdnWatermark();

			expect(result).toBeNull();
			expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid watermark date format:', 'not-a-valid-date');

			consoleWarnSpy.mockRestore();
		});

		it('should trim whitespace from date string', async () => {
			const mockDate = '  2025-05-25T04:18:36Z\n';
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				text: async () => mockDate,
			} as unknown as Response);

			const result = await fetchCdnWatermark();

			expect(result).toBeInstanceOf(Date);
			expect(result?.toISOString()).toBe('2025-05-25T04:18:36.000Z');
		});
	});

	describe('fetchBlueprint with watermark', () => {
		const mockBlueprintId = '-KnQ865j-qQ21WoUPbd3';
		const mockBlueprintSummary: EnrichedBlueprintSummary = {
			key: mockBlueprintId,
			title: 'Test Blueprint',
			lastUpdatedDate: 1727000000000, // 2024-09-22
			imgurId: 'test123',
			imgurType: 'image/png',
			numberOfFavorites: 0,
			thumbnail: null,
		};

		const mockBlueprint: RawBlueprint = {
			title: 'Test Blueprint',
			lastUpdatedDate: 1727000000000,
			createdDate: 1727000000000,
			blueprintString: 'some-blueprint-string',
			descriptionMarkdown: 'Test description',
			author: {
				userId: 'test-user-id',
				displayName: 'Test User',
			},
			image: {
				id: 'test123',
				type: 'image/png',
			},
			numberOfFavorites: 0,
			tags: [],
			favorites: {},
		};

		beforeEach(() => {
			globalThis.fetch = vi.fn();
			vi.clearAllMocks();
			clearWatermarkCache();
		});

		afterEach(() => {
			vi.restoreAllMocks();
			clearWatermarkCache();
		});

		it('should skip CDN when blueprint is newer than watermark', async () => {
			// Watermark is older than blueprint
			const watermarkDate = '2024-05-25T04:18:36Z';
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				text: async () => watermarkDate,
			} as unknown as Response);

			// Mock Firebase response
			const mockSnapshot = {
				exists: () => true,
				val: () => mockBlueprint,
			};
			vi.mocked(get).mockResolvedValue(mockSnapshot as any);

			const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const result = await fetchBlueprint(mockBlueprintId, mockBlueprintSummary);

			// Should fetch watermark
			expect(globalThis.fetch).toHaveBeenCalledTimes(1);
			expect(globalThis.fetch).toHaveBeenCalledWith(
				'https://factorio-blueprint-firebase-cdn.pages.dev/firebase_cdn_watermark.txt',
			);

			// Should NOT fetch from CDN
			expect(globalThis.fetch).not.toHaveBeenCalledWith(
				'https://factorio-blueprint-firebase-cdn.pages.dev/-Kn/Q865j-qQ21WoUPbd3.json',
			);

			// Should fetch from Firebase
			expect(get).toHaveBeenCalled();
			expect(result).toEqual(mockBlueprint);

			// Check log message
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('Blueprint -KnQ865j-qQ21WoUPbd3 is newer than CDN watermark'),
			);

			consoleLogSpy.mockRestore();
		});

		it('should try CDN when blueprint is older than watermark', async () => {
			// Watermark is newer than blueprint
			const watermarkDate = '2025-05-25T04:18:36Z';
			vi.mocked(globalThis.fetch)
				.mockResolvedValueOnce({
					ok: true,
					text: async () => watermarkDate,
				} as unknown as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockBlueprint,
				} as unknown as Response);

			const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const result = await fetchBlueprint(mockBlueprintId, mockBlueprintSummary);

			// Should fetch watermark and CDN
			expect(globalThis.fetch).toHaveBeenCalledTimes(2);
			expect(globalThis.fetch).toHaveBeenNthCalledWith(
				1,
				'https://factorio-blueprint-firebase-cdn.pages.dev/firebase_cdn_watermark.txt',
			);
			expect(globalThis.fetch).toHaveBeenNthCalledWith(
				2,
				'https://factorio-blueprint-firebase-cdn.pages.dev/-Kn/Q865j-qQ21WoUPbd3.json',
			);

			// Should NOT fetch from Firebase since CDN had matching data
			expect(get).not.toHaveBeenCalled();
			expect(result).toEqual(mockBlueprint);

			// Check log message
			expect(consoleLogSpy).toHaveBeenCalledWith('Blueprint -KnQ865j-qQ21WoUPbd3 fetched from CDN (dates match)');

			consoleLogSpy.mockRestore();
		});

		it('should try CDN when watermark fetch fails', async () => {
			// Watermark fetch fails
			vi.mocked(globalThis.fetch)
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockBlueprint,
				} as unknown as Response);

			const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const result = await fetchBlueprint(mockBlueprintId, mockBlueprintSummary);

			// Should try to fetch watermark and CDN
			expect(globalThis.fetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual(mockBlueprint);
			expect(consoleLogSpy).toHaveBeenCalledWith('Blueprint -KnQ865j-qQ21WoUPbd3 fetched from CDN (dates match)');

			consoleLogSpy.mockRestore();
		});
	});

	describe('fetchPaginatedSummaries', () => {
		it('should reverse the data returned from Firebase to display newest items first', async () => {
			const mockData = {
				blueprint1: {
					title: 'Blueprint 1',
					imgurId: 'img1',
					imgurType: 'image/png',
					numberOfFavorites: 5,
					lastUpdatedDate: 300,
				},
				blueprint2: {
					title: 'Blueprint 2',
					imgurId: 'img2',
					imgurType: 'image/png',
					numberOfFavorites: 3,
					lastUpdatedDate: 200,
				},
				blueprint3: {
					title: 'Blueprint 3',
					imgurId: 'img3',
					imgurType: 'image/png',
					numberOfFavorites: 1,
					lastUpdatedDate: 100,
				},
			};

			const mockSnapshot = {
				exists: () => true,
				forEach: (callback: (child: any) => void) => {
					const entries = Object.entries(mockData).sort(
						([, a], [, b]) => a.lastUpdatedDate - b.lastUpdatedDate,
					);

					entries.forEach(([key, value]) => {
						callback({
							key,
							val: () => value,
						});
					});
				},
			};

			vi.mocked(get).mockResolvedValue(mockSnapshot as any);

			const result = await fetchPaginatedSummaries();

			const entries = Object.entries(result.data).map(([key, value]) => ({key, ...value}));

			const sortedByDateDesc = [...entries].sort((a, b) => (b.lastUpdatedDate || 0) - (a.lastUpdatedDate || 0));

			expect(sortedByDateDesc[0].key).toBe('blueprint1'); // Newest (300) should be first
			expect(sortedByDateDesc[1].key).toBe('blueprint2'); // Second newest (200) should be second
			expect(sortedByDateDesc[2].key).toBe('blueprint3'); // Oldest (100) should be last

			expect(entries[0].key).toBe('blueprint1');
			expect(entries[1].key).toBe('blueprint2');
			expect(entries[2].key).toBe('blueprint3');
		});
	});
});
