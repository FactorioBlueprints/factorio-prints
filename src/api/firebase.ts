import {
	update as dbUpdate,
	endAt,
	get,
	limitToLast,
	orderByChild,
	query,
	ref,
	runTransaction,
	startAt,
} from 'firebase/database';
import {getFirebaseDatabase} from '../utils/firebaseDatabase';
import {FirebaseError} from 'firebase/app';
import {app} from '../base';
import {
	type EnrichedBlueprintSummary,
	type RawBlueprint,
	type RawBlueprintSummary,
	type RawBlueprintSummaryPage,
	type RawUser,
	type RawComment,
	validateRawBlueprint,
	validateRawBlueprintSummary,
	validateRawBlueprintSummaryPage,
	validateRawComment,
} from '../schemas';

/**
 * Checks if an error is a network-related error that should not be sent to Sentry.
 * These are expected errors that occur when users have connectivity issues.
 */
const isNetworkError = (error: unknown): boolean => {
	if (error instanceof TypeError && error.message === 'Failed to fetch') {
		return true;
	}
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			message.includes('failed to fetch') ||
			message.includes('network error') ||
			message.includes('network request failed') ||
			message.includes('fetch failed')
		);
	}
	return false;
};

/**
 * Enhances Firebase errors with more descriptive messages including path and operation details.
 */
const enhanceFirebaseError = (error: unknown, operation: 'read' | 'write', path: string): Error => {
	// Check if it's a Firebase error - could be FirebaseError or just an Error with specific message
	if (error instanceof Error) {
		// Firebase permission errors typically have "Permission denied" in the message
		if (error.message?.includes('Permission denied') || error.message?.includes('PERMISSION_DENIED')) {
			const enhancedError = new Error(
				`Firebase permission denied: Cannot ${operation} at path "${path}". ` +
					`Check database rules for ${operation} permissions at this location.`,
			);
			enhancedError.name = 'FirebasePermissionError';
			// Preserve the original error as a cause for debugging
			enhancedError.cause = error;
			return enhancedError;
		}

		// Check if it's a FirebaseError with a code property
		if (error instanceof FirebaseError && error.code === 'PERMISSION_DENIED') {
			const enhancedError = new Error(
				`Firebase permission denied: Cannot ${operation} at path "${path}". ` +
					`Check database rules for ${operation} permissions at this location.`,
			);
			enhancedError.name = 'FirebasePermissionError';
			enhancedError.cause = error;
			return enhancedError;
		}

		// Return other errors as-is
		return error;
	}

	// For unknown error types, wrap in Error
	return new Error(String(error));
};

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
export const fetchBlueprintFromCdn = async (
	blueprintSummary: EnrichedBlueprintSummary,
): Promise<RawBlueprint | null> => {
	try {
		const blueprintKey = blueprintSummary.key;
		if (!blueprintKey) {
			return null;
		}

		const cdnUrl = getBlueprintCdnUrl(blueprintKey);
		let response: Response;

		try {
			response = await fetch(cdnUrl);
		} catch {
			// Network errors are expected for CDN - don't let them bubble to Sentry
			return null;
		}

		if (!response.ok) {
			return null;
		}

		let data;
		try {
			data = await response.json();
		} catch {
			return null;
		}

		return validateRawBlueprint(data);
	} catch {
		return null;
	}
};

export interface UserData {
	id: string;
	displayName?: string;
	email?: string;
	favorites?: Record<string, boolean>;
	blueprints?: Record<string, boolean>;
	favoritesCount: number;
	blueprintsCount: number;
}

