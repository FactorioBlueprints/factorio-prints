import buildImageUrl from '../helpers/buildImageUrl';
import { validateRawBlueprintSummary, validateEnrichedBlueprintSummary, type RawBlueprintSummary, type EnrichedBlueprintSummary } from '../schemas';

/**
 * Enriches a raw blueprint summary with additional computed fields
 */
export const enrichBlueprintSummary = (rawBlueprintSummary: RawBlueprintSummary | null, blueprintId: string): EnrichedBlueprintSummary | null =>
{
	if (!rawBlueprintSummary) return null;

	validateRawBlueprintSummary(rawBlueprintSummary);

	let thumbnail: string | null = null;
	if (rawBlueprintSummary.imgurId)
	{
		const imgurId = rawBlueprintSummary.imgurId;
		if (rawBlueprintSummary.imgurExtension)
		{
			thumbnail = buildImageUrl(imgurId, {
				resolvedData: {
					id        : rawBlueprintSummary.imgurId,
					type      : rawBlueprintSummary.imgurType || 'image/png',
					extension : rawBlueprintSummary.imgurExtension,
					width     : rawBlueprintSummary.width,
					height    : rawBlueprintSummary.height,
					isFromAlbum: rawBlueprintSummary.imgurIsFromAlbum || false,
					warnings  : [],
				}
			}, 'b');
		}
		else
		{
			const imgurType = rawBlueprintSummary.imgurType || 'image/png';
			thumbnail = buildImageUrl(imgurId, imgurType, 'b');
		}
	}

	const enrichedBlueprintSummary = {
		...rawBlueprintSummary,
		key: blueprintId,
		thumbnail,
	};

	return validateEnrichedBlueprintSummary(enrichedBlueprintSummary);
};

export default enrichBlueprintSummary;
