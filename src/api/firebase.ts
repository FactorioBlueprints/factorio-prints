import {endAt, get, getDatabase, limitToLast, orderByChild, query, ref, update as dbUpdate} from 'firebase/database';
import {app}                                                                                from '../base';
import {
	RawBlueprint,
	RawBlueprintSummary,
	EnrichedBlueprintSummary,
	RawBlueprintSummaryPage,
	RawUser,
	validateRawBlueprint,
	validateRawBlueprintSummary,
	validateRawBlueprintSummaryPage
} from '../schemas';
import { formatDistance } from 'date-fns';


/**
 * Transforms a blueprint key to its CDN URL format.
 *
 * @param blueprintKey - The blueprint key (e.g., "-KnQ865j-qQ21WoUPbd3")
 * @returns The CDN URL (e.g., "https://factorio-blueprint-firebase-cdn.pages.dev/-Kn/Q865j-qQ21WoUPbd3.json")
 */
export const getBlueprintCdnUrl = (blueprintKey: string): string => {
	const prefix = blueprintKey.slice(0, 3);
	const suffix = blueprintKey.slice(3);
	return `https://factorio-blueprint-firebase-cdn.pages.dev/${prefix}/${suffix}.json`;
};

/**
 * Fetches blueprint data from the CDN.
 *
 * @param blueprintSummary - The blueprint summary containing the blueprint key
 * @returns The blueprint data from CDN or null if fetch fails
 */
export const fetchBlueprintFromCdn = async (blueprintSummary: EnrichedBlueprintSummary): Promise<RawBlueprint | null> => {
	try {
		const blueprintKey = blueprintSummary.key;
		if (!blueprintKey) {
			console.error('Blueprint summary missing key');
			return null;
		}

		const cdnUrl = getBlueprintCdnUrl(blueprintKey);
		const response = await fetch(cdnUrl);

		if (!response.ok) {
			// Only log non-404 errors, as 404s are expected for new/recently updated blueprints
			if (response.status !== 404) {
				console.warn(`CDN fetch failed for blueprint ${blueprintKey}: ${response.status} ${response.statusText}`);
			}
			return null;
		}

		const data = await response.json();
		return validateRawBlueprint(data);
	} catch (error) {
		console.warn('Error fetching blueprint from CDN:', error);
		return null;
	}
};

interface UserData {
	id: string;
	displayName?: string;
	favorites?: Record<string, boolean>;
	blueprints?: Record<string, boolean>;
	favoritesCount: number;
	blueprintsCount: number;
}

interface ReconcileResult {
	blueprintId: string;
	actualCount: number;
	previousBlueprintCount: number;
	previousSummaryCount: number;
	hasDiscrepancy: boolean;
	reconciled: boolean;
}

interface UserReconcileResult {
	userId: string;
	discrepancies: Array<{
		blueprintId: string;
		issue: string;
		fixed: boolean;
	}>;
	totalFixed: number;
	reconciled: boolean;
}

export const fetchBlueprint = async (blueprintId: string, blueprintSummary: EnrichedBlueprintSummary): Promise<RawBlueprint | null> =>
{
	try
	{
		// Extract lastUpdatedDate from blueprintSummary
		const summaryLastUpdated = blueprintSummary.lastUpdatedDate;

		// Attempt to fetch from CDN first
		const cdnBlueprint = await fetchBlueprintFromCdn(blueprintSummary);

		if (cdnBlueprint) {
			// CDN fetch succeeded - compare lastUpdatedDate values
			const cdnLastUpdated = cdnBlueprint.lastUpdatedDate;

			if (cdnLastUpdated === summaryLastUpdated) {
				// Dates match - use CDN data
				console.log(`Blueprint ${blueprintId} fetched from CDN (dates match)`);
				return cdnBlueprint;
			} else if (cdnLastUpdated && summaryLastUpdated) {
				// Dates don't match - CDN data is stale
				const cdnDate = new Date(cdnLastUpdated);
				const summaryDate = new Date(summaryLastUpdated);
				const timeDiff = formatDistance(cdnDate, summaryDate);
				console.log(`Blueprint ${blueprintId} CDN data is stale by ${timeDiff} (CDN: ${cdnLastUpdated}, Summary: ${summaryLastUpdated})`);
			} else {
				// One or both dates are missing
				console.log(`Blueprint ${blueprintId} CDN data has missing dates (CDN: ${cdnLastUpdated}, Summary: ${summaryLastUpdated})`);
			}
		}

		// Fall back to Firebase if CDN failed or data was stale
		const blueprintRef = ref(getDatabase(app), `/blueprints/${blueprintId}/`);
		const snapshot = await get(blueprintRef);

		if (!snapshot.exists())
		{
			console.log(`Blueprint ${blueprintId} not found in Firebase`);
			return null;
		}

		console.log(`Blueprint ${blueprintId} fetched from Firebase`);
		return validateRawBlueprint(snapshot.val());
	}
	catch (error)
	{
		console.error('Error fetching blueprint:', error);
		throw error;
	}
};

