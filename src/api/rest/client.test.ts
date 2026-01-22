import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {fetchEntities, fetchRecipes, fetchRestTags, fetchDuplicates} from './client';

describe('REST API client', () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('fetchWithFallback behavior', () => {
		it('should use primary URL when it succeeds', async () => {
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ['entity1', 'entity2'],
			} as unknown as Response);

			const result = await fetchEntities();

			expect(globalThis.fetch).toHaveBeenCalledTimes(1);
			expect(globalThis.fetch).toHaveBeenCalledWith('https://www.factorioprints.xyz/api/entities/');
			expect(result).toEqual(['entity1', 'entity2']);
		});

		it('should fall back to secondary URL on network error', async () => {
			vi.mocked(globalThis.fetch)
				.mockRejectedValueOnce(new TypeError('Failed to fetch'))
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ['entity1', 'entity2'],
				} as unknown as Response);

			const result = await fetchEntities();

			expect(globalThis.fetch).toHaveBeenCalledTimes(2);
			expect(globalThis.fetch).toHaveBeenNthCalledWith(1, 'https://www.factorioprints.xyz/api/entities/');
			expect(globalThis.fetch).toHaveBeenNthCalledWith(2, 'https://www.factorio.school/api/entities/');
			expect(result).toEqual(['entity1', 'entity2']);
		});

		it('should fall back to secondary URL on 502 Bad Gateway', async () => {
			vi.mocked(globalThis.fetch)
				.mockResolvedValueOnce({
					ok: false,
					status: 502,
					statusText: 'Bad Gateway',
				} as unknown as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ['entity1', 'entity2'],
				} as unknown as Response);

			const result = await fetchEntities();

			expect(globalThis.fetch).toHaveBeenCalledTimes(2);
			expect(globalThis.fetch).toHaveBeenNthCalledWith(1, 'https://www.factorioprints.xyz/api/entities/');
			expect(globalThis.fetch).toHaveBeenNthCalledWith(2, 'https://www.factorio.school/api/entities/');
			expect(result).toEqual(['entity1', 'entity2']);
		});

		it('should fall back to secondary URL on 503 Service Unavailable', async () => {
			vi.mocked(globalThis.fetch)
				.mockResolvedValueOnce({
					ok: false,
					status: 503,
					statusText: 'Service Unavailable',
				} as unknown as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ['entity1', 'entity2'],
				} as unknown as Response);

			const result = await fetchEntities();

			expect(globalThis.fetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual(['entity1', 'entity2']);
		});

		it('should fall back to secondary URL on 504 Gateway Timeout', async () => {
			vi.mocked(globalThis.fetch)
				.mockResolvedValueOnce({
					ok: false,
					status: 504,
					statusText: 'Gateway Timeout',
				} as unknown as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ['entity1', 'entity2'],
				} as unknown as Response);

			const result = await fetchEntities();

			expect(globalThis.fetch).toHaveBeenCalledTimes(2);
			expect(result).toEqual(['entity1', 'entity2']);
		});

		it('should NOT fall back on 404 Not Found (client error)', async () => {
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found',
			} as unknown as Response);

			await expect(fetchEntities()).rejects.toThrow('Failed to fetch entities: 404 Not Found');
			expect(globalThis.fetch).toHaveBeenCalledTimes(1);
		});

		it('should NOT fall back on 400 Bad Request (client error)', async () => {
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
			} as unknown as Response);

			await expect(fetchEntities()).rejects.toThrow('Failed to fetch entities: 400 Bad Request');
			expect(globalThis.fetch).toHaveBeenCalledTimes(1);
		});

		it('should throw last error when all URLs fail with network error', async () => {
			const networkError = new TypeError('Failed to fetch');
			vi.mocked(globalThis.fetch).mockRejectedValueOnce(networkError).mockRejectedValueOnce(networkError);

			await expect(fetchEntities()).rejects.toThrow('Failed to fetch');
			expect(globalThis.fetch).toHaveBeenCalledTimes(2);
		});

		it('should return last 5xx response when all URLs fail with server error', async () => {
			vi.mocked(globalThis.fetch)
				.mockResolvedValueOnce({
					ok: false,
					status: 502,
					statusText: 'Bad Gateway',
				} as unknown as Response)
				.mockResolvedValueOnce({
					ok: false,
					status: 503,
					statusText: 'Service Unavailable',
				} as unknown as Response);

			await expect(fetchEntities()).rejects.toThrow('Failed to fetch entities: 503 Service Unavailable');
			expect(globalThis.fetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('fetchEntities', () => {
		it('should parse response with Zod schema', async () => {
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ['iron-plate', 'copper-plate', 'steel-plate'],
			} as unknown as Response);

			const result = await fetchEntities();

			expect(result).toEqual(['iron-plate', 'copper-plate', 'steel-plate']);
		});
	});

	describe('fetchRecipes', () => {
		it('should fetch recipes successfully', async () => {
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ['iron-plate', 'copper-cable'],
			} as unknown as Response);

			const result = await fetchRecipes();

			expect(globalThis.fetch).toHaveBeenCalledWith('https://www.factorioprints.xyz/api/recipes/');
			expect(result).toEqual(['iron-plate', 'copper-cable']);
		});
	});

	describe('fetchRestTags', () => {
		it('should fetch tags successfully', async () => {
			const mockTags = [
				{category: 'Production', name: 'Belt'},
				{category: 'Production', name: 'Smelting'},
			];
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockTags,
			} as unknown as Response);

			const result = await fetchRestTags();

			expect(globalThis.fetch).toHaveBeenCalledWith('https://www.factorioprints.xyz/api/tags/');
			expect(result).toEqual(mockTags);
		});
	});

	describe('fetchDuplicates', () => {
		it('should fetch duplicates successfully', async () => {
			const mockDuplicates = [
				{
					key: 'blueprint1',
					title: 'Duplicate Blueprint',
					voteSummary: {numberOfUpvotes: 5},
					imgurImage: {imgurId: 'abc123', imgurType: 'image/png'},
				},
			];
			vi.mocked(globalThis.fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => mockDuplicates,
			} as unknown as Response);

			const result = await fetchDuplicates();

			expect(globalThis.fetch).toHaveBeenCalledWith('https://www.factorioprints.xyz/api/duplicates/');
			expect(result).toEqual(mockDuplicates);
		});
	});
});
