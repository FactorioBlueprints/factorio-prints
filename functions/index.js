const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const database = admin.database();

/**
 * Cloud function to update byTag when a blueprint is created
 */
exports.onBlueprintCreate = functions.database.ref('/blueprints/{blueprintId}').onCreate(async (snapshot, context) => {
	const blueprintId = context.params.blueprintId;
	const blueprint = snapshot.val();

	if (!blueprint || !blueprint.tags || !Array.isArray(blueprint.tags)) {
		console.log(`Blueprint ${blueprintId} has no tags`);
		return null;
	}

	const updates = {};
	blueprint.tags.forEach((tag) => {
		updates[`/byTag/${tag}/${blueprintId}`] = true;
	});

	console.log(`Adding blueprint ${blueprintId} to ${blueprint.tags.length} tags`);
	return database.ref().update(updates);
});

/**
 * Cloud function to update byTag when a blueprint is updated
 */
exports.onBlueprintUpdate = functions.database.ref('/blueprints/{blueprintId}').onUpdate(async (change, context) => {
	const blueprintId = context.params.blueprintId;
	const beforeData = change.before.val();
	const afterData = change.after.val();

	// Handle case where blueprint might be soft-deleted
	if (!afterData) {
		console.log(`Blueprint ${blueprintId} was deleted`);
		return null;
	}

	const beforeTags = beforeData?.tags || [];
	const afterTags = afterData?.tags || [];

	// Find tags that were added and removed
	const addedTags = afterTags.filter((tag) => !beforeTags.includes(tag));
	const removedTags = beforeTags.filter((tag) => !afterTags.includes(tag));

	if (addedTags.length === 0 && removedTags.length === 0) {
		console.log(`No tag changes for blueprint ${blueprintId}`);
		return null;
	}

	const updates = {};

	// Add blueprint to new tags
	addedTags.forEach((tag) => {
		updates[`/byTag/${tag}/${blueprintId}`] = true;
	});

	// Remove blueprint from old tags
	removedTags.forEach((tag) => {
		updates[`/byTag/${tag}/${blueprintId}`] = null;
	});

	console.log(`Updating tags for blueprint ${blueprintId}: +${addedTags.length} -${removedTags.length}`);
	return database.ref().update(updates);
});

/**
 * Cloud function to update byTag when a blueprint is deleted
 */
exports.onBlueprintDelete = functions.database.ref('/blueprints/{blueprintId}').onDelete(async (snapshot, context) => {
	const blueprintId = context.params.blueprintId;
	const blueprint = snapshot.val();

	if (!blueprint || !blueprint.tags || !Array.isArray(blueprint.tags)) {
		console.log(`Deleted blueprint ${blueprintId} had no tags`);
		return null;
	}

	const updates = {};
	blueprint.tags.forEach((tag) => {
		updates[`/byTag/${tag}/${blueprintId}`] = null;
	});

	console.log(`Removing blueprint ${blueprintId} from ${blueprint.tags.length} tags`);
	return database.ref().update(updates);
});
