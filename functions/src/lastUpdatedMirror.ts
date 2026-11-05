/**
 * Decides what to write to /blueprints/{id}/lastUpdatedDate after /blueprintSummaries/{id}/lastUpdatedDate changes.
 *
 * The client stamps both records with separate serverTimestamp() values, so they differ by milliseconds or
 * seconds. The CDN copy is compared against the summary, so the blueprint must carry the summary's value.
 * Returns null when there is nothing to write, including when the blueprint no longer exists, so a late
 * trigger never recreates a deleted blueprint.
 */
export const planBlueprintLastUpdatedMirror = (
	summaryLastUpdated: unknown,
	blueprintLastUpdated: unknown,
): number | null =>
{
	if (typeof summaryLastUpdated !== "number" || typeof blueprintLastUpdated !== "number")
	{
		return null;
	}
	return summaryLastUpdated === blueprintLastUpdated ? null : summaryLastUpdated;
};
