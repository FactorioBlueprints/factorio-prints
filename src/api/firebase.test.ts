import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchPaginatedSummaries, getBlueprintCdnUrl, fetchBlueprintFromCdn } from './firebase';
import { get } from 'firebase/database';
import type { EnrichedBlueprintSummary, RawBlueprint } from '../schemas';

vi.mock('firebase/database', () => ({
	ref         : vi.fn(),
	get         : vi.fn(),
	getDatabase : vi.fn(),
	query       : vi.fn(),
	orderByChild: vi.fn(),
	limitToLast : vi.fn(),
	endAt       : vi.fn(),
}));

vi.mock('../base', () => ({
	app: {},
}));

describe('firebase API', () =>
{
	describe('getBlueprintCdnUrl', () =>
	{
		it('should transform blueprint key to CDN URL format', () =>
		{
			const blueprintKey = '-KnQ865j-qQ21WoUPbd3';
			const expectedUrl = 'https://factorio-blueprint-firebase-cdn.pages.dev/-Kn/Q865j-qQ21WoUPbd3.json';

			const result = getBlueprintCdnUrl(blueprintKey);

			expect(result).toBe(expectedUrl);
		});

		it('should handle short keys correctly', () =>
		{
			const blueprintKey = 'abc';
			const expectedUrl = 'https://factorio-blueprint-firebase-cdn.pages.dev/abc/.json';

			const result = getBlueprintCdnUrl(blueprintKey);

			expect(result).toBe(expectedUrl);
		});

		it('should handle keys with special characters', () =>
		{
			const blueprintKey = '-_$defghijklmnop';
			const expectedUrl = 'https://factorio-blueprint-firebase-cdn.pages.dev/-_$/defghijklmnop.json';

			const result = getBlueprintCdnUrl(blueprintKey);

			expect(result).toBe(expectedUrl);
		});
	});

	describe('fetchBlueprintFromCdn', () =>
	{
		beforeEach(() =>
		{
			globalThis.fetch = vi.fn();
		});

		afterEach(() =>
		{
			vi.restoreAllMocks();
		});

		it('should fetch blueprint data from CDN successfully', async () =>
		{
			const mockBlueprintSummary: EnrichedBlueprintSummary = {
				key              : '-KnQ865j-qQ21WoUPbd3',
				title            : 'Test Blueprint',
				lastUpdatedDate  : 1607936203137,
				imgurId          : 'test123',
				imgurType        : 'image/png',
				numberOfFavorites: 0,
				thumbnail        : null,
			};

			const mockBlueprintData: Partial<RawBlueprint> = {
				title              : 'Test Blueprint',
				lastUpdatedDate    : 1607936203137,
				createdDate        : 1607936203137,
				blueprintString    : 'some-blueprint-string',
				descriptionMarkdown: 'Test description',
				author             : {
					userId     : 'test-user-id',
					displayName: 'Test User',
				},
				image: {
					id  : 'test123',
					type: 'image/png',
				},
			};

			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok  : true,
				json: async () => mockBlueprintData,
			} as unknown as Response);

			const result = await fetchBlueprintFromCdn(mockBlueprintSummary);

			const expectedBlueprintData: RawBlueprint = {
				title              : 'Test Blueprint',
				lastUpdatedDate    : 1607936203137,
				createdDate        : 1607936203137,
				blueprintString    : 'some-blueprint-string',
				descriptionMarkdown: 'Test description',
				author             : {
					userId     : 'test-user-id',
					displayName: 'Test User',
				},
				image: {
					id  : 'test123',
					type: 'image/png',
				},
				numberOfFavorites: 0,
				tags             : [],
				favorites        : {},
			};

			expect(globalThis.fetch).toHaveBeenCalledWith('https://factorio-blueprint-firebase-cdn.pages.dev/-Kn/Q865j-qQ21WoUPbd3.json');
			expect(result).toEqual(expectedBlueprintData);
		});

		it('should return null when blueprint summary has no key', async () =>
		{
			const mockBlueprintSummary: Partial<EnrichedBlueprintSummary> = {
				title          : 'Test Blueprint',
				lastUpdatedDate: 1607936203137,
			};

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() =>
			{});

			const result = await fetchBlueprintFromCdn(mockBlueprintSummary as any);

			expect(result).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalledWith('Blueprint summary missing key');
			expect(globalThis.fetch).not.toHaveBeenCalled();

			consoleErrorSpy.mockRestore();
		});

		it('should return null when CDN fetch returns 404 (without logging)', async () =>
		{
			const mockBlueprintSummary: EnrichedBlueprintSummary = {
				key              : '-KnQ865j-qQ21WoUPbd3',
				title            : 'Test Blueprint',
				lastUpdatedDate  : 1607936203137,
				imgurId          : 'test123',
				imgurType        : 'image/png',
				numberOfFavorites: 0,
				thumbnail        : null,
			};

			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok        : false,
				status    : 404,
				statusText: 'Not Found',
			} as unknown as Response);

			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() =>
			{});

			const result = await fetchBlueprintFromCdn(mockBlueprintSummary);

			expect(result).toBeNull();
			expect(consoleWarnSpy).not.toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});

		it('should log warning for non-404 CDN fetch errors', async () =>
		{
			const mockBlueprintSummary: EnrichedBlueprintSummary = {
				key              : '-KnQ865j-qQ21WoUPbd3',
				title            : 'Test Blueprint',
				lastUpdatedDate  : 1607936203137,
				imgurId          : 'test123',
				imgurType        : 'image/png',
				numberOfFavorites: 0,
				thumbnail        : null,
			};

			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok        : false,
				status    : 500,
				statusText: 'Internal Server Error',
			} as unknown as Response);

			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() =>
			{});

			const result = await fetchBlueprintFromCdn(mockBlueprintSummary);

			expect(result).toBeNull();
			expect(consoleWarnSpy).toHaveBeenCalledWith('CDN fetch failed for blueprint -KnQ865j-qQ21WoUPbd3: 500 Internal Server Error');

			consoleWarnSpy.mockRestore();
		});

		it('should return null when network error occurs', async () =>
		{
			const mockBlueprintSummary: EnrichedBlueprintSummary = {
				key              : '-KnQ865j-qQ21WoUPbd3',
				title            : 'Test Blueprint',
				lastUpdatedDate  : 1607936203137,
				imgurId          : 'test123',
				imgurType        : 'image/png',
				numberOfFavorites: 0,
				thumbnail        : null,
			};

			vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Network error'));

			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() =>
			{});

			const result = await fetchBlueprintFromCdn(mockBlueprintSummary);

			expect(result).toBeNull();
			// Network errors (status 0) should not be logged
			expect(consoleWarnSpy).not.toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});

		it('should return null when JSON parsing fails', async () =>
		{
			const mockBlueprintSummary: EnrichedBlueprintSummary = {
				key              : '-KnQ865j-qQ21WoUPbd3',
				title            : 'Test Blueprint',
				lastUpdatedDate  : 1607936203137,
				imgurId          : 'test123',
				imgurType        : 'image/png',
				numberOfFavorites: 0,
				thumbnail        : null,
			};

			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok  : true,
				json: async () =>
				{
					throw new Error('Invalid JSON');
				},
			} as unknown as Response);

			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() =>
			{});

			const result = await fetchBlueprintFromCdn(mockBlueprintSummary);

			expect(result).toBeNull();
			expect(consoleWarnSpy).toHaveBeenCalledWith('Error fetching blueprint from CDN:', expect.any(Error));

			consoleWarnSpy.mockRestore();
		});
	});

	describe('fetchPaginatedSummaries', () =>
	{
		it('should reverse the data returned from Firebase to display newest items first', async () =>
		{
			const mockData = {
				blueprint1: {
					title            : 'Blueprint 1',
					imgurId          : 'img1',
					imgurType        : 'image/png',
					numberOfFavorites: 5,
					lastUpdatedDate  : 300,
				},
				blueprint2: {
					title            : 'Blueprint 2',
					imgurId          : 'img2',
					imgurType        : 'image/png',
					numberOfFavorites: 3,
					lastUpdatedDate  : 200,
				},
				blueprint3: {
					title            : 'Blueprint 3',
					imgurId          : 'img3',
					imgurType        : 'image/png',
					numberOfFavorites: 1,
					lastUpdatedDate  : 100,
				},
			};

			const mockSnapshot = {
				exists : () => true,
				forEach: (callback: (child: any) => void) =>
				{
					const entries = Object.entries(mockData)
						.sort(([, a], [, b]) => a.lastUpdatedDate - b.lastUpdatedDate);

					entries.forEach(([key, value]) =>
					{
						callback({
							key,
							val: () => value,
						});
					});
				},
			};

			vi.mocked(get).mockResolvedValue(mockSnapshot as any);

			const result = await fetchPaginatedSummaries();

			const entries = Object.entries(result.data).map(([key, value]) => ({ key, ...value }));

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
