import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {onValueWritten, onValueDeleted, DatabaseEvent, DataSnapshot} from 'firebase-functions/v2/database';
import {Change} from 'firebase-functions/v2';
import {onRequest} from 'firebase-functions/v2/https';
import axios from 'axios';

admin.initializeApp();

// Define the comment data structure
interface CommentData {
	blueprintId: string;
	authorId: string;
	authorDisplayName: string;
	content: string;
	parentId?: string;
}

// Perspective API response structure
interface PerspectiveResponse {
	attributeScores: {
		TOXICITY?: {
			summaryScore: {
				value: number;
			};
		};
		SEVERE_TOXICITY?: {
			summaryScore: {
				value: number;
			};
		};
		THREAT?: {
			summaryScore: {
				value: number;
			};
		};
		INSULT?: {
			summaryScore: {
				value: number;
			};
		};
		PROFANITY?: {
			summaryScore: {
				value: number;
			};
		};
		IDENTITY_ATTACK?: {
			summaryScore: {
				value: number;
			};
		};
	};
}

// Thresholds for different types of toxicity (0-1 scale)
const TOXICITY_THRESHOLDS = {
	TOXICITY: 0.75,
	SEVERE_TOXICITY: 0.5,
	THREAT: 0.5,
	INSULT: 0.75,
	PROFANITY: 0.8,
	IDENTITY_ATTACK: 0.5,
};

/**
 * Analyzes text for toxicity using available moderation APIs
 */
async function analyzeToxicity(text: string): Promise<{
	isToxic: boolean;
	scores: Record<string, number>;
	reasons: string[];
}> {
	// Try OpenAI first (easier to set up)
	const openaiKey = functions.config().openai?.api_key;
	if (openaiKey) {
		return analyzeWithOpenAI(text, openaiKey);
	}

	// Fall back to Perspective API
	const perspectiveKey = functions.config().perspective?.api_key;
	if (perspectiveKey) {
		return analyzeWithPerspective(text, perspectiveKey);
	}

	// No moderation configured
	console.warn('No toxicity detection API configured. Allowing all comments.');
	return {isToxic: false, scores: {}, reasons: []};
}

/**
 * Analyzes text using OpenAI Moderation API (free with any OpenAI key)
 */
async function analyzeWithOpenAI(
	text: string,
	apiKey: string,
): Promise<{
	isToxic: boolean;
	scores: Record<string, number>;
	reasons: string[];
}> {
	try {
		const response = await axios.post(
			'https://api.openai.com/v1/moderations',
			{input: text},
			{
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
			},
		);

		const result = response.data.results[0];
		const scores: Record<string, number> = {};
		const reasons: string[] = [];

		for (const [category, flagged] of Object.entries(result.categories)) {
			const score = result.category_scores[category as keyof typeof result.category_scores];
			scores[category] = score;

			if (flagged) {
				reasons.push(`${category.replace(/[/-]/g, ' ')} detected (${Math.round(score * 100)}% confidence)`);
			}
		}

		return {
			isToxic: result.flagged,
			scores,
			reasons,
		};
	} catch (error: any) {
		console.error('Error with OpenAI Moderation API:', error.message);
		return {isToxic: false, scores: {}, reasons: []};
	}
}

/**
 * Analyzes text using Google's Perspective API
 */
async function analyzeWithPerspective(
	text: string,
	apiKey: string,
): Promise<{
	isToxic: boolean;
	scores: Record<string, number>;
	reasons: string[];
}> {
	try {
		const response = await axios.post<PerspectiveResponse>(
			`https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`,
			{
				comment: {text},
				requestedAttributes: {
					TOXICITY: {},
					SEVERE_TOXICITY: {},
					THREAT: {},
					INSULT: {},
					PROFANITY: {},
					IDENTITY_ATTACK: {},
				},
				languages: ['en'], // Add more languages as needed
				doNotStore: true, // Don't store text for training
			},
		);

		const scores: Record<string, number> = {};
		const reasons: string[] = [];
		let isToxic = false;

		// Check each attribute against its threshold
		for (const [attribute, threshold] of Object.entries(TOXICITY_THRESHOLDS)) {
			const score =
				response.data.attributeScores[attribute as keyof typeof response.data.attributeScores]?.summaryScore
					.value;

			if (score !== undefined) {
				scores[attribute] = score;

				if (score >= threshold) {
					isToxic = true;
					reasons.push(
						`${attribute.toLowerCase().replace('_', ' ')} detected (${Math.round(score * 100)}% confidence)`,
					);
				}
			}
		}

		return {isToxic, scores, reasons};
	} catch (error: any) {
		// Handle API errors gracefully
		if (error.response?.status === 400) {
			console.error('Invalid request to Perspective API:', error.response.data);
		} else if (error.response?.status === 429) {
			console.error('Perspective API rate limit exceeded');
		} else {
			console.error('Error analyzing toxicity:', error.message);
		}

		// In case of error, allow the comment but log the issue
		return {isToxic: false, scores: {}, reasons: []};
	}
}

