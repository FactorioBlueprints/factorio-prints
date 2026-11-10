// Change events the Cloud Functions send to the Worker, one per Realtime Database write they observe. Each carries
// the time the source changed (the database event's commit time), which becomes the unit of work's timestamp and
// the stale-event guard's reference, so replaying an event changes nothing and an older event never overwrites a
// newer row.
import type
{
	AuthUser,
	RealtimeBlueprint,
	RealtimeBlueprintPrivate,
	RealtimeByTag,
	RealtimeComment,
	RealtimeUser,
} from "./realtime.ts";

interface EventBase
{
	/** Epoch milliseconds when the source changed. */
	eventTime: number;
}

/** `/blueprints/<key>` and its private data; `blueprint: null` means the blueprint was deleted. */
export interface BlueprintEvent extends EventBase
{
	type: "blueprint";
	key: string;
	blueprint: RealtimeBlueprint | null;
	blueprintPrivate?: RealtimeBlueprintPrivate | null;
	thumbnail?: string | null;
}

/** `/users/<uid>/favorites/<key>`. */
export interface VoteEvent extends EventBase
{
	type: "vote";
	userId: string;
	blueprintKey: string;
	favorited: boolean;
}

/** `/users/<uid>/collection/<key>`. */
export interface CollectionEvent extends EventBase
{
	type: "collection";
	userId: string;
	blueprintKey: string;
	collected: boolean;
}

/** `/comments/<blueprintKey>/<commentId>`; `comment: null` means it was removed. */
export interface CommentEvent extends EventBase
{
	type: "comment";
	blueprintKey: string;
	commentId: string;
	comment: RealtimeComment | null;
}

/** `/moderators`, whole. */
export interface ModeratorsEvent extends EventBase
{
	type: "moderators";
	moderators: Readonly<Record<string, boolean>> | null;
}

/** The tag list: `/byTag` with only its category and name keys (blueprint keys under each tag are not needed). */
export interface TagListEvent extends EventBase
{
	type: "tags";
	byTag: RealtimeByTag | null;
}

/**
 * A user's profile from two sources: `/users/<uid>` in the Realtime Database for the display fields, and the
 * Firebase Admin SDK's user record (looked up by the Cloud Function) for the provider and auth fields. The profile's
 * favorites and collection maps are ignored here; they arrive as their own events.
 */
export interface UserEvent extends EventBase
{
	type: "user";
	userId: string;
	profile: RealtimeUser | null;
	/** The Admin SDK record in Firebase Auth export shape, or null when the account no longer exists. */
	authUser: AuthUser | null;
}

export type IngestEvent =
	| BlueprintEvent
	| UserEvent
	| VoteEvent
	| CollectionEvent
	| CommentEvent
	| ModeratorsEvent
	| TagListEvent;

export type ParsedIngestRequest =
	|
	  {
			ok: true;
			events: IngestEvent[];
	  }
	|
	  {
			ok: false;
			error: string;
	  };

const requiredStrings: Record<IngestEvent["type"], readonly string[]> =
{
	blueprint: ["key"],
	user: ["userId"],
	vote: ["userId", "blueprintKey"],
	collection: ["userId", "blueprintKey"],
	comment: ["blueprintKey", "commentId"],
	moderators: [],
	tags: [],
};

const requiredBooleans: Partial<Record<IngestEvent["type"], string>> =
{
	vote: "favorited",
	collection: "collected",
};

const requiredNullableObjects: Partial<Record<IngestEvent["type"], string>> =
{
	blueprint: "blueprint",
	user: "profile",
	comment: "comment",
	moderators: "moderators",
	tags: "byTag",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const validateEvent = (event: unknown, index: number): string | undefined =>
{
	if (!isRecord(event)) return `event ${index} is not an object`;
	const type = event.type as IngestEvent["type"];
	if (!Object.hasOwn(requiredStrings, type)) return `event ${index} has unknown type ${String(event.type)}`;
	if (typeof event.eventTime !== "number" || !Number.isSafeInteger(event.eventTime) || event.eventTime <= 0)
	{
		return `event ${index} has no eventTime in epoch milliseconds`;
	}
	for (const field of requiredStrings[type])
	{
		if (typeof event[field] !== "string" || event[field] === "") return `event ${index} has no ${field}`;
	}
	const booleanField = requiredBooleans[type];
	if (booleanField !== undefined && typeof event[booleanField] !== "boolean")
	{
		return `event ${index} has no boolean ${booleanField}`;
	}
	const objectField = requiredNullableObjects[type];
	if (objectField !== undefined && event[objectField] !== null && !isRecord(event[objectField]))
	{
		return `event ${index} has no ${objectField} object or null`;
	}
	if (type === "user" && event.authUser !== null && !isRecord(event.authUser))
	{
		return `event ${index} has no authUser object or null`;
	}
	return undefined;
};

/** Checks the shape of a `POST /ingest` body, `{events: [...]}`. The Realtime nodes inside are passed through. */
export const parseIngestRequest = (body: unknown): ParsedIngestRequest =>
{
	if (!isRecord(body) || !Array.isArray(body.events))
		return {
			ok: false,
			error: "body must be {events: [...]}",
		};
	for (const [index, event] of body.events.entries())
	{
		const error = validateEvent(event, index);
		if (error !== undefined)
			return {
				ok: false,
				error,
			};
	}
	return {
		ok: true,
		events: body.events as IngestEvent[],
	};
};
