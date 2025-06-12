import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	resolveImgurUrl,
	ImgurResolverError,
	isRetryableError,
	getErrorMessage,
	type ResolvedImgurImage,
	type ImgurResolverResponse
} from './imgurResolver';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('imgurResolver - Core Functionality', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('resolveImgurUrl - Basic Success Cases', () => {
		it('should resolve valid image data', async () => {
			const mockImageData: ResolvedImgurImage = {
				id: 'abc123',
				type: 'image/jpeg',
				extension: 'jpg',
				width: 800,
				height: 600,
				title: 'Test Image',
				isFromAlbum: false,
				warnings: []
			};

			const mockResponse: ImgurResolverResponse = {
				success: true,
				data: mockImageData
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			});

			const result = await resolveImgurUrl('https://imgur.com/abc123');

			expect(result).toEqual(mockImageData);
			expect(mockFetch).toHaveBeenCalledWith(
				'https://factorio-blueprint-playground.pages.dev/imgur-resolver',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ url: 'https://imgur.com/abc123' }),
					signal: expect.any(AbortSignal)
				}
			);
		});

		it('should handle album image data', async () => {
			const mockImageData: ResolvedImgurImage = {
				id: 'def456',
				type: 'image/png',
				extension: 'png',
				width: 1920,
				height: 1080,
				title: 'Album Image',
				isFromAlbum: true,
				warnings: ['Image selected from album']
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					data: mockImageData
				})
			});

			const result = await resolveImgurUrl('https://imgur.com/a/album123');

			expect(result.isFromAlbum).toBe(true);
			expect(result.warnings).toContain('Image selected from album');
		});

		it('should trim whitespace from URL', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					data: {
						id: 'abc123',
						type: 'image/jpeg',
						extension: 'jpg',
						isFromAlbum: false,
						warnings: []
					}
				})
			});

			await resolveImgurUrl('  https://imgur.com/abc123  ');

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: JSON.stringify({ url: 'https://imgur.com/abc123' })
				})
			);
		});
	});

	describe('resolveImgurUrl - Input Validation', () => {
		it('should reject null/undefined URL', async () => {
			await expect(resolveImgurUrl(null as any)).rejects.toThrow(ImgurResolverError);
			await expect(resolveImgurUrl(undefined as any)).rejects.toThrow(ImgurResolverError);
		});

		it('should reject non-string URL', async () => {
			await expect(resolveImgurUrl(123 as any)).rejects.toThrow(ImgurResolverError);
		});

		it('should reject empty URL', async () => {
			await expect(resolveImgurUrl('')).rejects.toThrow(ImgurResolverError);
			await expect(resolveImgurUrl('   ')).rejects.toThrow(ImgurResolverError);
		});
	});

	describe('resolveImgurUrl - HTTP Error Handling', () => {
		it('should handle 404 not found errors', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: () => Promise.resolve({ error: 'Image not found' })
			});

			try {
				await resolveImgurUrl('https://imgur.com/notfound');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ImgurResolverError);
				expect((error as ImgurResolverError).code).toBe('NOT_FOUND');
			}
		});

		it('should handle 403 access denied errors', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 403,
				json: () => Promise.resolve({ error: 'Access denied' })
			});

			try {
				await resolveImgurUrl('https://imgur.com/private');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ImgurResolverError);
				expect((error as ImgurResolverError).code).toBe('ACCESS_DENIED');
			}
		});

		it('should handle API error responses', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					success: false,
					error: 'Invalid URL format'
				})
			});

			try {
				await resolveImgurUrl('https://imgur.com/invalid', { retries: 0 });
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ImgurResolverError);
				expect((error as ImgurResolverError).code).toBe('API_ERROR');
			}
		});

		it('should handle missing image data in response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					data: null
				})
			});

			try {
				await resolveImgurUrl('https://imgur.com/abc123');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ImgurResolverError);
				expect((error as ImgurResolverError).code).toBe('INVALID_RESPONSE');
			}
		});

		it('should handle incomplete image data', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					data: {
						id: 'abc123',
						// Missing required type and extension fields
						isFromAlbum: false,
						warnings: []
					}
				})
			});

			try {
				await resolveImgurUrl('https://imgur.com/abc123');
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(ImgurResolverError);
				expect((error as ImgurResolverError).code).toBe('INVALID_RESPONSE');
			}
		});
	});

	describe('resolveImgurUrl - Custom Options', () => {
		it('should use custom API endpoint', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					data: {
						id: 'abc123',
						type: 'image/jpeg',
						extension: 'jpg',
						isFromAlbum: false,
						warnings: []
					}
				})
			});

			await resolveImgurUrl('https://imgur.com/abc123', {
				apiEndpoint: 'https://custom-api.example.com/resolve'
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://custom-api.example.com/resolve',
				expect.any(Object)
			);
		});
	});

	describe('isRetryableError', () => {
		it('should identify retryable errors', () => {
			expect(isRetryableError(new ImgurResolverError('Server error', 'API_ERROR'))).toBe(true);
			expect(isRetryableError(new ImgurResolverError('Timeout', 'TIMEOUT'))).toBe(true);
			expect(isRetryableError(new ImgurResolverError('Network error', 'NETWORK_ERROR'))).toBe(true);
			expect(isRetryableError(new TypeError('Network error'))).toBe(true);
		});

		it('should identify non-retryable errors', () => {
			expect(isRetryableError(new ImgurResolverError('Not found', 'NOT_FOUND'))).toBe(false);
			expect(isRetryableError(new ImgurResolverError('Access denied', 'ACCESS_DENIED'))).toBe(false);
			expect(isRetryableError(new ImgurResolverError('Invalid response', 'INVALID_RESPONSE'))).toBe(false);
		});

		it('should handle unknown error types', () => {
			expect(isRetryableError(new Error('Unknown error'))).toBe(false);
			expect(isRetryableError('string error' as any)).toBe(false);
		});
	});

	describe('getErrorMessage', () => {
		it('should return user-friendly messages for known error types', () => {
			expect(getErrorMessage(new ImgurResolverError('Not found', 'NOT_FOUND')))
				.toBe('Image not found. Please check the URL and try again.');

			expect(getErrorMessage(new ImgurResolverError('Access denied', 'ACCESS_DENIED')))
				.toBe('This image is private or has been deleted.');

			expect(getErrorMessage(new ImgurResolverError('Timeout', 'TIMEOUT')))
				.toBe('Request timed out. Please try again.');

			expect(getErrorMessage(new ImgurResolverError('Network error', 'NETWORK_ERROR')))
				.toBe('Network error. Please check your connection and try again.');

			expect(getErrorMessage(new ImgurResolverError('Invalid response', 'INVALID_RESPONSE')))
				.toBe('Invalid response from server. Please try again later.');

			expect(getErrorMessage(new ImgurResolverError('Custom error', 'API_ERROR')))
				.toBe('Custom error');
		});

		it('should handle unknown error types', () => {
			expect(getErrorMessage(new Error('Unknown error')))
				.toBe('An unexpected error occurred. Please try again.');

			expect(getErrorMessage('string error'))
				.toBe('An unexpected error occurred. Please try again.');
		});
	});
});
