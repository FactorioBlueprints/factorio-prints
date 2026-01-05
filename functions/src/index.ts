import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {onValueWritten, onValueDeleted, DatabaseEvent, DataSnapshot} from 'firebase-functions/v2/database';
import {Change} from 'firebase-functions/v2';
import {onRequest} from 'firebase-functions/v2/https';

admin.initializeApp();

/**
 * Cloud Function to maintain numberOfFavorites count
 * Triggers when a user adds or removes a favorite
 */
export const updateFavoriteCount = onValueWritten(
	'/users/{userId}/favorites/{blueprintId}',
	async (event: DatabaseEvent<Change<DataSnapshot>>) => {
		const blueprintId = event.params.blueprintId;
		const userId = event.params.userId;
		const change = event.data;

		const beforeValue = change.before.val();
		const afterValue = change.after.val();

		// Determine if this is an addition or removal
		const wasRemoved = beforeValue === true && (afterValue === null || afterValue === false);
		const wasAdded = (beforeValue === null || beforeValue === false) && afterValue === true;

		if (!wasAdded && !wasRemoved) {
			// No actual change in favorite status
			return null;
		}

		const database = admin.database();

		// Update the blueprint's favorites record to match
		const blueprintFavoriteRef = database.ref(`/blueprints/${blueprintId}/favorites/${userId}`);
		await blueprintFavoriteRef.set(afterValue);

		// Get all favorites for this blueprint to calculate the accurate count
		const favoritesSnapshot = await database.ref(`/blueprints/${blueprintId}/favorites`).once('value');

		const favorites = favoritesSnapshot.val() || {};

		// Count only the true values (actual favorites)
		const favoriteCount = Object.values(favorites).filter((value) => value === true).length;

		// Update the count in both locations atomically
		const updates: Record<string, number> = {
			[`/blueprints/${blueprintId}/numberOfFavorites`]: favoriteCount,
			[`/blueprintSummaries/${blueprintId}/numberOfFavorites`]: favoriteCount,
		};

		await database.ref().update(updates);

		functions.logger.log(
			`Updated favorite count for blueprint ${blueprintId}: ${favoriteCount} (user ${userId} ${wasAdded ? 'added' : 'removed'} favorite)`,
		);

		return null;
	},
);

/**
 * Cloud Function to clean up user favorites when a blueprint is deleted.
 * This serves as a safety net - the client also performs this cleanup,
 * but this ensures consistency if the client-side cleanup fails.
 *
 * Note: The client first nulls out the blueprintString field before deletion
 * to prevent TRIGGER_PAYLOAD_TOO_LARGE errors for large blueprints.
 */
export const cleanupFavoritesOnBlueprintDelete = onValueDeleted(
	'/blueprints/{blueprintId}',
	async (event: DatabaseEvent<DataSnapshot>) => {
		const blueprintId = event.params.blueprintId;
		const snapshot = event.data;
		const blueprint = snapshot.val();

		// Remove this blueprint from all users' favorites
		const favorites = blueprint?.favorites ?? {};
		const userIds = Object.keys(favorites).filter((userId) => favorites[userId] === true);

		if (userIds.length === 0) {
			functions.logger.log(`Blueprint ${blueprintId} deleted with no favorites to clean up`);
			return null;
		}

		const database = admin.database();
		const updates: Record<string, null> = {};

		for (const userId of userIds) {
			updates[`/users/${userId}/favorites/${blueprintId}`] = null;
		}

		await database.ref().update(updates);
		functions.logger.log(
			`Cleaned up deleted blueprint ${blueprintId}: removed favorites from ${userIds.length} users`,
		);

		return null;
	},
);

/**
 * Cloud Function to reconcile favorite counts (can be called manually if needed)
 * This is a failsafe to fix any discrepancies
 */
export const reconcileFavoriteCounts = onRequest(async (req, res) => {
	// This should be protected in production
	// Check for admin authentication or a secret key
	const authToken = req.headers.authorization;
	if (authToken !== `Bearer ${process.env.ADMIN_SECRET}`) {
		res.status(403).send('Unauthorized');
		return;
	}

	const database = admin.database();

	const blueprintsSnapshot = await database.ref('/blueprints').once('value');
	const blueprints = blueprintsSnapshot.val() || {};

	const updates: Record<string, number> = {};
	let reconcileCount = 0;

	for (const blueprintId of Object.keys(blueprints)) {
		const blueprint = blueprints[blueprintId];
		const favorites = blueprint.favorites || {};

		const actualCount = Object.values(favorites).filter((value) => value === true).length;

		const currentCount = blueprint.numberOfFavorites || 0;

		if (currentCount !== actualCount) {
			updates[`/blueprints/${blueprintId}/numberOfFavorites`] = actualCount;
			updates[`/blueprintSummaries/${blueprintId}/numberOfFavorites`] = actualCount;
			reconcileCount++;
		}
	}

	if (Object.keys(updates).length > 0) {
		await database.ref().update(updates);
		res.json({
			success: true,
			message: `Reconciled ${reconcileCount} blueprint favorite counts`,
			reconciled: reconcileCount,
		});
	} else {
		res.json({
			success: true,
			message: 'All favorite counts are already accurate',
			reconciled: 0,
		});
	}
});
