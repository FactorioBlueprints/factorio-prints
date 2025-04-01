/**
 * Builds an image URL for Imgur images
 */
const buildImageUrl = (imgurId: string, imgurType: string, suffix: string): string =>
{
	// Validate inputs
	if (!imgurId)
	{
		console.error('Missing imgurId in buildImageUrl');
		return '/icons/entity-unknown.png';
	}

	if (!imgurType)
	{
		console.error('Missing imgurType in buildImageUrl, using default png extension');
		return `https://i.imgur.com/${imgurId}${suffix}.png`;
	}

	try
	{
		const typeParts = imgurType.split('/');
		const extension = typeParts.length > 1 ? typeParts[1] : 'png';
		return `https://i.imgur.com/${imgurId}${suffix}.${extension}`;
	}
	catch (error)
	{
		console.error('Error in buildImageUrl:', error);
		return `https://i.imgur.com/${imgurId}${suffix}.png`;
	}
};

export default buildImageUrl;
