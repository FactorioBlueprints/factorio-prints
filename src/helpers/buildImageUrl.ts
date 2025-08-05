/**
 * Builds an image URL for Imgur images
 */
const buildImageUrl = (imgurId: string, imgurType: string, suffix: string): string => {
	if (!imgurId) {
		return '/icons/entity-unknown.png';
	}

	if (!imgurType) {
		return `https://i.imgur.com/${imgurId}${suffix}.png`;
	}

	try {
		const typeParts = imgurType.split('/');
		const extension = typeParts.length > 1 ? typeParts[1] : 'png';
		return `https://i.imgur.com/${imgurId}${suffix}.${extension}`;
	} catch {
		return `https://i.imgur.com/${imgurId}${suffix}.png`;
	}
};

export default buildImageUrl;
