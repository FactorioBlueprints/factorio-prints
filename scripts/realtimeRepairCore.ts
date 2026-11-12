/**
 * Plans corrections to the Realtime Database's own bookkeeping, as multi-path updates, from a backup and the
 * blueprint store. The runner in planRealtimeRepairs.ts reads the inputs and writes the plans; nothing here or
 * there writes to the database.
 */

export type RealtimeUpdates = Record<string, number | null>;

export interface DatedBlueprint
{
	id: string;
	title: string;
	/** lastUpdatedDate in the Realtime Database. */
	realtimeDate: number;
	/** When the store's current version began: the last time anything stored changed. */
	storeDate: number;
}

/**
 * A save that changed nothing still moved lastUpdatedDate forward. Where the store's current version began before
 * the Realtime date, both of the blueprint's dates go back to it. A blueprint whose store version is the newer one
 * changed without a save, and is only listed.
 */
export const planDateRepairs = (blueprints: readonly DatedBlueprint[]) =>
{
	const updates: RealtimeUpdates = {};
	const repaired:
	{
		id: string;
		title: string;
		realtimeDate: number;
		newDate: number;
	}[] = [];
	const storeNewer: string[] = [];
	for (const {id, title, realtimeDate, storeDate} of blueprints)
	{
		if (storeDate > realtimeDate)
		{
			storeNewer.push(id);
		}
		else if (storeDate < realtimeDate)
		{
			updates[`/blueprints/${id}/lastUpdatedDate`] = storeDate;
			updates[`/blueprintSummaries/${id}/lastUpdatedDate`] = storeDate;
			repaired.push(
				{
					id,
					title,
					realtimeDate,
					newDate: storeDate,
				},
			);
		}
	}
	return {
		updates,
		repaired,
		storeNewer,
	};
};

export interface FavoritedBlueprint
{
	id: string;
	authorId: string;
	/** The users whose favorite the Realtime Database records. */
	favorites: readonly string[];
	blueprintCounter: number;
	summaryCounter: number;
}

const removalReason = (userId: string, blueprint: FavoritedBlueprint, accounts: ReadonlySet<string>) =>
{
	if (userId === blueprint.authorId) return "own blueprint";
	return accounts.has(userId) ? undefined : "account no longer exists";
};

/**
 * The favorites the store does not count: an author's favorite of their own blueprint, and favorites of accounts
 * that no longer exist. Each is removed from the user's list and from the blueprint's.
 */
export const planFavoriteRemovals = (blueprints: readonly FavoritedBlueprint[], accounts: ReadonlySet<string>) =>
{
	const updates: RealtimeUpdates = {};
	const removed:
	{
		id: string;
		userId: string;
		why: string;
	}[] = [];
	for (const blueprint of blueprints)
	{
		for (const userId of blueprint.favorites)
		{
			const why = removalReason(userId, blueprint, accounts);
			if (why === undefined) continue;
			updates[`/users/${userId}/favorites/${blueprint.id}`] = null;
			updates[`/blueprints/${blueprint.id}/favorites/${userId}`] = null;
			removed.push(
				{
					id: blueprint.id,
					userId,
					why,
				},
			);
		}
	}
	return {
		updates,
		removed,
	};
};

/** Each numberOfFavorites, on the blueprint and on its summary, that differs from the favorites that remain. */
export const planCounterRepairs = (blueprints: readonly FavoritedBlueprint[], accounts: ReadonlySet<string>) =>
{
	const updates: RealtimeUpdates = {};
	const repaired:
	{
		id: string;
		blueprintCounter: number;
		summaryCounter: number;
		favorites: number;
		newValue: number;
	}[] = [];
	for (const blueprint of blueprints)
	{
		const newValue = blueprint.favorites.filter(
			(userId) => removalReason(userId, blueprint, accounts) === undefined,
		).length;
		if (blueprint.blueprintCounter === newValue && blueprint.summaryCounter === newValue) continue;
		if (blueprint.blueprintCounter !== newValue)
			updates[`/blueprints/${blueprint.id}/numberOfFavorites`] = newValue;
		if (blueprint.summaryCounter !== newValue)
		{
			updates[`/blueprintSummaries/${blueprint.id}/numberOfFavorites`] = newValue;
		}
		repaired.push(
			{
				id: blueprint.id,
				blueprintCounter: blueprint.blueprintCounter,
				summaryCounter: blueprint.summaryCounter,
				favorites: blueprint.favorites.length,
				newValue,
			},
		);
	}
	return {
		updates,
		repaired,
	};
};

/**
 * Splits a plan into updates of at most `subjects` blueprints or users each, keeping one subject's paths together.
 * One write may trigger only a limited number of Cloud Functions, and each of these paths triggers some.
 */
export const chunkUpdates = (updates: RealtimeUpdates, subjects: number): RealtimeUpdates[] =>
{
	const chunks: RealtimeUpdates[] = [];
	let current: RealtimeUpdates = {};
	let seen = new Set<string>();
	for (const [path, value] of Object.entries(updates))
	{
		const subject = path.split("/")[2];
		if (!seen.has(subject) && seen.size === subjects)
		{
			chunks.push(current);
			current = {};
			seen = new Set();
		}
		seen.add(subject);
		current[path] = value;
	}
	if (Object.keys(current).length > 0) chunks.push(current);
	return chunks;
};
