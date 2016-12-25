const buildImageUrl = (imgurId, imgurType, suffix) =>
{
	const typeParts = imgurType.split('/');
	return `http://i.imgur.com/${imgurId}${suffix}.${typeParts[1]}`;
};

export default buildImageUrl;
