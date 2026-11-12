import
{
	type AuthUser,
	blueprintEvent,
	commentEvent,
	type IngestEvent,
	moderatorsEvent,
	tagListEvent,
	userEvent,
} from "../functions/src/ingestEvents.ts";

// Turns a Realtime Database dump into the blueprints Worker's POST /reconcile requests. Events carry the dump's raw
// nodes at the dump instant, exactly as live ingest sends them, so the Worker maps them with the same code.

type Node = Record<string, unknown>;
type NodeMap = Record<string, Node>;

/** Ingest events plus the whole-list events only the reconciler sends. */
export type ReconcileEvent =
	| IngestEvent
	|
	  {
			type: "favoriteList";
			eventTime: number;
			userId: string;
			favorites: unknown;
	  }
	|
	  {
			type: "collectionList";
			eventTime: number;
			userId: string;
			collection: unknown;
	  };

export interface RealtimeDump
{
	blueprints?: NodeMap;
	blueprintsPrivate?: NodeMap;
	thumbnails?: Record<string, string>;
	users?: NodeMap;
	comments?: Record<string, NodeMap>;
	moderators?: Record<string, boolean>;
	byTag?: Record<string, Record<string, unknown>>;
}

export interface ReconcileRequestBody
{
	mode: "shadow" | "repair";
	events: ReconcileEvent[];
	expectedBlueprintKeys?: string[];
	dumpTime?: number;
	amendAudit?: boolean;
}

export interface ReconcileResponse
{
	drift:
	{
		event: Record<string, string>;
		changes: unknown[];
	}[];
	stale: number;
	ignored: number;
	amended: number;
}

export interface BuildOptions
{
	dumpTime: number;
	mode: "shadow" | "repair";
	chunkSize: number;
	/**
	 * The event time of a blueprint: the dump instant (the default), or the blueprint's own lastUpdatedDate, so a
	 * version the dump brings in is dated by the save that made it. A blueprint without the date uses the dump instant.
	 */
	blueprintTime?: "dump" | "lastUpdatedDate";
	/** A Firebase Auth export. Without one, user profiles are not reconciled. */
	authUsers?: readonly AuthUser[];
}

const dumpEvents = (dump: RealtimeDump, options: BuildOptions): ReconcileEvent[] =>
{
	const {dumpTime} = options;
	const events: ReconcileEvent[] = [];
	if (dump.moderators !== undefined) events.push(moderatorsEvent(dump.moderators, dumpTime));
	if (dump.byTag !== undefined) events.push(tagListEvent(dump.byTag, dumpTime));

	// Blueprints first: favorites and collection entries only count for blueprints that exist.
	for (const [key, blueprint] of Object.entries(dump.blueprints ?? {}))
	{
		events.push(
			blueprintEvent(
				key,
				blueprint,
				dump.blueprintsPrivate?.[key] ?? null,
				dump.thumbnails?.[key] ?? null,
				options.blueprintTime === "lastUpdatedDate" && typeof blueprint.lastUpdatedDate === "number"
					? blueprint.lastUpdatedDate
					: dumpTime,
			),
		);
	}

	const authByUserId = options.authUsers && new Map(options.authUsers.map((user) => [user.localId, user]));
	for (const [userId, user] of Object.entries(dump.users ?? {}))
	{
		// A user whose last favorite or collection entry was removed has no such node left, so an absent node is an
		// empty list: it ends whatever the store still holds for them.
		events.push(
			{
				type: "favoriteList",
				eventTime: dumpTime,
				userId,
				favorites: user.favorites ?? {},
			},
			{
				type: "collectionList",
				eventTime: dumpTime,
				userId,
				collection: user.collection ?? {},
			},
		);
		if (authByUserId !== undefined)
		{
			events.push(userEvent(userId, user, authByUserId.get(userId) ?? null, dumpTime));
		}
	}

	for (const [blueprintKey, comments] of Object.entries(dump.comments ?? {}))
	{
		for (const [commentId, comment] of Object.entries(comments))
		{
			events.push(commentEvent(blueprintKey, commentId, comment, dumpTime));
		}
	}
	return events;
};

/**
 * Splits the dump's events into requests of `chunkSize`. A final request lists every blueprint key, so the Worker
 * can phase out current blueprints the dump no longer has.
 */
export const buildReconcileRequests = (dump: RealtimeDump, options: BuildOptions): ReconcileRequestBody[] =>
{
	const events = dumpEvents(dump, options);
	const requests: ReconcileRequestBody[] = [];
	for (let start = 0; start < events.length; start += options.chunkSize)
	{
		requests.push(
			{
				mode: options.mode,
				events: events.slice(start, start + options.chunkSize),
			},
		);
	}
	if (dump.blueprints !== undefined)
	{
		requests.push(
			{
				mode: options.mode,
				events: [],
				expectedBlueprintKeys: Object.keys(dump.blueprints),
				dumpTime: options.dumpTime,
			},
		);
	}
	return requests;
};