export const fetchBlueprintTags = async (blueprintId: string): Promise<string[]> =>
{
	try
	{
		const tagsRef = ref(getDatabase(app), `/blueprints/${blueprintId}/tags/`);
		const snapshot = await get(tagsRef);
		return snapshot.exists() ? snapshot.val() : [];
	}
	catch (error)
	{
		console.error('Error fetching blueprint tags:', error);
		throw error;
	}
};

export const fetchTags = async (): Promise<Record<string, string[]>> =>
{
	try
	{
		const tagsRef = ref(getDatabase(app), '/tags/');
		const snapshot = await get(tagsRef);

		if (!snapshot.exists())
		{
			return {};
		}

		return snapshot.val();
	}
	catch (error)
	{
		console.error('Error fetching tags:', error);
		throw error;
	}
};

export const fetchByTagData = async (tagId: string): Promise<Record<string, boolean>> =>
{
	if (!tagId)
	{
		console.error("fetchTagData called with null or empty tagId");
		return {};
	}

	if (tagId.startsWith('/') || tagId.endsWith('/'))
	{
		throw new Error(`fetchByTagData: tagId "${tagId}" should not start or end with a slash. The normalized tag id should be used for database queries.`);
	}

	try
	{
		const snapshot = await get(ref(getDatabase(app), `/byTag/${tagId}`));
		return snapshot.val() || {};
	}
	catch (error)
	{
		console.error('Error fetching tag data:', error);
		throw error;
	}
};

export const fetchModerator = async (userId: string): Promise<boolean> =>
{
	try
	{
		const moderatorRef = ref(getDatabase(app), `/moderators/${userId}`);
		const snapshot = await get(moderatorRef);

		return Boolean(snapshot.val());
	}
	catch (error)
	{
		console.error('Error fetching moderator status:', error);
		throw error;
	}
};

export const fetchUserDisplayName = async (userId: string): Promise<string | null> =>
{
	try
	{
		const userRef = ref(getDatabase(app), `/users/${userId}/displayName`);
		const snapshot = await get(userRef);

		return snapshot.val();
	}
	catch (error)
	{
		console.error('Error fetching user display name:', error);
		throw error;
	}
};

export const fetchUserBlueprints = async (userId: string): Promise<Record<string, boolean>> =>
{
	try
	{
		const snapshot = await get(ref(getDatabase(app), `/users/${userId}/blueprints`));
		return snapshot.val() || {};
	}
	catch (error)
	{
		console.error('Error fetching user blueprints:', error);
		throw error;
	}
};

export const fetchUserFavorites = async (userId: string): Promise<Record<string, boolean>> =>
{
	try
	{
		const snapshot = await get(ref(getDatabase(app), `/users/${userId}/favorites`));
		return snapshot.val() || {};
	}
	catch (error)
	{
		console.error('Error fetching user favorites:', error);
		throw error;
	}
};

export const fetchUser = async (userId: string): Promise<RawUser | null> =>
{
	try
	{
		const userRef = ref(getDatabase(app), `/users/${userId}`);
		const snapshot = await get(userRef);

		if (!snapshot.exists())
		{
			return null;
		}

		const userData = snapshot.val();
		return {
			id: userId,
			displayName: userData.displayName || undefined,
			email: userData.email || undefined,
			favorites: userData.favorites || {},
			blueprints: userData.blueprints || {},
		};
	}
	catch (error)
	{
		console.error('Error fetching user:', error);
		throw error;
	}
};

