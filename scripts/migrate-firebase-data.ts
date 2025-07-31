/**
 * Migration script to fix existing data issues before applying new rules
 * Run this script before deploying the improved Firebase rules
 */

import * as admin from 'firebase-admin';

// Initialize admin SDK with your service account
admin.initializeApp({
	// Add your Firebase config here
});

const db = admin.database();

interface MigrationStats {
	blueprintsProcessed: number;
	summariesFixed: number;
	favoriteCountsFixed: number;
	tagsFixed: number;
	usersProcessed: number;
	errors: string[];
}

async function migrateDatabase(): Promise<MigrationStats> {
	const stats: MigrationStats = {
		blueprintsProcessed: 0,
		summariesFixed: 0,
		favoriteCountsFixed: 0,
		tagsFixed: 0,
		usersProcessed: 0,
		errors: [],
	};

	console.log('Starting database migration...');

	try {
		// Step 1: Fix blueprint data
		await fixBlueprints(stats);

		// Step 2: Sync blueprint summaries
		await syncBlueprintSummaries(stats);

		// Step 3: Fix favorite counts
		await fixFavoriteCounts(stats);

		// Step 4: Clean up tags
		await cleanupTags(stats);

		// Step 5: Fix user data
		await fixUserData(stats);

		console.log('Migration completed successfully!');
		console.log(stats);
	} catch (error) {
		console.error('Migration failed:', error);
		stats.errors.push(`Fatal error: ${error}`);
	}

	return stats;
}

async function fixBlueprints(stats: MigrationStats): Promise<void> {
	console.log('Fixing blueprints...');

	const blueprintsSnapshot = await db.ref('/blueprints').once('value');
	const blueprints = blueprintsSnapshot.val() || {};
	const updates: Record<string, any> = {};

	for (const [blueprintId, blueprint] of Object.entries(blueprints)) {
		const bp = blueprint as any;
		stats.blueprintsProcessed++;

		// Ensure required fields exist
		if (!bp.title) {
			updates[`/blueprints/${blueprintId}/title`] = 'Untitled Blueprint';
		}

		// Ensure author structure
		if (!bp.author && bp.authorId) {
			updates[`/blueprints/${blueprintId}/author`] = {
				userId: bp.authorId,
				displayName: null,
			};
		}

		// Initialize favorites if missing
		if (bp.favorites === undefined) {
			updates[`/blueprints/${blueprintId}/favorites`] = {};
		}

		// Initialize numberOfFavorites if missing
		if (bp.numberOfFavorites === undefined) {
			updates[`/blueprints/${blueprintId}/numberOfFavorites`] = 0;
		}

		// Ensure tags is an array
		if (bp.tags && !Array.isArray(bp.tags)) {
			const tagArray = Object.keys(bp.tags).filter((key) => bp.tags[key] === true);
			updates[`/blueprints/${blueprintId}/tags`] = tagArray;
		}

		// Validate image structure
		if (bp.image && (!bp.image.id || !bp.image.type)) {
			if (bp.imageId) {
				updates[`/blueprints/${blueprintId}/image`] = {
					id: bp.imageId,
					type: bp.imageType || 'image/png',
				};
			}
		}
	}

	if (Object.keys(updates).length > 0) {
		await db.ref().update(updates);
		console.log(`Fixed ${Object.keys(updates).length} blueprint issues`);
	}
}

async function syncBlueprintSummaries(stats: MigrationStats): Promise<void> {
	console.log('Syncing blueprint summaries...');

	const blueprintsSnapshot = await db.ref('/blueprints').once('value');
	const blueprints = blueprintsSnapshot.val() || {};
	const summariesSnapshot = await db.ref('/blueprintSummaries').once('value');
	const summaries = summariesSnapshot.val() || {};
	const updates: Record<string, any> = {};

	// Create missing summaries and fix existing ones
	for (const [blueprintId, blueprint] of Object.entries(blueprints)) {
		const bp = blueprint as any;
		const summary = summaries[blueprintId];

		if (!summary) {
			// Create missing summary
			updates[`/blueprintSummaries/${blueprintId}`] = {
				title: bp.title,
				imgurId: bp.image?.id || bp.imageId || '',
				imgurType: bp.image?.type || bp.imageType || 'image/png',
				numberOfFavorites: bp.numberOfFavorites || 0,
				lastUpdatedDate: bp.lastUpdatedDate || Date.now(),
			};
			stats.summariesFixed++;
		} else {
			// Fix existing summary
			let needsUpdate = false;
			const summaryUpdate: Record<string, any> = {};

			if (summary.title !== bp.title) {
				summaryUpdate.title = bp.title;
				needsUpdate = true;
			}

			if (summary.lastUpdatedDate !== bp.lastUpdatedDate) {
				summaryUpdate.lastUpdatedDate = bp.lastUpdatedDate;
				needsUpdate = true;
			}

			if (summary.numberOfFavorites !== bp.numberOfFavorites) {
				summaryUpdate.numberOfFavorites = bp.numberOfFavorites || 0;
				needsUpdate = true;
			}

			if (needsUpdate) {
				Object.keys(summaryUpdate).forEach((key) => {
					updates[`/blueprintSummaries/${blueprintId}/${key}`] = summaryUpdate[key];
				});
				stats.summariesFixed++;
			}
		}
	}

	// Remove orphaned summaries
	for (const summaryId of Object.keys(summaries)) {
		if (!blueprints[summaryId]) {
			updates[`/blueprintSummaries/${summaryId}`] = null;
			stats.summariesFixed++;
		}
	}

	if (Object.keys(updates).length > 0) {
		await db.ref().update(updates);
		console.log(`Fixed ${stats.summariesFixed} summary issues`);
	}
}

