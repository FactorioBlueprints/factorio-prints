import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import Blueprint from '../Blueprint';
import buildImageUrl from '../helpers/buildImageUrl';
import { validateRawBlueprint, validateEnrichedBlueprint, type RawBlueprint, type EnrichedBlueprint } from '../schemas';

const md = new MarkdownIt({
	html       : true,
	linkify    : true,
	typographer: true,
	breaks     : false,
});

const defaultTableRenderer = md.renderer.rules.table_open || function(tokens, idx, options, env, self)
{
	return self.renderToken(tokens, idx, options);
};

md.renderer.rules.table_open = function(tokens, idx, options, env, self)
{
	tokens[idx].attrSet('class', 'table table-striped table-bordered');
	return defaultTableRenderer(tokens, idx, options, env, self);
};

export const enrichBlueprint = (rawBlueprint: RawBlueprint | null, blueprintId: string): EnrichedBlueprint | null =>
{
	if (!rawBlueprint) return null;

	validateRawBlueprint(rawBlueprint);

	let thumbnail: string | null = null;
	if (rawBlueprint.image?.id)
	{
		const imgurId = rawBlueprint.image.id;
		if (rawBlueprint.image.extension)
		{
			thumbnail = buildImageUrl(imgurId, {
				resolvedData: {
					id        : rawBlueprint.image.id,
					type      : rawBlueprint.image.type || 'image/png',
					extension : rawBlueprint.image.extension,
					width     : rawBlueprint.image.width,
					height    : rawBlueprint.image.height,
					isFromAlbum: rawBlueprint.image.isFromAlbum || false,
					warnings  : rawBlueprint.image.warnings || [],
				}
			}, 'l');
		}
		else
		{
			const imgurType = rawBlueprint.image.type || 'image/png';
			thumbnail = buildImageUrl(imgurId, imgurType, 'l');
		}
	}

	const processedTags: Record<string, boolean> = {};
	const rawTags = rawBlueprint.tags || [];

	if (Array.isArray(rawTags))
	{
		rawTags.forEach((tagPath: string) =>
		{
			if (!tagPath.startsWith('/') || !tagPath.endsWith('/'))
			{
				throw new Error(`Tag format error: "${tagPath}" must have leading and trailing slashes`);
			}

			const decodedTag = decodeURIComponent(tagPath);
			if (decodedTag !== tagPath)
			{
				throw new Error(`Tag contains URL encoding: "${tagPath}" vs decoded "${decodedTag}"`);
			}

			processedTags[tagPath] = true;
		});
	}
	else
	{
		Object.entries(rawTags).forEach(([tagKey, tagValue]) =>
		{
			if (typeof tagKey === 'string' && tagValue === true)
			{
				if (!tagKey.startsWith('/') || !tagKey.endsWith('/'))
				{
					throw new Error(`Tag key format error: "${tagKey}" must have leading and trailing slashes`);
				}

				const decodedKey = decodeURIComponent(tagKey);
				if (decodedKey !== tagKey)
				{
					throw new Error(`Tag contains URL encoding: "${tagKey}" vs decoded "${decodedKey}"`);
				}

				processedTags[tagKey] = true;
			}
		});
	}

	let parsedData: any = null;
	if (rawBlueprint.blueprintString)
	{
		try
		{
			const blueprint = new Blueprint(rawBlueprint.blueprintString);
			parsedData = blueprint.getV15Decoded();
		}
		catch (error)
		{
			console.error('Error parsing blueprint string:', error);
		}
	}

	const renderedDescription = rawBlueprint.descriptionMarkdown
		? DOMPurify.sanitize(md.render(rawBlueprint.descriptionMarkdown))
		: '';

	const enrichedBlueprint = {
		...rawBlueprint,
		key : blueprintId,
		thumbnail,
		parsedData,
		renderedDescription,
		tags: processedTags,
	};

	return validateEnrichedBlueprint(enrichedBlueprint);
};

export default enrichBlueprint;
