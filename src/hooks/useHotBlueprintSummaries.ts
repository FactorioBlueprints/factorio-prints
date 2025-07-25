import {useMemo} from 'react';
import type {EnrichedBlueprintSummary} from '../schemas';
import {useEnrichedPaginatedSummaries} from './useEnrichedPaginatedSummaries';
import useFlattenedEnrichedPaginatedSummaries from './useFlattenedEnrichedPaginatedSummaries';

/**
 * Calculates a "hot" score for a blueprint similar to Reddit's hot algorithm.
 * The score considers both the number of favorites (popularity) and the recency of the blueprint.
 *
 * Hot score formula: log10(max(favorites, 1)) + (age_in_days / 45000)
 * - The log10 ensures diminishing returns for favorites (10 favorites ≈ 1 point, 100 favorites ≈ 2 points)
 * - Age penalty decreases the score over time (45000 seconds ≈ 12.5 hours per point decrease)
 * - More recent blueprints with decent favorites will rank higher than old blueprints with many favorites
 */
const calculateHotScore = (blueprint: EnrichedBlueprintSummary): number => {
	const now = Date.now();
	const lastUpdated = blueprint.lastUpdatedDate ?? now;
	const ageInSeconds = (now - lastUpdated) / 1000;

	// Use a minimum of 1 favorite to avoid log(0)
	const favorites = Math.max(blueprint.numberOfFavorites, 1);

	// Log base 10 of favorites for diminishing returns
	const favoriteScore = Math.log10(favorites);

	// Age penalty: older blueprints get lower scores
	// 45000 seconds (12.5 hours) reduces score by 1 point
	const agePenalty = ageInSeconds / 45000;

	return favoriteScore - agePenalty;
};

/**
 * Hook to fetch blueprint summaries sorted by "hot" score.
 * Hot score combines popularity (favorites) with recency, similar to Reddit's hot algorithm.
 *
 * @param pageSize - Number of items per page (default: 60)
 * @param timeWindowDays - Only consider blueprints updated within this many days (default: 30)
 * @returns Object with sorted hot blueprints and pagination functions
 */
export const useHotBlueprintSummaries = (pageSize = 60, timeWindowDays = 30) => {
	// Fetch by numberOfFavorites to get blueprints that have some popularity
	const {data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData} =
		useEnrichedPaginatedSummaries(pageSize * 3, 'numberOfFavorites'); // Fetch more to have enough recent ones

	const flattenedSummaries = useFlattenedEnrichedPaginatedSummaries(data);

	// Filter and sort by hot score
	const hotSortedSummaries = useMemo(() => {
		if (!flattenedSummaries) return [];

		const now = Date.now();
		const timeWindowMs = timeWindowDays * 24 * 60 * 60 * 1000;

		// Only include blueprints updated within the time window
		const recentBlueprints = flattenedSummaries.filter((blueprint) => {
			const lastUpdated = blueprint.lastUpdatedDate ?? 0;
			return now - lastUpdated <= timeWindowMs;
		});

		// Calculate hot score for each blueprint and sort
		return recentBlueprints
			.map((blueprint) => ({
				...blueprint,
				hotScore: calculateHotScore(blueprint),
			}))
			.sort((a, b) => b.hotScore - a.hotScore)
			.slice(0, pageSize); // Limit to requested page size
	}, [flattenedSummaries, pageSize, timeWindowDays]);

	return {
		data: hotSortedSummaries,
		isLoading,
		fetchNextPage,
		hasNextPage: hasNextPage && hotSortedSummaries.length < pageSize,
		isFetchingNextPage,
		isPlaceholderData,
	};
};

export default useHotBlueprintSummaries;
