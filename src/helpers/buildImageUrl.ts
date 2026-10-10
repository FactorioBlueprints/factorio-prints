// Images are read through the Factorio Prints image gateway, which serves the R2 copy of each Imgur
// image and falls back to Imgur only for images not copied yet. Reading i.imgur.com directly fails
// wherever Imgur is blocked, such as the UK.
const defaultImageGatewayOrigin = process.env.REACT_APP_IMAGE_GATEWAY_ORIGIN || 'https://images.factorioprints.com';

const gatewayVariants: Readonly<Record<string, string>> = {
	'': 'original',
	b: 'thumbnail',
	l: 'large',
};

const imageExtensions: Readonly<Record<string, string>> = {
	'image/gif': 'gif',
	'image/jpeg': 'jpeg',
	'image/jpg': 'jpg',
	'image/png': 'png',
};

function buildImageUrl(
	imgurId: string,
	imgurType: string,
	suffix: string,
	gatewayOrigin: string = defaultImageGatewayOrigin,
): string {
	const variant = gatewayVariants[suffix];
	if (variant === undefined) {
		throw new Error(`The image gateway has no Imgur size "${suffix}"`);
	}
	const extension = imageExtensions[imgurType] ?? 'png';
	return `${gatewayOrigin}/legacy-imgur/${imgurId}/${variant}.${extension}`;
}

export default buildImageUrl;