export const fetchAllUsers = async (): Promise<UserData[]> =>
{
	try
	{
		const usersRef = ref(getDatabase(app), '/users/');
		const snapshot = await get(usersRef);

		if (!snapshot.exists())
		{
			return [];
		}

		const usersData: UserData[] = [];
		snapshot.forEach((childSnapshot) =>
		{
			const userData = childSnapshot.val();
			usersData.push({
				id             : childSnapshot.key,
				...userData,
				favoritesCount : userData.favorites ? Object.keys(userData.favorites).length : 0,
				blueprintsCount: userData.blueprints ? Object.keys(userData.blueprints).length : 0,
			});
		});

		return usersData.sort((a, b) => b.favoritesCount - a.favoritesCount);
	}
	catch (error)
	{
		console.error('Error fetching all users:', error);
		throw error;
	}
};

export const reconcileFavoritesCount = async (blueprintId: string): Promise<ReconcileResult> =>
{
	try
	{
		const favoritesRef = ref(getDatabase(app), `/blueprints/${blueprintId}/favorites`);
		const favoritesSnapshot = await get(favoritesRef);
		const favorites = favoritesSnapshot.exists() ? favoritesSnapshot.val() : {};

		const actualCount = Object.values(favorites).filter(Boolean).length;

		const blueprintRef = ref(getDatabase(app), `/blueprints/${blueprintId}/numberOfFavorites`);
		const blueprintSnapshot = await get(blueprintRef);
		const currentBlueprintCount = blueprintSnapshot.exists() ? blueprintSnapshot.val() : 0;

		const summaryRef = ref(getDatabase(app), `/blueprintSummaries/${blueprintId}/numberOfFavorites`);
		const summarySnapshot = await get(summaryRef);
		const currentSummaryCount = summarySnapshot.exists() ? summarySnapshot.val() : 0;

		const hasDiscrepancy = actualCount !== currentBlueprintCount || actualCount !== currentSummaryCount;

		if (hasDiscrepancy)
		{
			const updates = {
				[`/blueprints/${blueprintId}/numberOfFavorites`]        : actualCount,
				[`/blueprintSummaries/${blueprintId}/numberOfFavorites`]: actualCount,
			};

			await dbUpdate(ref(getDatabase(app)), updates);
		}

		return {
			blueprintId,
			actualCount,
			previousBlueprintCount: currentBlueprintCount,
			previousSummaryCount  : currentSummaryCount,
			hasDiscrepancy,
			reconciled            : hasDiscrepancy,
		};
	}
	catch (error)
	{
		console.error('Error reconciling favorites count:', error);
		throw error;
	}
};

// TODO 2025-04-12: Move this out of firebase.js, and refactor it to use react query hooks from the hooks/ dir. The problem with the current implementation is that it performs many queries but doesn't cache anything. /users/${userId}/favorites already has a hook useUserFavorites in useUser. But `/blueprints/${blueprintId}/favorites/${userId}` doesn't have a hook or a mutation yet, so we need to add them.
export const reconcileUserFavorites = async (userId: string): Promise<UserReconcileResult> =>
{
	try
	{
		const userFavoritesRef = ref(getDatabase(app), `/users/${userId}/favorites`);
		const userFavoritesSnapshot = await get(userFavoritesRef);
		const userFavorites = userFavoritesSnapshot.exists() ? userFavoritesSnapshot.val() : {};

		const discrepancies: Array<{
			blueprintId: string;
			issue: string;
			fixed: boolean;
		}> = [];
		const updates: Record<string, boolean> = {};

		for (const blueprintId of Object.keys(userFavorites))
		{
			if (!userFavorites[blueprintId])
			{
				continue;
			}

			const blueprintFavoritesRef = ref(getDatabase(app), `/blueprints/${blueprintId}/favorites/${userId}`);
			const blueprintFavoriteSnapshot = await get(blueprintFavoritesRef);

			if (!blueprintFavoriteSnapshot.exists() || !blueprintFavoriteSnapshot.val())
			{
				discrepancies.push({
					blueprintId,
					issue: "User favorite not found in blueprint favorites",
					fixed: true,
				});

				updates[`/blueprints/${blueprintId}/favorites/${userId}`] = true;

				// TODO 2025-04-11: react query cache invalidation will be needed for each of these blueprints

				// TODO 2025-04-11: Don't reconcile counts, we'll handle that separately when reconciling from the blueprints rather than from the users
				await reconcileFavoritesCount(blueprintId);
			}
		}

		if (Object.keys(updates).length > 0)
		{
			await dbUpdate(ref(getDatabase(app)), updates);
		}

		return {
			userId,
			discrepancies,
			totalFixed: discrepancies.length,
			reconciled: discrepancies.length > 0,
		};
	}
	catch (error)
	{
		console.error('Error reconciling user favorites:', error);
		throw error;
	}
};

