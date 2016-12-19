import noImageAvailable from '../gif/No_available_image.gif';

const buildImageUrl = ({imageUrl, thumbnail, image}, suffix) =>
{
	if (image)
	{
		const typeParts = image.type.split('/');
		return `http://i.imgur.com/${image.id}${suffix}.${typeParts[1]}`;
	}
	return thumbnail || imageUrl || noImageAvailable;
};

export default buildImageUrl;
