import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useCallback} from 'react';
import {fetchSummariesNewerThan} from '../api/firebase';
import {getHighWatermark, updateHighWatermark} from '../localStorage';
import type {RawBlueprintSummary} from '../schemas';

const HIGH_WATERMARK_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const HIGH_WATERMARK_STALE_TIME = 2 * 60 * 1000; // 2 minutes

export const useHighWatermarkSync = () => {
	const queryClient = useQueryClient();

	const checkForNewBlueprints = useCallback(async (): Promise<RawBlueprintSummary[]> => {
		const watermark = getHighWatermark();

		if (!watermark) {
			console.log('No high watermark found, skipping check for new blueprints');
			return [];
		}

		console.log(`Checking for blueprints newer than ${new Date(watermark.lastUpdatedDate).toISOString()}`);

		const newSummaries = await fetchSummariesNewerThan(watermark.lastUpdatedDate);

		if (newSummaries.length > 0) {
			console.log(`Found ${newSummaries.length} new blueprints`);

			const latestDate = Math.max(
				...newSummaries
					.map((summary) => summary.lastUpdatedDate)
					.filter((date): date is number => date !== undefined),
			);

			if (latestDate > watermark.lastUpdatedDate) {
				updateHighWatermark(latestDate);
				console.log(`Updated high watermark to ${new Date(latestDate).toISOString()}`);
			}

			queryClient.invalidateQueries({
				queryKey: ['rawPaginatedBlueprintSummaries', 'orderBy', 'lastUpdatedDate'],
			});
		} else {
			console.log('No new blueprints found');
		}

		return newSummaries;
	}, [queryClient]);

	return useQuery({
		queryKey: ['highWatermarkSync'],
		queryFn: checkForNewBlueprints,
		refetchInterval: HIGH_WATERMARK_CHECK_INTERVAL,
		staleTime: HIGH_WATERMARK_STALE_TIME,
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
	});
};
