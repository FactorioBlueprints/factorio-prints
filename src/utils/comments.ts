import type {RawComment, EnrichedComment} from '../schemas';

export function enrichComments(rawComments: Record<string, RawComment>): EnrichedComment[] {
	const enrichedMap = new Map<string, EnrichedComment>();
	const topLevelComments: EnrichedComment[] = [];

	// First pass: create enriched comments
	for (const [id, rawComment] of Object.entries(rawComments)) {
		const enriched: EnrichedComment = {
			...rawComment,
			id,
			replyComments: [],
		};
		enrichedMap.set(id, enriched);
	}

	// Second pass: organize into hierarchy
	for (const enriched of enrichedMap.values()) {
		if (enriched.parentId) {
			const parent = enrichedMap.get(enriched.parentId);
			if (parent) {
				parent.replyComments = parent.replyComments || [];
				parent.replyComments.push(enriched);
			} else {
				// Parent not found, treat as top-level
				topLevelComments.push(enriched);
			}
		} else {
			topLevelComments.push(enriched);
		}
	}

	// Sort comments by creation date (newest first for top-level, oldest first for replies)
	const sortComments = (comments: EnrichedComment[], isTopLevel = false): void => {
		comments.sort((a, b) => {
			if (isTopLevel) {
				return b.createdAt - a.createdAt; // Newest first for top-level
			}
			return a.createdAt - b.createdAt; // Oldest first for replies
		});

		// Recursively sort replies
		for (const comment of comments) {
			if (comment.replyComments && comment.replyComments.length > 0) {
				sortComments(comment.replyComments, false);
			}
		}
	};

	sortComments(topLevelComments, true);
	return topLevelComments;
}
