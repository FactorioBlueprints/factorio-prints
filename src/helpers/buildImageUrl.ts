interface ResolvedImageData {
	id: string;
	type: string;
	extension: string;
	width?: number;
	height?: number;
	title?: string;
	isFromAlbum: boolean;
	warnings: string[];
}

interface BuildImageUrlOptions {
	resolvedData?: ResolvedImageData;
	imgurType?: string;
}

/**
 * Builds an image URL for Imgur images
 */
const buildImageUrl = (imgurId: string, optionsOrLegacyType: BuildImageUrlOptions | string, suffix: string): string => {
	if (!imgurId) {
		console.error('Missing imgurId in buildImageUrl');
		return '/icons/entity-unknown.png';
	}

	let options: BuildImageUrlOptions;
	if (typeof optionsOrLegacyType === 'string') {
		options = {imgurType: optionsOrLegacyType};
	} else {
		options = optionsOrLegacyType || {};
	}

	try {
		let extension = 'png';

		if (options.resolvedData?.extension) {
			extension = options.resolvedData.extension;
		} else if (options.imgurType) {
			const typeParts = options.imgurType.split('/');
			extension = typeParts.length > 1 ? typeParts[1] : 'png';
		} else {
			console.warn('No image type information provided to buildImageUrl, using default png extension');
		}

		return `https://i.imgur.com/${imgurId}${suffix}.${extension}`;
	} catch (error) {
		console.error('Error in buildImageUrl:', error);
		return `https://i.imgur.com/${imgurId}${suffix}.png`;
	}
};

export default buildImageUrl;
