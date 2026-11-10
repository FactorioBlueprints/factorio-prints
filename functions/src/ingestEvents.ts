/*
 * Builds the change events the blueprints Worker's POST /ingest accepts, from Realtime Database trigger data.
 * The shapes mirror workers/blueprints/src/ingest/events.ts, which validates them on arrival; the two packages
 * compile separately, so keep them in step by hand. Pure functions: the triggers in index.ts do the reads.
 */

type RealtimeNode = Record<string, unknown>;

interface EventBase
{
	/** Epoch milliseconds when the database committed the change. */
	eventTime: number;
}

export interface AuthUser
{
	localId: string;
	email?: string | null;
	displayName?: string | null;
	photoUrl?: string | null;
	providerUserInfo?:
		|
		  {
				providerId: string;
		  }[]
		| null;
}

export type IngestEvent = EventBase &
	(
		|
		  {
				type: "blueprint";
				key: string;
				blueprint: RealtimeNode | null;
				blueprintPrivate: RealtimeNode | null;
				thumbnail: string | null;
		  }
		|
		  {
				type: "user";
				userId: string;
				profile: RealtimeNode | null;
				authUser: AuthUser | null;
		  }
		|
		  {
				type: "vote";
				userId: string;
				blueprintKey: string;
				favorited: boolean;
		  }
		|
		  {
				type: "collection";
				userId: string;
				blueprintKey: string;
				collected: boolean;
		  }
		|
		  {
				type: "comment";
				blueprintKey: string;
				commentId: string;
				comment: RealtimeNode | null;
		  }
		|
		  {
				type: "moderators";
				moderators: Record<string, boolean> | null;
		  }
		|
		  {
				type: "tags";
				byTag: Record<string, Record<string, Record<string, never>>> | null;
		  }
	);

/** The subset of the Admin SDK's `UserRecord` the Worker uses. */
export interface UserRecordLike
{
	uid: string;
	email?: string;
	displayName?: string;
	photoURL?: string;
	providerData: readonly
	{
		providerId: string;
	}[];
}

// Fields of /blueprints/<key> that are derived elsewhere and never ingested.
const DERIVED_BLUEPRINT_FIELDS = new Set(["favorites", "numberOfFavorites"]);
// Children of /users/<uid> that the user event carries; favorites and collection have their own events.
const PROFILE_FIELDS = new Set([
	"displayName",
	"providerDisplayName",
	"email",
	"emailVerified",
	"photoURL",
	"providerId",
]);

/** The time a CloudEvent reports, in epoch milliseconds. */
export const eventTimeOf = (time: string): number =>
{
	const parsed = Date.parse(time);
	if (Number.isNaN(parsed))
	{
		throw new Error(`Database event has no valid time: ${time}`);
	}
	return parsed;
};

const pick = (node: RealtimeNode, keep: (field: string) => boolean): RealtimeNode =>
	Object.fromEntries(Object.entries(node).filter(([field]) => keep(field)));

export const blueprintEvent = (
	key: string,
	blueprint: RealtimeNode | null,
	blueprintPrivate: RealtimeNode | null,
	thumbnail: string | null,
	eventTime: number,
): IngestEvent => (
{
	type: "blueprint",
	eventTime,
	key,
	blueprint: blueprint === null ? null : pick(blueprint, (field) => !DERIVED_BLUEPRINT_FIELDS.has(field)),
	blueprintPrivate,
	thumbnail,
});

/**
 * A blueprint is listed, found and shown through its summary, so one whose summary is gone is deleted, whether or
 * not its own node was removed with it.
 */
export const listedBlueprint = (summaryLastUpdated: unknown, blueprint: RealtimeNode | null): RealtimeNode | null =>
	summaryLastUpdated === null || summaryLastUpdated === undefined ? null : blueprint;

/**
 * The time of a blueprint event: the lastUpdatedDate its save stamped on the summary, which the blueprint's own
 * date is then made to match, so the stored version carries the date the Realtime Database shows. A deletion, or a
 * summary without a date, uses the time of the write.
 */
export const blueprintSaveTime = (summaryLastUpdated: unknown, writeTime: string): number =>
	typeof summaryLastUpdated === "number" ? summaryLastUpdated : eventTimeOf(writeTime);

export const voteEvent = (userId: string, blueprintKey: string, after: unknown, eventTime: number) => (
{
	type: "vote" as const,
	eventTime,
	userId,
	blueprintKey,
	favorited: after === true,
});

export const collectionEvent = (userId: string, blueprintKey: string, after: unknown, eventTime: number) => (
{
	type: "collection" as const,
	eventTime,
	userId,
	blueprintKey,
	collected: after === true,
});

export const commentEvent = (
	blueprintKey: string,
	commentId: string,
	after: RealtimeNode | null,
	eventTime: number,
) => (
{
	type: "comment" as const,
	eventTime,
	blueprintKey,
	commentId,
	comment: after,
});

export const moderatorsEvent = (moderators: Record<string, boolean> | null, eventTime: number): IngestEvent => (
{
	type: "moderators",
	eventTime,
	moderators,
});

/** /byTag lists every blueprint under each tag; the Worker needs only the tags themselves. */
export const tagListEvent = (byTag: Record<string, Record<string, unknown>> | null, eventTime: number): IngestEvent => (
{
	type: "tags",
	eventTime,
	byTag:
		byTag === null
			? null
			: Object.fromEntries(
					Object.entries(byTag).map(([category, names]) => [
						category,
						Object.fromEntries(Object.keys(names ?? {}).map((name) => [name, {}])),
					]),
				),
});

export const profileFieldChanged = (field: string): boolean => PROFILE_FIELDS.has(field);

export const toAuthUser = (record: UserRecordLike): AuthUser => (
{
	localId: record.uid,
	email: record.email ?? null,
	displayName: record.displayName ?? null,
	photoUrl: record.photoURL ?? null,
	providerUserInfo: record.providerData.map(({providerId}) => (
	{
		providerId,
	})),
});

/** `authUser` is the Admin SDK record, or null when the account no longer exists. */
export const userEvent = (
	userId: string,
	profile: RealtimeNode | null,
	authUser: AuthUser | null,
	eventTime: number,
): IngestEvent => (
{
	type: "user",
	eventTime,
	userId,
	profile: profile === null ? null : pick(profile, profileFieldChanged),
	authUser,
});
