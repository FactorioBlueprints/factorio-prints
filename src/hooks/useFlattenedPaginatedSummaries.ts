import {useMemo} from 'react';
import type {RawPaginatedBlueprintSummaries, RawBlueprintSummary} from '../schemas';

type SummaryWithKey = RawBlueprintSummary & {key: string};

export const useFlattenedPaginatedSummaries = (
	paginatedData: RawPaginatedBlueprintSummaries | null | undefined,
): SummaryWithKey[] => {
	return useMemo(() => {
		if (!paginatedData?.pages) {
			return [];
		}

		return paginatedData.pages.flatMap((page) =>
			Object.entries(page.data).map(([key, value]) => ({
				key,
				...value,
			})),
		);
	}, [paginatedData]);
};

export default useFlattenedPaginatedSummaries;
