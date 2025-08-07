import * as functions from "firebase-functions";
import * as functionsV1 from "firebase-functions/v1";
import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import {
  onValueCreated,
  onValueWritten,
  onValueDeleted,
  onValueUpdated,
  DatabaseEvent,
  DataSnapshot,
} from "firebase-functions/v2/database";
import { Change } from "firebase-functions/v2";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import {
  createTagIndexAdditions,
  createTagIndexRemovals,
  createTagIndexUpdate,
  readBlueprintTags,
  readTagList,
} from "./tag-index";

initializeApp();

export const onBlueprintCreate = onValueCreated(
  "/blueprints/{blueprintId}",
  async (event: DatabaseEvent<DataSnapshot>) => {
    const blueprintId = event.params.blueprintId;
    const tags = readBlueprintTags(event.data.val());

    if (tags.length === 0) {
      functions.logger.log(`Blueprint ${blueprintId} has no tags`);
      return null;
    }

    await getDatabase().ref().update(createTagIndexAdditions(blueprintId, tags));
    functions.logger.log(`Added blueprint ${blueprintId} to ${tags.length} tags`);
    return null;
  },
);

export const onBlueprintUpdate = onValueUpdated(
  "/blueprints/{blueprintId}/tags",
  async (event: DatabaseEvent<Change<DataSnapshot>>) => {
    const blueprintId = event.params.blueprintId;
    const previousTags = readTagList(event.data.before.val());
    const currentTags = readTagList(event.data.after.val());
    const addedTags = currentTags.filter((tag) => !previousTags.includes(tag));
    const removedTags = previousTags.filter((tag) => !currentTags.includes(tag));

    if (addedTags.length === 0 && removedTags.length === 0) {
      functions.logger.log(`Blueprint ${blueprintId} has no tag changes`);
      return null;
    }

    await getDatabase()
      .ref()
      .update(createTagIndexUpdate(blueprintId, previousTags, currentTags));
    functions.logger.log(
      `Updated tags for blueprint ${blueprintId}: +${addedTags.length} -${removedTags.length}`,
    );
    return null;
  },
);

export const onBlueprintDelete = onValueDeleted(
  "/blueprints/{blueprintId}",
  async (event: DatabaseEvent<DataSnapshot>) => {
    const blueprintId = event.params.blueprintId;
    const tags = readBlueprintTags(event.data.val());

    if (tags.length === 0) {
      functions.logger.log(`Deleted blueprint ${blueprintId} had no tags`);
      return null;
    }

    await getDatabase().ref().update(createTagIndexRemovals(blueprintId, tags));
    functions.logger.log(`Removed blueprint ${blueprintId} from ${tags.length} tags`);
    return null;
  },
);

/**
 * Cloud Function to maintain numberOfFavorites count
 * Triggers when a user adds or removes a favorite
 */
export const updateFavoriteCount = onValueWritten(
  "/users/{userId}/favorites/{blueprintId}",
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

    const database = getDatabase();

    // Check if the blueprint still exists before making any updates.
    // This prevents re-creating deleted blueprints when cleanupFavoritesOnBlueprintDelete
    // removes user favorites and triggers this function.
    const blueprintSnapshot = await database.ref(`/blueprints/${blueprintId}`).once("value");
    if (!blueprintSnapshot.exists()) {
      functions.logger.log(
        `Blueprint ${blueprintId} no longer exists, skipping favorite update (user ${userId})`,
      );
      return null;
    }

    // Update the blueprint's favorites record to match.
    const blueprintFavoriteRef = database.ref(`/blueprints/${blueprintId}/favorites/${userId}`);
    if (afterValue === true) {
      await blueprintFavoriteRef.set(true);
    } else {
      await blueprintFavoriteRef.remove();
    }

    // Get all favorites for this blueprint to calculate the accurate count
    const favoritesSnapshot = await database
      .ref(`/blueprints/${blueprintId}/favorites`)
      .once("value");

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
      `Updated favorite count for blueprint ${blueprintId}: ${favoriteCount} (user ${userId} ${wasAdded ? "added" : "removed"} favorite)`,
    );

    return null;
  },
);

/**
 * Cloud Function to clean up user favorites when a blueprint is deleted.
 */
