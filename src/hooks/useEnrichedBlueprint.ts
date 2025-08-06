import {useMemo} from 'react';
import type {EnrichedBlueprint, EnrichedBlueprintSummary} from '../schemas';
import enrichBlueprint from '../utils/enrichBlueprint';
import useRawBlueprint from './useRawBlueprint';

export const useEnrichedBlueprint = (blueprintId: string, blueprintSummary: EnrichedBlueprintSummary | null) => {
	const rawBlueprintQuery = useRawBlueprint(blueprintId, blueprintSummary);

	const enrichedData = useMemo(() => {
		if (!rawBlueprintQuery.data) return undefined;

		return enrichBlueprint(rawBlueprintQuery.data, blueprintId, blueprintSummary);
	}, [rawBlueprintQuery.data, blueprintId, blueprintSummary]);

	return {
		...rawBlueprintQuery,
		data: enrichedData,
	};
};
