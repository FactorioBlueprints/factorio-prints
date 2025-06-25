import {
	validateRawBlueprintSummaryPage,
	validateEnrichedBlueprintSummaryPage,
	validateRawPaginatedBlueprintSummaries,
	validateEnrichedPaginatedBlueprintSummaries,
	type RawBlueprintSummaryPage,
	type EnrichedBlueprintSummaryPage,
	type RawPaginatedBlueprintSummaries,
	type EnrichedPaginatedBlueprintSummaries,
} from '../schemas';
import { enrichBlueprintSummary } from './enrichBlueprintSummary';

export const enrichBlueprintSummaryPage = (rawBlueprintSummaryPage: RawBlueprintSummaryPage | null): EnrichedBlueprintSummaryPage | null =>
{
	if (!rawBlueprintSummaryPage) return null;

	validateRawBlueprintSummaryPage(rawBlueprintSummaryPage);

	const { data, hasMore, lastKey, lastValue } = rawBlueprintSummaryPage;

	const enrichedData = Object.entries(data).map(([key, value]) =>
	{
		return enrichBlueprintSummary(value, key);
	});

	const enrichedPage = {
		data: enrichedData,
		hasMore,
		lastKey,
		lastValue,
	};

	return validateEnrichedBlueprintSummaryPage(enrichedPage);
};

export const enrichPaginatedBlueprintSummaries = (rawPaginatedBlueprintSummaries: any): EnrichedPaginatedBlueprintSummaries | null =>
{
	if (!rawPaginatedBlueprintSummaries) return null;

	validateRawPaginatedBlueprintSummaries(rawPaginatedBlueprintSummaries);

	const { pages, pageParams } = rawPaginatedBlueprintSummaries;

	const enrichedPages = pages.map(page => enrichBlueprintSummaryPage(page));

	const enrichedPaginated = {
		pages: enrichedPages,
		pageParams,
	};

	return validateEnrichedPaginatedBlueprintSummaries(enrichedPaginated);
};

export default enrichPaginatedBlueprintSummaries;