export const cleanupFavoritesOnBlueprintDelete = onValueDeleted(
  "/blueprints/{blueprintId}",
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

    const database = getDatabase();
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
 * Cloud Function to clean up user collections when a blueprint is deleted.
 *
 * Unlike favorites (which are denormalized onto each blueprint), collection
 * membership is only stored at /users/{uid}/collection/{blueprintId}. The
 * deleted blueprint snapshot doesn't tell us who collected it, so we scan
 * /users. Acceptable at current scale; if blueprint deletes become hot,
 * denormalize a `collectors` map onto the blueprint and read it directly.
 */
export const cleanupCollectionsOnBlueprintDelete = onValueDeleted(
  "/blueprints/{blueprintId}",
  async (event: DatabaseEvent<DataSnapshot>) => {
    const blueprintId = event.params.blueprintId;
    const database = getDatabase();

    const usersSnapshot = await database.ref("/users").once("value");
    const users = usersSnapshot.val() || {};

    const updates: Record<string, null> = {};
    let collectorCount = 0;

    for (const userId of Object.keys(users)) {
      if (users[userId]?.collection?.[blueprintId] === true) {
        updates[`/users/${userId}/collection/${blueprintId}`] = null;
        collectorCount++;
      }
    }

    if (collectorCount === 0) {
      functions.logger.log(`Blueprint ${blueprintId} deleted with no collections to clean up`);
      return null;
    }

    await database.ref().update(updates);
    functions.logger.log(
      `Cleaned up deleted blueprint ${blueprintId}: removed from ${collectorCount} users' collections`,
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
    res.status(403).send("Unauthorized");
    return;
  }

  const database = getDatabase();

  const blueprintsSnapshot = await database.ref("/blueprints").once("value");
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
      message: "All favorite counts are already accurate",
      reconciled: 0,
    });
  }
});

/**
 * Reconcile one blueprint's favorite count from the moderator UI.
 */
export const reconcileFavoriteCount = onCall(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const blueprintId = request.data?.blueprintId;
  if (
    typeof blueprintId !== "string" ||
    blueprintId.length === 0 ||
    /[.#$[\]/]/.test(blueprintId)
  ) {
    throw new HttpsError("invalid-argument", "A valid blueprintId is required.");
  }

  const database = getDatabase();
  const moderatorSnapshot = await database.ref(`/moderators/${userId}`).once("value");
  if (moderatorSnapshot.val() !== true) {
    throw new HttpsError("permission-denied", "Moderator access is required.");
  }

  const blueprintSnapshot = await database.ref(`/blueprints/${blueprintId}`).once("value");
  if (!blueprintSnapshot.exists()) {
    throw new HttpsError("not-found", "Blueprint not found.");
  }

  const blueprint = blueprintSnapshot.val();
  const favorites = blueprint.favorites ?? {};
  const actualCount = Object.values(favorites).filter((value) => value === true).length;
  const previousBlueprintCount =
    typeof blueprint.numberOfFavorites === "number" ? blueprint.numberOfFavorites : 0;

  const summaryCountSnapshot = await database
    .ref(`/blueprintSummaries/${blueprintId}/numberOfFavorites`)
    .once("value");
  const summaryCount = summaryCountSnapshot.val();
  const previousSummaryCount = typeof summaryCount === "number" ? summaryCount : 0;
  const hasDiscrepancy =
    previousBlueprintCount !== actualCount || previousSummaryCount !== actualCount;

  if (hasDiscrepancy) {
    await database.ref().update({
      [`/blueprints/${blueprintId}/numberOfFavorites`]: actualCount,
      [`/blueprintSummaries/${blueprintId}/numberOfFavorites`]: actualCount,
    });
  }

  return {
    blueprintId,
    actualCount,
    previousBlueprintCount,
    previousSummaryCount,
    hasDiscrepancy,
    reconciled: hasDiscrepancy,
  };
});

/**
 * Cloud Function to initialize user profile when a new user signs up.
 * Creates the /users/{userId} record with displayName, email, and empty collections.
 * This ensures all users have a profile in the database for consistent data access.
 */
export const initializeUserProfile = functionsV1.auth.user().onCreate(async (user) => {
  const database = getDatabase();
  const userRef = database.ref(`/users/${user.uid}`);

  // Check if user profile already exists (safety check)
  const existingProfile = await userRef.once("value");
  if (existingProfile.exists()) {
    functions.logger.log(`User profile already exists for ${user.uid}, skipping initialization`);
    return null;
  }

  await userRef.set({
    displayName: user.displayName || "Anonymous",
    email: user.email || null,
    favorites: {},
    collection: {},
    blueprints: {},
  });

  functions.logger.log(`Initialized user profile for ${user.uid} (${user.email || "no email"})`);
  return null;
});

/**
 * Cloud Function to clean up when a user deletes their account.
 * Removes the user from all blueprints' favorites lists and deletes the user record.
 * User's authored blueprints remain in the database (orphaned).
 */
export const cleanupOnUserDelete = functionsV1.auth.user().onDelete(async (user) => {
  const database = getDatabase();
  const userId = user.uid;

  try {
    // Get user's favorites and blueprints
    const userSnapshot = await database.ref(`/users/${userId}`).once("value");
    const userData = userSnapshot.val() || {};

    const updates: Record<string, null> = {};

    // Remove this user from all blueprints' favorites lists
    for (const blueprintId of Object.keys(userData.favorites || {})) {
      updates[`/blueprints/${blueprintId}/favorites/${userId}`] = null;
    }

    // Delete the user record itself
    updates[`/users/${userId}`] = null;

    await database.ref().update(updates);

    functions.logger.log(
      `Cleaned up deleted user ${userId}: removed from ${Object.keys(userData.favorites || {}).length} blueprints' favorites`,
    );

    return null;
  } catch (error) {
    functions.logger.error(`Error cleaning up deleted user ${userId}:`, error);
    throw error;
  }
});
