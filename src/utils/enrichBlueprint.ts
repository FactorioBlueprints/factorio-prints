import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import * as Sentry from '@sentry/react';
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

	const reportToSentry = (message: string, level: 'warning' | 'info', issues: any) =>
	{
		Sentry.captureMessage(message, {
			level,
			tags: {
				component : 'enrichBlueprint',
				blueprintId,
				issueTypes: Array.isArray(issues) ? [...new Set(issues.map((i: any) => i.type))].join(',') : issues,
			},
			extra: {
				blueprintId,
				blueprintTitle: rawBlueprint.title || 'Untitled',
				blueprintUrl  : `https://factorioprints.com/view/${blueprintId}`,
				authorId      : rawBlueprint.author?.userId,
				authorName    : rawBlueprint.author?.displayName,
				issues,
			},
		});
	};

	if (rawBlueprint.tags && !Array.isArray(rawBlueprint.tags))
	{
		reportToSentry('Blueprint data corruption detected', 'warning', {
			type      : 'non-array-tags',
			actualType: typeof rawBlueprint.tags,
			sampleData: JSON.stringify(rawBlueprint.tags).substring(0, 200),
		});
		rawBlueprint.tags = [];
	}
	else if (Array.isArray(rawBlueprint.tags))
	{
		const nonStringTags = rawBlueprint.tags.filter(tag => typeof tag !== 'string');
		if (nonStringTags.length > 0)
		{
			reportToSentry('Blueprint data corruption detected', 'warning', {
				type : 'non-string-tags',
				count: nonStringTags.length,
				types: nonStringTags.map(t => t === null ? 'null' : typeof t),
			});
			rawBlueprint.tags = rawBlueprint.tags.filter(tag => typeof tag === 'string');
		}
	}

	validateRawBlueprint(rawBlueprint);

	let thumbnail: string | null = null;
	if (rawBlueprint.image?.id)
	{
		const imgurId = rawBlueprint.image.id;
		const imgurType = rawBlueprint.image.type || 'image/png';
		thumbnail = buildImageUrl(imgurId, imgurType, 'l');
	}

	const processedTags: Record<string, boolean> = {};
	const rawTags = rawBlueprint.tags || [];
	const tagFormatIssues: Array<{type: string, tag: string}> = [];

	if (Array.isArray(rawTags))
	{
		rawTags.forEach((tag: string) =>
		{
			if (!tag.startsWith('/') || !tag.endsWith('/'))
			{
				tagFormatIssues.push({ type: 'invalid-format', tag });
			}
			else if (decodeURIComponent(tag) !== tag)
			{
				tagFormatIssues.push({ type: 'url-encoded', tag });
			}
			else
			{
				processedTags[tag] = true;
			}
		});
	}

	if (tagFormatIssues.length > 0)
	{
		reportToSentry('Blueprint tag format issues detected', 'info', tagFormatIssues);
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