/**
 * Cloud Function to create a comment with toxicity validation
 */
export const createComment = functions.https.onCall(async (data: CommentData, context) => {
	// Verify user is authenticated
	if (!context.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to post comments');
	}

	// Validate required fields
	if (!data.blueprintId || !data.content || !data.authorDisplayName) {
		throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
	}

	// Ensure authorId matches authenticated user
	if (data.authorId !== context.auth.uid) {
		throw new functions.https.HttpsError('permission-denied', 'Cannot post comments as another user');
	}

	// Trim content
	const content = data.content.trim();

	// Check content length
	if (content.length === 0) {
		throw new functions.https.HttpsError('invalid-argument', 'Comment cannot be empty');
	}

	if (content.length > 5000) {
		throw new functions.https.HttpsError('invalid-argument', 'Comment is too long (max 5000 characters)');
	}

	// Analyze content for toxicity
	const {isToxic, scores, reasons} = await analyzeToxicity(content);

	if (isToxic) {
		console.log(`Blocked toxic comment from user ${data.authorId}:`, {
			content: content.substring(0, 100) + '...',
			scores,
			reasons,
		});

		throw new functions.https.HttpsError(
			'failed-precondition',
			'Your comment was flagged for potentially harmful content. Please revise and try again.',
			{reasons, scores},
		);
	}

	// Prepare comment data
	const now = Date.now();
	const commentData = {
		authorId: data.authorId,
		authorDisplayName: data.authorDisplayName,
		content,
		createdAt: now,
		isDeleted: false,
		parentId: data.parentId || null,
	};

	try {
		// Create the comment in the database
		const db = admin.database();
		const commentsRef = db.ref(`/comments/${data.blueprintId}`);
		const newCommentRef = commentsRef.push();
		const commentId = newCommentRef.key!;

		// Prepare batch update
		const updates: {[key: string]: any} = {};
		updates[`/comments/${data.blueprintId}/${commentId}`] = commentData;
		updates[`/users/${data.authorId}/comments/${commentId}`] = true;

		// Execute the update
		await db.ref().update(updates);

		// Log successful comment creation
		console.log(`Comment created: ${commentId} by user ${data.authorId}`);

		return {
			success: true,
			commentId,
			message: 'Comment posted successfully',
		};
	} catch (error) {
		console.error('Error creating comment:', error);
		throw new functions.https.HttpsError('internal', 'Failed to create comment');
	}
});

/**
<<<<<<< HEAD
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
 * Cloud Function to clean up user favorites when a blueprint is deleted
 */
export const cleanupFavoritesOnBlueprintDelete = onValueDeleted(
	'/blueprints/{blueprintId}',
	async (event: DatabaseEvent<DataSnapshot>) => {
		const blueprintId = event.params.blueprintId;
		const snapshot = event.data;
		const blueprint = snapshot.val();

		if (!blueprint || !blueprint.favorites) {
			return null;
		}

		const database = admin.database();
		const updates: Record<string, null> = {};

		// Remove this blueprint from all users' favorites
		const userIds = Object.keys(blueprint.favorites).filter((userId) => blueprint.favorites[userId] === true);

		for (const userId of userIds) {
			updates[`/users/${userId}/favorites/${blueprintId}`] = null;
		}

		// Also remove the summary entry
		updates[`/blueprintSummaries/${blueprintId}`] = null;

		if (Object.keys(updates).length > 0) {
			await database.ref().update(updates);
			functions.logger.log(
				`Cleaned up favorites for deleted blueprint ${blueprintId} from ${userIds.length} users`,
			);
		}

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

/**
 * Alternative: HTTP endpoint for comment creation (if not using callable functions)
 */
export const createCommentHttp = functions.https.onRequest(async (req, res) => {
	// Enable CORS
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') {
		res.status(204).send('');
		return;
	}

	if (req.method !== 'POST') {
		res.status(405).send('Method Not Allowed');
		return;
	}

	try {
		// Verify Firebase Auth token
		const authorization = req.headers.authorization;
		if (!authorization?.startsWith('Bearer ')) {
			res.status(401).json({error: 'Unauthorized'});
			return;
		}

		const idToken = authorization.split('Bearer ')[1];
		const decodedToken = await admin.auth().verifyIdToken(idToken);

		// Process the comment
		const data: CommentData = req.body;
		data.authorId = decodedToken.uid; // Override with authenticated user ID

		// Call the same logic as the callable function
		const result = await createComment(data, {auth: decodedToken} as any);
		res.status(200).json(result);
	} catch (error: any) {
		console.error('Error in createCommentHttp:', error);
		if (error instanceof functions.https.HttpsError) {
			res.status(400).json({
				error: error.message,
				code: error.code,
				details: error.details,
			});
		} else {
			res.status(500).json({error: 'Internal server error'});
		}
	}
});
