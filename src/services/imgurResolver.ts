export interface ResolvedImgurImage {
	id: string;
	type: string;
	extension: string;
	width?: number;
	height?: number;
	title?: string;
	isFromAlbum: boolean;
	warnings: string[];
}

export interface ImgurResolverResponse {
	success: boolean;
	data?: ResolvedImgurImage;
	error?: string;
}

export interface ImgurResolverOptions {
	timeout?: number;
	retries?: number;
	apiEndpoint?: string;
}

const DEFAULT_OPTIONS: Required<ImgurResolverOptions> = {
	timeout: 10000,
	retries: 2,
	apiEndpoint: 'https://factorio-blueprint-playground.pages.dev/imgur-resolver'
};

export class ImgurResolverError extends Error {
	constructor(
		message: string,
		public readonly code: 'NETWORK_ERROR' | 'TIMEOUT' | 'API_ERROR' | 'INVALID_RESPONSE' | 'NOT_FOUND' | 'ACCESS_DENIED'
	) {
		super(message);
		this.name = 'ImgurResolverError';
	}
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			throw new ImgurResolverError('Request timed out', 'TIMEOUT');
		}
		throw error;
	}
};

export const resolveImgurUrl = async (
	url: string,
	options: ImgurResolverOptions = {}
): Promise<ResolvedImgurImage> => {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	let lastError: Error | null = null;

	if (!url || typeof url !== 'string') {
		throw new ImgurResolverError('URL is required and must be a string', 'API_ERROR');
	}

	const trimmedUrl = url.trim();
	if (!trimmedUrl) {
		throw new ImgurResolverError('URL cannot be empty', 'API_ERROR');
	}

	for (let attempt = 0; attempt <= opts.retries; attempt++) {
		try {
			const response = await fetchWithTimeout(
				opts.apiEndpoint,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ url: trimmedUrl })
				},
				opts.timeout
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const errorMessage = errorData.error || `HTTP ${response.status}`;

				if (response.status === 404) {
					throw new ImgurResolverError('Image or album not found', 'NOT_FOUND');
				} else if (response.status === 403) {
					throw new ImgurResolverError('Access denied - image may be private', 'ACCESS_DENIED');
				} else if (response.status >= 500) {
					throw new ImgurResolverError(`Server error: ${errorMessage}`, 'API_ERROR');
				} else {
					throw new ImgurResolverError(`API error: ${errorMessage}`, 'API_ERROR');
				}
			}

			const data: ImgurResolverResponse = await response.json();

			if (!data.success) {
				const errorMessage = data.error || 'Unknown API error';

				if (errorMessage.includes('not found')) {
					throw new ImgurResolverError(errorMessage, 'NOT_FOUND');
				} else if (errorMessage.includes('Access denied') || errorMessage.includes('private')) {
					throw new ImgurResolverError(errorMessage, 'ACCESS_DENIED');
				} else if (errorMessage.includes('Invalid') || errorMessage.includes('domain')) {
					throw new ImgurResolverError(errorMessage, 'API_ERROR');
				}

				throw new ImgurResolverError(errorMessage, 'API_ERROR');
			}

			if (!data.data) {
				throw new ImgurResolverError('Invalid response: missing image data', 'INVALID_RESPONSE');
			}

			const imageData = data.data;
			if (!imageData.id || !imageData.type || !imageData.extension) {
				throw new ImgurResolverError('Invalid response: incomplete image data', 'INVALID_RESPONSE');
			}

			return imageData;

		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (error instanceof ImgurResolverError) {
				if (['NOT_FOUND', 'ACCESS_DENIED', 'INVALID_RESPONSE'].includes(error.code)) {
					throw error;
				}
			}

			if (attempt === opts.retries) {
				break;
			}

			const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
			await sleep(delay);
		}
	}

	if (lastError instanceof ImgurResolverError) {
		throw lastError;
	} else if (lastError instanceof TypeError) {
		throw new ImgurResolverError('Network error - please check your connection', 'NETWORK_ERROR');
	} else {
		throw new ImgurResolverError(
			lastError?.message || 'Failed to resolve Imgur URL after retries',
			'API_ERROR'
		);
	}
};

export const isRetryableError = (error: unknown): boolean => {
	if (error instanceof ImgurResolverError) {
		return !['NOT_FOUND', 'ACCESS_DENIED', 'INVALID_RESPONSE'].includes(error.code);
	}
	return error instanceof TypeError;
};

export const getErrorMessage = (error: unknown): string => {
	if (error instanceof ImgurResolverError) {
		switch (error.code) {
			case 'NOT_FOUND':
				return 'Image not found. Please check the URL and try again.';
			case 'ACCESS_DENIED':
				return 'This image is private or has been deleted.';
			case 'TIMEOUT':
				return 'Request timed out. Please try again.';
			case 'NETWORK_ERROR':
				return 'Network error. Please check your connection and try again.';
			case 'INVALID_RESPONSE':
				return 'Invalid response from server. Please try again later.';
			case 'API_ERROR':
			default:
				return error.message || 'Failed to resolve image URL. Please try again.';
		}
	}

	return 'An unexpected error occurred. Please try again.';
};
