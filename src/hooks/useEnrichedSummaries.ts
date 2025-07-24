import {useMemo} from 'react';
import {type EnrichedBlueprintSummary, type RawBlueprintSummary, validateEnrichedBlueprintSummaries} from '../schemas';
import {enrichBlueprintSummary} from '../utils/enrichBlueprintSummary';

type SummaryWithKey = RawBlueprintSummary & {key: string};

export const useEnrichedSummaries = (
	blueprintSummaries: SummaryWithKey[] | null | undefined,
): EnrichedBlueprintSummary[] => {
	return useMemo(() => {
		if (!blueprintSummaries || blueprintSummaries.length === 0) {
			return [];
		}

		const enrichedSummaries = blueprintSummaries
			.map((summary) => {
				const {key, ...rawSummary} = summary;
				return enrichBlueprintSummary(rawSummary as RawBlueprintSummary, key);
			})
			.filter((summary): summary is EnrichedBlueprintSummary => summary !== null);

		return validateEnrichedBlueprintSummaries(enrichedSummaries);
	}, [blueprintSummaries]);
};

export default useEnrichedSummaries;
