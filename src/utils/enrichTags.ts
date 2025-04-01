import { validateRawTags, validateEnrichedTags, type RawTags, type EnrichedTags, type EnrichedTag } from '../schemas';

/**
 * Converts a tag name to a display-friendly label
 * Examples:
 * - "balancer" -> "Balancer"
 * - "oil processing" -> "Oil Processing"
 * - "left-hand-drive" -> "Left-Hand-Drive"
 * - "express transport belt (blue)" -> "Express Transport Belt (Blue)"
 */
const tagNameToLabel = (tagName: string): string =>
{
	// Split by spaces to handle multi-word tags
	return tagName
		.split(' ')
		.map(word =>
		{
			// Split by hyphens within each word
			return word
				.split('-')
				.map(part =>
				{
					// Capitalize first letter of each part
					// Special handling for parts in parentheses
					if (part.startsWith('(') && part.endsWith(')'))
					{
						const inner = part.slice(1, -1);
						return `(${inner.charAt(0).toUpperCase() + inner.slice(1)})`;
					}
					return part.charAt(0).toUpperCase() + part.slice(1);
				})
				.join('-');
		})
		.join(' ');
};

/**
 * Enriches raw tags from Firebase into a flat array of enriched tag objects
 * @param rawTags - The raw tags object from Firebase with categories as keys and tag arrays as values
 * @returns An array of enriched tag objects with path, category, name, and label
 */
export const enrichTags = (rawTags: RawTags | null): EnrichedTags =>
{
	if (!rawTags) return [];

	validateRawTags(rawTags);

	const enrichedTags: EnrichedTag[] = [];

	// Process each category and its tags
	Object.entries(rawTags).forEach(([category, tags]) =>
	{
		tags.forEach(tagName =>
		{
			const enrichedTag: EnrichedTag = {
				path    : `/${category}/${tagName}/`,
				category: category,
				name    : tagName,
				label   : tagNameToLabel(tagName),
			};
			enrichedTags.push(enrichedTag);
		});
	});

	// Sort by category first, then by tag name for consistent ordering
	enrichedTags.sort((a, b) =>
	{
		if (a.category !== b.category)
		{
			return a.category.localeCompare(b.category);
		}
		return a.name.localeCompare(b.name);
	});

	return validateEnrichedTags(enrichedTags);
};

export default enrichTags;