export const cleanupInvalidUserFavorite = async (userId: string, blueprintId: string): Promise<boolean> =>
{
	try
	{
		const summaryRef = ref(getDatabase(app), `/blueprintSummaries/${blueprintId}`);
		const summarySnapshot = await get(summaryRef);

		if (summarySnapshot.exists())
		{
			console.error(`Attempted to clean up a valid blueprint ${blueprintId} from user ${userId}'s favorites. This is a bug and should be investigated.`);
			return false;
		}

		const updates = {
			[`/users/${userId}/favorites/${blueprintId}`]: null,
		};

		await dbUpdate(ref(getDatabase(app)), updates);

		return true;
	}
	catch (error)
	{
		console.error(`Error cleaning up invalid user favorite for userId=${userId}, blueprintId=${blueprintId}:`, error);
		return false;
	}
};

export const fetchBlueprintSummary = async (blueprintId: string): Promise<RawBlueprintSummary | null> =>
{
	try
	{
		const summaryRef = ref(getDatabase(app), `/blueprintSummaries/${blueprintId}`);
		const snapshot = await get(summaryRef);

		if (!snapshot.exists())
		{
			return null;
		}

		return validateRawBlueprintSummary(snapshot.val());
	}
	catch (error)
	{
		console.error('Error fetching blueprint summary:', error);
		throw error;
	}
};

export const fetchPaginatedSummaries = async (pageSize = 60, lastKey: string | null = null, lastValue: any = null, orderByField = 'lastUpdatedDate'): Promise<RawBlueprintSummaryPage> =>
{
	try
	{
		let summariesQuery;
		let nextLastKey = null;
		let nextLastValue = null;

		if (lastKey && lastValue)
		{
			summariesQuery = query(
				ref(getDatabase(app), '/blueprintSummaries/'),
				orderByChild(orderByField),
				endAt(lastValue, lastKey),
				limitToLast(pageSize + 1),
			);
		}
		else
		{
			summariesQuery = query(
				ref(getDatabase(app), '/blueprintSummaries/'),
				orderByChild(orderByField),
				limitToLast(pageSize + 1),
			);
		}

		const snapshot = await get(summariesQuery);

		if (!snapshot.exists())
		{
			return validateRawBlueprintSummaryPage({
				data     : {},
				hasMore  : false,
				lastKey  : null,
				lastValue: null,
			});
		}

		const entries: Array<[string, any]> = [];
		snapshot.forEach((childSnapshot) =>
		{
			entries.push([childSnapshot.key, childSnapshot.val()]);
		});

		// limitToLast returns items in ascending order, but we want descending order
		// (newest dates first, most favorites first, etc.)
		entries.reverse();

		const hasMore = entries.length > pageSize;

		if (hasMore)
		{
			// Remove the extra item used for pagination detection
			const removedEntry = entries.pop();
			if (removedEntry)
			{
				nextLastKey = removedEntry[0];
				nextLastValue = removedEntry[1][orderByField];
			}
		}

		// Build the data object from the reversed entries
		const data = {};
		entries.forEach(([key, value]) =>
		{
			data[key] = value;
		});

		return validateRawBlueprintSummaryPage({
			data,
			hasMore,
			lastKey  : nextLastKey,
			lastValue: nextLastValue,
		});
	}
	catch (error)
	{
		console.error('Error fetching paginated summaries:', error);
		throw error;
	}
};
