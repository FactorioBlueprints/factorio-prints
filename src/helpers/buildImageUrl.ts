function buildImageUrl(imgurId: string, imgurType: string, suffix: string): string {
	const typeParts: string[] = imgurType.split('/');
	return `http://i.imgur.com/${imgurId}${suffix}.${typeParts[1]}`;
}

export default buildImageUrl;
