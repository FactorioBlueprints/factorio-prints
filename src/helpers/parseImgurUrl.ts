
export interface ParsedImgurUrl {
	id: string;
	type?: string;
	isDirect: boolean;
	isFromAlbum: boolean;
	normalizedUrl: string;
	warnings: string[];
}

export interface ImgurUrlParseResult {
	success: boolean;
	data?: ParsedImgurUrl;
	error?: string;
}

export const parseImgurUrl = (url: string): ImgurUrlParseResult => {
	if (!url || typeof url !== 'string') {
		return {
			success: false,
			error: 'URL is required and must be a string'
		};
	}

	const trimmedUrl = url.trim();
	if (!trimmedUrl) {
		return {
			success: false,
			error: 'URL cannot be empty'
		};
	}

	try {
		const urlObj = new URL(trimmedUrl);

		const validDomains = ['imgur.com', 'i.imgur.com', 'm.imgur.com'];
		if (!validDomains.includes(urlObj.hostname)) {
			return {
				success: false,
				error: 'URL must be from imgur.com domain'
			};
		}

		const warnings: string[] = [];
		let id: string;
		let type: string | undefined;
		let isDirect = false;
		let isFromAlbum = false;

		if (urlObj.hostname === 'i.imgur.com') {
			const match = urlObj.pathname.match(/^\/([a-zA-Z0-9]+)\.([a-zA-Z0-9]{3,4})$/);
			if (!match) {
				return {
					success: false,
					error: 'Invalid direct image URL format'
				};
			}

			id = match[1];
			type = match[2];
			isDirect = true;
		}
		else if (urlObj.hostname === 'imgur.com' || urlObj.hostname === 'm.imgur.com') {
			const albumMatch = urlObj.pathname.match(/^\/(?:a|gallery)\/([a-zA-Z0-9]+)$/);
			if (albumMatch) {
				id = albumMatch[1];
				isFromAlbum = true;

				if (urlObj.hash) {
					const hashId = urlObj.hash.substring(1);
					if (/^[a-zA-Z0-9]+$/.test(hashId)) {
						id = hashId;
						warnings.push('Detected hash fragment in album URL - using hash as image ID');
					}
				} else {
					warnings.push('Album URL detected - will use first image');
				}
			}
			else {
				const pageMatch = urlObj.pathname.match(/^\/([a-zA-Z0-9]+)$/);
				if (!pageMatch) {
					return {
						success: false,
						error: 'Invalid Imgur URL format'
					};
				}

				id = pageMatch[1];
			}
		}
		else {
			return {
				success: false,
				error: 'Unsupported Imgur domain'
			};
		}

		if (id.length < 5 || id.length > 10) {
			warnings.push('Image ID length is outside typical range (5-10 characters)');
		}

		let normalizedUrl: string;
		if (type) {
			normalizedUrl = `https://i.imgur.com/${id}.${type}`;
		} else {
			normalizedUrl = `https://imgur.com/${id}`;
		}

		return {
			success: true,
			data: {
				id,
				type,
				isDirect,
				isFromAlbum,
				normalizedUrl,
				warnings
			}
		};
	} catch (error) {
		return {
			success: false,
			error: 'Invalid URL format'
		};
	}
};

export const isValidImgurUrl = (url: string): boolean => {
	const result = parseImgurUrl(url);
	return result.success;
};

export const extractImgurId = (url: string): string | null => {
	const result = parseImgurUrl(url);
	return result.success ? result.data!.id : null;
};

export const normalizeImgurUrl = (url: string): string | null => {
	const result = parseImgurUrl(url);
	return result.success ? result.data!.normalizedUrl : null;
};