async function fixFavoriteCounts(stats: MigrationStats): Promise<void> {
	console.log('Fixing favorite counts...');

	const blueprintsSnapshot = await db.ref('/blueprints').once('value');
	const blueprints = blueprintsSnapshot.val() || {};
	const updates: Record<string, any> = {};

	for (const [blueprintId, blueprint] of Object.entries(blueprints)) {
		const bp = blueprint as any;
		const favorites = bp.favorites || {};

		// Count actual favorites
		const actualCount = Object.values(favorites).filter((v) => v === true).length;
		const storedCount = bp.numberOfFavorites || 0;

		if (actualCount !== storedCount) {
			updates[`/blueprints/${blueprintId}/numberOfFavorites`] = actualCount;
			updates[`/blueprintSummaries/${blueprintId}/numberOfFavorites`] = actualCount;
			stats.favoriteCountsFixed++;
		}
	}

	if (Object.keys(updates).length > 0) {
		await db.ref().update(updates);
		console.log(`Fixed ${stats.favoriteCountsFixed} favorite counts`);
	}
}

async function cleanupTags(stats: MigrationStats): Promise<void> {
	console.log('Cleaning up tags...');

	const blueprintsSnapshot = await db.ref('/blueprints').once('value');
	const blueprints = blueprintsSnapshot.val() || {};
	const byTagSnapshot = await db.ref('/byTag').once('value');
	const byTag = byTagSnapshot.val() || {};
	const updates: Record<string, any> = {};

	// Build correct tag associations
	const correctTagAssociations: Record<string, Record<string, boolean>> = {};

	for (const [blueprintId, blueprint] of Object.entries(blueprints)) {
		const bp = blueprint as any;
		const tags = bp.tags || [];

		for (const tag of tags) {
			if (!correctTagAssociations[tag]) {
				correctTagAssociations[tag] = {};
			}
			correctTagAssociations[tag][blueprintId] = true;
		}
	}

	// Fix byTag data
	for (const [tag, blueprintIds] of Object.entries(byTag)) {
		const correctBlueprints = correctTagAssociations[tag] || {};
		const currentBlueprints = blueprintIds as Record<string, boolean>;

		// Remove invalid entries
		for (const blueprintId of Object.keys(currentBlueprints)) {
			if (!correctBlueprints[blueprintId]) {
				updates[`/byTag/${tag}/${blueprintId}`] = null;
				stats.tagsFixed++;
			}
		}

		// Add missing entries
		for (const blueprintId of Object.keys(correctBlueprints)) {
			if (!currentBlueprints[blueprintId]) {
				updates[`/byTag/${tag}/${blueprintId}`] = true;
				stats.tagsFixed++;
			}
		}
	}

	// Add missing tag categories
	for (const tag of Object.keys(correctTagAssociations)) {
		if (!byTag[tag]) {
			updates[`/byTag/${tag}`] = correctTagAssociations[tag];
			stats.tagsFixed++;
		}
	}

	// Remove empty tag categories
	for (const tag of Object.keys(byTag)) {
		if (!correctTagAssociations[tag]) {
			updates[`/byTag/${tag}`] = null;
			stats.tagsFixed++;
		}
	}

	if (Object.keys(updates).length > 0) {
		await db.ref().update(updates);
		console.log(`Fixed ${stats.tagsFixed} tag issues`);
	}
}

async function fixUserData(stats: MigrationStats): Promise<void> {
	console.log('Fixing user data...');

	const usersSnapshot = await db.ref('/users').once('value');
	const users = usersSnapshot.val() || {};
	const blueprintSummariesSnapshot = await db.ref('/blueprintSummaries').once('value');
	const blueprintSummaries = blueprintSummariesSnapshot.val() || {};
	const updates: Record<string, any> = {};

	for (const [userId, user] of Object.entries(users)) {
		const userData = user as any;
		stats.usersProcessed++;

		// Clean up invalid favorites
		if (userData.favorites) {
			for (const blueprintId of Object.keys(userData.favorites)) {
				if (!blueprintSummaries[blueprintId] || userData.favorites[blueprintId] !== true) {
					updates[`/users/${userId}/favorites/${blueprintId}`] = null;
				}
			}
		}

		// Clean up invalid blueprints
		if (userData.blueprints) {
			for (const blueprintId of Object.keys(userData.blueprints)) {
				if (!blueprintSummaries[blueprintId] || userData.blueprints[blueprintId] !== true) {
					updates[`/users/${userId}/blueprints/${blueprintId}`] = null;
				}
			}
		}
	}

	if (Object.keys(updates).length > 0) {
		await db.ref().update(updates);
		console.log(`Fixed user data issues`);
	}
}

// Run the migration
migrateDatabase()
	.then((stats) => {
		console.log('Migration complete!', stats);
		process.exit(0);
	})
	.catch((error) => {
		console.error('Migration failed:', error);
		process.exit(1);
	});