export interface ReconcileResult {
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

export const fetchBlueprint = async (
	blueprintId: string,
	blueprintSummary: EnrichedBlueprintSummary,
): Promise<RawBlueprint | null> => {
	try {
		// Extract lastUpdatedDate from blueprintSummary
		const summaryLastUpdated = blueprintSummary.lastUpdatedDate;

		// Attempt to fetch from CDN first
		const cdnBlueprint = await fetchBlueprintFromCdn(blueprintSummary);

		if (cdnBlueprint) {
			// CDN fetch succeeded - compare lastUpdatedDate values
			const cdnLastUpdated = cdnBlueprint.lastUpdatedDate;

			if (cdnLastUpdated === summaryLastUpdated) {
				// Dates match - use CDN data
				return cdnBlueprint;
			}
			if (cdnLastUpdated && summaryLastUpdated) {
				// Dates don't match - check if CDN data is stale
				const cdnDate = new Date(cdnLastUpdated);
				const summaryDate = new Date(summaryLastUpdated);
				const timeDifferenceMs = summaryDate.getTime() - cdnDate.getTime();

				if (timeDifferenceMs < 1000) {
					// CDN data is stale by less than 1 second - use it anyway
					return cdnBlueprint;
				}
				// CDN data is stale by more than 1 second
			} else {
				// One or both dates are missing
			}
		}

		// Fall back to Firebase if CDN failed or data was stale
		const blueprintRef = ref(getFirebaseDatabase(), `/blueprints/${blueprintId}/`);
		const snapshot = await get(blueprintRef);

		if (!snapshot.exists()) {
			return null;
		}

		return validateRawBlueprint(snapshot.val());
	} catch (error) {
		if (isNetworkError(error)) {
			return null;
		}
		throw error;
	}
};

export const fetchBlueprintTags = async (blueprintId: string): Promise<string[]> => {
	try {
		const tagsRef = ref(getFirebaseDatabase(), `/blueprints/${blueprintId}/tags/`);
		const snapshot = await get(tagsRef);
		return snapshot.exists() ? snapshot.val() : [];
	} catch (error) {
		if (isNetworkError(error)) {
			return [];
		}
		throw error;
	}
};

export const fetchTags = async (): Promise<Record<string, string[]>> => {
	try {
		const tagsRef = ref(getFirebaseDatabase(), '/tags/');
		const snapshot = await get(tagsRef);

		if (!snapshot.exists()) {
			return {};
		}

		return snapshot.val();
	} catch (error) {
		if (isNetworkError(error)) {
			return {};
		}
		throw error;
	}
};

export const fetchByTagData = async (tagId: string): Promise<Record<string, boolean>> => {
	if (!tagId) {
		return {};
	}

	if (tagId.startsWith('/') || tagId.endsWith('/')) {
		throw new Error(
			`fetchByTagData: tagId "${tagId}" should not start or end with a slash. The normalized tag id should be used for database queries.`,
		);
	}

	try {
		const snapshot = await get(ref(getFirebaseDatabase(), `/byTag/${tagId}`));
		return snapshot.val() || {};
	} catch (error) {
		if (isNetworkError(error)) {
			return {};
		}
		throw error;
	}
};

export const fetchModerator = async (userId: string): Promise<boolean> => {
	try {
		const moderatorRef = ref(getFirebaseDatabase(), `/moderators/${userId}`);
		const snapshot = await get(moderatorRef);

		return Boolean(snapshot.val());
	} catch (error) {
		if (isNetworkError(error)) {
			return false;
		}
		throw error;
	}
};

export const fetchUserDisplayName = async (userId: string): Promise<string | null> => {
	try {
		const userRef = ref(getFirebaseDatabase(), `/users/${userId}/displayName`);
		const snapshot = await get(userRef);

		return snapshot.val();
	} catch (error) {
		if (isNetworkError(error)) {
			return null;
		}
		throw error;
	}
};

export const fetchUserBlueprints = async (userId: string): Promise<Record<string, boolean>> => {
	try {
		const snapshot = await get(ref(getFirebaseDatabase(), `/users/${userId}/blueprints`));
		return snapshot.val() || {};
	} catch (error) {
		if (isNetworkError(error)) {
			return {};
		}
		throw error;
	}
};

export const fetchUserFavorites = async (userId: string): Promise<Record<string, boolean>> => {
	try {
		const snapshot = await get(ref(getFirebaseDatabase(), `/users/${userId}/favorites`));
		return snapshot.val() || {};
	} catch (error) {
		if (isNetworkError(error)) {
			return {};
		}
		throw error;
	}
};

export const fetchUser = async (userId: string): Promise<RawUser | null> => {
	try {
		const userRef = ref(getFirebaseDatabase(), `/users/${userId}`);
		const snapshot = await get(userRef);

		if (!snapshot.exists()) {
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
	} catch (error) {
		if (isNetworkError(error)) {
			return null;
		}
		throw error;
	}
};

export const fetchAllUsers = async (): Promise<UserData[]> => {
	try {
		const usersRef = ref(getFirebaseDatabase(), '/users/');
		const snapshot = await get(usersRef);

		if (!snapshot.exists()) {
			return [];
		}

		const usersData: UserData[] = [];
		snapshot.forEach((childSnapshot) => {
			const userData = childSnapshot.val();
			usersData.push({
				id: childSnapshot.key,
				...userData,
				email: userData.email || undefined,
				favoritesCount: userData.favorites ? Object.keys(userData.favorites).length : 0,
				blueprintsCount: userData.blueprints ? Object.keys(userData.blueprints).length : 0,
			});
		});

		return usersData.sort((a, b) => b.favoritesCount - a.favoritesCount);
	} catch (error) {
		if (isNetworkError(error)) {
			return [];
		}
		throw error;
	}
};

export const reconcileFavoritesCount = async (blueprintId: string): Promise<ReconcileResult> => {
	const favoritesRef = ref(getFirebaseDatabase(), `/blueprints/${blueprintId}/favorites`);
	const favoritesSnapshot = await get(favoritesRef);
	const favorites = favoritesSnapshot.exists() ? favoritesSnapshot.val() : {};

	const actualCount = Object.values(favorites).filter(Boolean).length;

	const summaryRef = ref(getFirebaseDatabase(), `/blueprintSummaries/${blueprintId}/numberOfFavorites`);
	const summarySnapshot = await get(summaryRef);
	const currentSummaryCount = summarySnapshot.exists() ? summarySnapshot.val() : 0;

	const hasDiscrepancy = actualCount !== currentSummaryCount;

	if (hasDiscrepancy) {
		const updates = {
			[`/blueprintSummaries/${blueprintId}/numberOfFavorites`]: actualCount,
		};

		await dbUpdate(ref(getFirebaseDatabase()), updates);
	}

	return {
		blueprintId,
		actualCount,
		previousBlueprintCount: 0,
		previousSummaryCount: currentSummaryCount,
		hasDiscrepancy,
		reconciled: hasDiscrepancy,
	};
};

// TODO 2025-04-12: Move this out of firebase.js, and refactor it to use react query hooks from the hooks/ dir. The problem with the current implementation is that it performs many queries but doesn't cache anything. /users/${userId}/favorites already has a hook useUserFavorites in useUser. But `/blueprints/${blueprintId}/favorites/${userId}` doesn't have a hook or a mutation yet, so we need to add them.
export const reconcileUserFavorites = async (userId: string): Promise<UserReconcileResult> => {
	const userFavoritesRef = ref(getFirebaseDatabase(), `/users/${userId}/favorites`);
	const userFavoritesSnapshot = await get(userFavoritesRef);
	const userFavorites = userFavoritesSnapshot.exists() ? userFavoritesSnapshot.val() : {};

	const discrepancies: Array<{
		blueprintId: string;
		issue: string;
		fixed: boolean;
	}> = [];
	const updates: Record<string, boolean> = {};

	for (const blueprintId of Object.keys(userFavorites)) {
		if (!userFavorites[blueprintId]) {
			continue;
		}

		const blueprintFavoritesRef = ref(getFirebaseDatabase(), `/blueprints/${blueprintId}/favorites/${userId}`);
		const blueprintFavoriteSnapshot = await get(blueprintFavoritesRef);

		if (!blueprintFavoriteSnapshot.exists() || !blueprintFavoriteSnapshot.val()) {
			discrepancies.push({
				blueprintId,
				issue: 'User favorite not found in blueprint favorites',
				fixed: true,
			});

			updates[`/blueprints/${blueprintId}/favorites/${userId}`] = true;

			// TODO 2025-04-11: react query cache invalidation will be needed for each of these blueprints

			// TODO 2025-04-11: Don't reconcile counts, we'll handle that separately when reconciling from the blueprints rather than from the users
			await reconcileFavoritesCount(blueprintId);
		}
	}

	if (Object.keys(updates).length > 0) {
		await dbUpdate(ref(getFirebaseDatabase()), updates);
	}

	return {
		userId,
		discrepancies,
		totalFixed: discrepancies.length,
		reconciled: discrepancies.length > 0,
	};
};

export const cleanupInvalidUserFavorite = async (userId: string, blueprintId: string): Promise<boolean> => {
	try {
		const summaryRef = ref(getFirebaseDatabase(), `/blueprintSummaries/${blueprintId}`);
		const summarySnapshot = await get(summaryRef);

		if (summarySnapshot.exists()) {
			return false;
		}

		const updates = {
			[`/users/${userId}/favorites/${blueprintId}`]: null,
		};

		await dbUpdate(ref(getFirebaseDatabase()), updates);

		return true;
	} catch {
		return false;
	}
};

export const fetchBlueprintSummary = async (blueprintId: string): Promise<RawBlueprintSummary | null> => {
	try {
		const summaryRef = ref(getFirebaseDatabase(), `/blueprintSummaries/${blueprintId}`);
		const snapshot = await get(summaryRef);

		if (!snapshot.exists()) {
			return null;
		}

		return validateRawBlueprintSummary(snapshot.val());
	} catch (error) {
		if (isNetworkError(error)) {
			return null;
		}
		throw error;
	}
};

export const fetchPaginatedSummaries = async (
	pageSize = 60,
	lastKey: string | null = null,
	lastValue: any = null,
	orderByField = 'lastUpdatedDate',
): Promise<RawBlueprintSummaryPage> => {
	let summariesQuery;
	let nextLastKey: string | null = null;
	let nextLastValue: number | null = null;

	try {
		if (lastKey && lastValue) {
			summariesQuery = query(
				ref(getFirebaseDatabase(), '/blueprintSummaries/'),
				orderByChild(orderByField),
				endAt(lastValue, lastKey),
				limitToLast(pageSize + 1),
			);
		} else {
			summariesQuery = query(
				ref(getFirebaseDatabase(), '/blueprintSummaries/'),
				orderByChild(orderByField),
				limitToLast(pageSize + 1),
			);
		}

		const snapshot = await get(summariesQuery);

		if (!snapshot.exists()) {
			return validateRawBlueprintSummaryPage({
				data: {},
				hasMore: false,
				lastKey: null,
				lastValue: null,
			});
		}

		const entries: Array<[string, any]> = [];
		snapshot.forEach((childSnapshot) => {
			entries.push([childSnapshot.key, childSnapshot.val()]);
		});

		// limitToLast returns items in ascending order, but we want descending order
		// (newest dates first, most favorites first, etc.)
		entries.reverse();

		const hasMore = entries.length > pageSize;

		if (hasMore) {
			// Remove the extra item used for pagination detection
			const removedEntry = entries.pop();
			if (removedEntry) {
				nextLastKey = removedEntry[0];
				nextLastValue = removedEntry[1][orderByField];
			}
		}

		// Build the data object from the reversed entries
		const data: Record<string, RawBlueprintSummary> = {};
		entries.forEach(([key, value]) => {
			data[key] = value;
		});

		return validateRawBlueprintSummaryPage({
			data,
			hasMore,
			lastKey: nextLastKey,
			lastValue: nextLastValue,
		});
	} catch (error) {
		if (isNetworkError(error)) {
			return validateRawBlueprintSummaryPage({
				data: {},
				hasMore: false,
				lastKey: null,
				lastValue: null,
			});
		}
		throw error;
	}
};

export const fetchSummariesNewerThan = async (
	highWatermark: number,
	pageSize = 100,
): Promise<RawBlueprintSummary[]> => {
	try {
		const summariesQuery = query(
			ref(getFirebaseDatabase(), '/blueprintSummaries/'),
			orderByChild('lastUpdatedDate'),
			startAt(highWatermark + 1),
			limitToLast(pageSize),
		);

		const snapshot = await get(summariesQuery);

		if (!snapshot.exists()) {
			return [];
		}

		const summaries: RawBlueprintSummary[] = [];
		snapshot.forEach((childSnapshot) => {
			const summary = validateRawBlueprintSummary(childSnapshot.val());
			summaries.push(summary);
		});

		return summaries.reverse();
	} catch (error) {
		if (isNetworkError(error)) {
			return [];
		}
		throw error;
	}
};

export const createComment = async (
	blueprintId: string,
	authorId: string,
	authorDisplayName: string,
	content: string,
	parentId?: string,
): Promise<string> => {
	try {
		// Import functions SDK
		const {getFunctions, httpsCallable} = await import('firebase/functions');
		const functions = getFunctions(app);

		// Create a reference to the cloud function
		const createCommentFunction = httpsCallable<
			{
				blueprintId: string;
				authorId: string;
				authorDisplayName: string;
				content: string;
				parentId?: string;
			},
			{success: boolean; commentId: string; message: string}
		>(functions, 'createComment');

		// Call the cloud function
		const result = await createCommentFunction({
			blueprintId,
			authorId,
			authorDisplayName,
			content,
			parentId,
		});

		if (!result.data.success) {
			throw new Error(result.data.message || 'Failed to create comment');
		}

		return result.data.commentId;
	} catch (error: any) {
		// Handle specific cloud function errors
		if (error.code === 'functions/failed-precondition' && error.details?.toxicityScore) {
			throw new Error('Your comment appears to contain inappropriate content. Please revise and try again.');
		}

		if (error.code === 'functions/unauthenticated') {
			throw new Error('You must be logged in to post comments');
		}

		if (error.code === 'functions/permission-denied') {
			throw new Error('You do not have permission to post comments');
		}

		console.error('Error creating comment:', error);
		throw error;
	}
};

export const fetchComments = async (blueprintId: string): Promise<Record<string, RawComment>> => {
	const path = `/comments/${blueprintId}`;
	try {
		const commentsRef = ref(getFirebaseDatabase(), path);
		const snapshot = await get(commentsRef);

		if (!snapshot.exists()) {
			return {};
		}

		const commentsData = snapshot.val();
		const validatedComments: Record<string, RawComment> = {};

		for (const [commentId, commentData] of Object.entries(commentsData)) {
			try {
				validatedComments[commentId] = validateRawComment(commentData);
			} catch (error) {
				console.warn(`Invalid comment data for ${commentId}:`, error);
			}
		}

		return validatedComments;
	} catch (error) {
		const enhancedError = enhanceFirebaseError(error, 'read', path);
		console.error('Error fetching comments:', enhancedError);
		throw enhancedError;
	}
};

export const updateComment = async (
	blueprintId: string,
	commentId: string,
	content: string,
	authorId: string,
): Promise<void> => {
	const path = `/comments/${blueprintId}/${commentId}`;
	try {
		const commentRef = ref(getFirebaseDatabase(), path);
		const snapshot = await get(commentRef);

		if (!snapshot.exists()) {
			throw new Error('Comment not found');
		}

		const comment = validateRawComment(snapshot.val());

		if (comment.authorId !== authorId) {
			throw new Error('Unauthorized to edit this comment');
		}

		await dbUpdate(commentRef, {
			content,
			updatedAt: Date.now(),
		});
	} catch (error) {
		if (error instanceof Error && error.message === 'Comment not found') {
			throw error;
		}
		if (error instanceof Error && error.message === 'Unauthorized to edit this comment') {
			throw error;
		}
		const enhancedError = enhanceFirebaseError(error, 'write', path);
		console.error('Error updating comment:', enhancedError);
		throw enhancedError;
	}
};

export const deleteComment = async (blueprintId: string, commentId: string, authorId: string): Promise<void> => {
	const path = `/comments/${blueprintId}/${commentId}`;

	try {
		// Use a transaction to ensure atomic operation
		const allCommentsRef = ref(getFirebaseDatabase(), `/comments/${blueprintId}`);
		const result = await runTransaction(allCommentsRef, (currentData) => {
			if (!currentData) {
				// No comments exist
				return currentData;
			}

			const targetComment = currentData[commentId];
			if (!targetComment) {
				// Comment doesn't exist - abort transaction
				throw new Error('Comment not found');
			}

			// Validate comment data
			let validatedComment: RawComment;
			try {
				validatedComment = validateRawComment(targetComment);
			} catch {
				throw new Error('Invalid comment data');
			}

			if (validatedComment.authorId !== authorId) {
				throw new Error('Unauthorized to delete this comment');
			}

			// Check if any other comments have this comment as their parent
			let hasReplies = false;
			for (const [id, commentData] of Object.entries(currentData)) {
				if (id !== commentId && commentData && typeof commentData === 'object' && 'parentId' in commentData) {
					if (commentData.parentId === commentId) {
						hasReplies = true;
						break;
					}
				}
			}

			if (hasReplies) {
				// Soft delete: mark as deleted but keep in database
				currentData[commentId] = {
					...validatedComment,
					isDeleted: true,
					content: '[deleted]',
					updatedAt: Date.now(),
				};
			} else {
				// Hard delete: remove from database entirely
				delete currentData[commentId];
			}

			return currentData;
		});

		// If transaction succeeded and comment was hard deleted, also remove from user's comments
		if (result.committed) {
			const allCommentsSnapshot = result.snapshot;
			if (allCommentsSnapshot && !allCommentsSnapshot.child(commentId).exists()) {
				// Comment was hard deleted, remove from user's comments
				await dbUpdate(ref(getFirebaseDatabase()), {[`/users/${authorId}/comments/${commentId}`]: null});
			}
		}
	} catch (error) {
		if (
			error instanceof Error &&
			(error.message === 'Comment not found' ||
				error.message === 'Unauthorized to delete this comment' ||
				error.message === 'Invalid comment data')
		) {
			throw error;
		}
		const enhancedError = enhanceFirebaseError(error, 'write', path);
		console.error('Error deleting comment:', enhancedError);
		throw enhancedError;
	}
};
