import buildImageUrl from '../helpers/buildImageUrl';
import {
	validateRawBlueprintSummary,
	validateEnrichedBlueprintSummary,
	type RawBlueprintSummary,
	type EnrichedBlueprintSummary,
} from '../schemas';

/**
 * Enriches a raw blueprint summary with additional computed fields
 */
export const enrichBlueprintSummary = (
	rawBlueprintSummary: RawBlueprintSummary | null,
	blueprintId: string,
): EnrichedBlueprintSummary | null => {
	if (!rawBlueprintSummary) return null;

	validateRawBlueprintSummary(rawBlueprintSummary);

	let thumbnail: string | null = null;
	if (rawBlueprintSummary.imgurId) {
		const imgurId = rawBlueprintSummary.imgurId;
		const imgurType = rawBlueprintSummary.imgurType || 'image/png';
		thumbnail = buildImageUrl(imgurId, imgurType, 'b');
	}

	const enrichedBlueprintSummary = {
		...rawBlueprintSummary,
		key: blueprintId,
		thumbnail,
	};

	return validateEnrichedBlueprintSummary(enrichedBlueprintSummary);
};

export default enrichBlueprintSummary;
