/*
 * Realtime Database triggers that replicate changes to the blueprints Worker, one per independent source path. Each builds an event, then posts it or, while
 * /ingest/buffering is true, appends it to /ingest/buffer. drainIngestBuffer replays the buffer in order. The
 * database rules deny clients everything under /ingest, which only these functions touch.
 */
import * as functions from "firebase-functions";
import * as functionsV1 from "firebase-functions/v1";
import {getAuth} from "firebase-admin/auth";
import {getDatabase} from "firebase-admin/database";
import {Change} from "firebase-functions/v2";
import {DatabaseEvent, DataSnapshot, onValueWritten} from "firebase-functions/v2/database";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {type BufferStore, dispatchEvent, drainBuffer, postEvents} from "./ingestDispatch";
import
{
	type AuthUser,
	blueprintEvent,
	blueprintSaveTime,
	listedBlueprint,
	collectionEvent,
	commentEvent,
	eventTimeOf,
	type IngestEvent,
	moderatorsEvent,
	profileFieldChanged,
	tagListEvent,
	toAuthUser,
	userEvent,
	voteEvent,
} from "./ingestEvents";

/** The Worker's ingest route, which is also the audience of the ID token the functions mint. */
const INGEST_URL = "https://blueprints.factorioprints.com/ingest";

const bufferStore = (): BufferStore =>
{
	const database = getDatabase();
	return {
		isBuffering: async () => (await database.ref("/ingest/buffering").once("value")).val() === true,
		append: async (event) =>
		{
			await database.ref("/ingest/buffer").push(event);
		},
		readOldest: async (limit) =>
		{
			const snapshot = await database.ref("/ingest/buffer").orderByKey().limitToFirst(limit).once("value");
			const entries: [string, IngestEvent][] = [];
			snapshot.forEach((child) =>
			{
				entries.push([child.key!, child.val() as IngestEvent]);
			});
			return entries;
		},
		remove: async (ids) =>
		{
			await database.ref("/ingest/buffer").update(Object.fromEntries(ids.map((id) => [id, null])));
		},
	};
};

const dependencies = () => (
{
	buffer: bufferStore(),
	transport:
	{
		post: (events: readonly IngestEvent[]) => postEvents(INGEST_URL, events),
	},
});

const send = async (event: IngestEvent) =>
{
	const outcome = await dispatchEvent(dependencies(), event);
	functions.logger.log(`Ingest ${event.type} event ${outcome}`);
	return null;
};

const read = async (path: string) => (await getDatabase().ref(path).once("value")).val();

const authUserOf = async (userId: string): Promise<AuthUser | null> =>
{
	try
	{
		return toAuthUser(await getAuth().getUser(userId));
	}
	catch (error)
	{
		if (
			(
				error as
				{
					code?: string;
				}
			).code === "auth/user-not-found"
		)
		{
			return null;
		}
		throw error;
	}
};

type WrittenEvent = DatabaseEvent<Change<DataSnapshot>>;

// Every save, creation and deletion of a blueprint writes its summary's lastUpdatedDate, so that one small value is
// the trigger and the blueprint is read here. A trigger on /blueprints/{blueprintId} itself would carry the whole
// blueprint in its event, and a write whose event exceeds 1 MB triggers nothing; it would also fire for every
// favorite.
export const ingestBlueprint = onValueWritten(
	"/blueprintSummaries/{blueprintId}/lastUpdatedDate",
	async (event: WrittenEvent) =>
	{
		const {blueprintId} = event.params;
		const [blueprint, blueprintPrivate, thumbnail] = await Promise.all([
			read(`/blueprints/${blueprintId}`),
			read(`/blueprintsPrivate/${blueprintId}`),
			read(`/thumbnails/${blueprintId}`),
		]);
		return send(
			blueprintEvent(
				blueprintId,
				listedBlueprint(event.data.after.val(), blueprint),
				blueprintPrivate,
				thumbnail,
				blueprintSaveTime(event.data.after.val(), event.time),
			),
		);
	},
);

export const ingestVote = onValueWritten("/users/{userId}/favorites/{blueprintId}", (event: WrittenEvent) =>
	send(voteEvent(event.params.userId, event.params.blueprintId, event.data.after.val(), eventTimeOf(event.time))),
);

export const ingestCollection = onValueWritten("/users/{userId}/collection/{blueprintId}", (event: WrittenEvent) =>
	send(
		collectionEvent(event.params.userId, event.params.blueprintId, event.data.after.val(), eventTimeOf(event.time)),
	),
);

export const ingestUserProfile = onValueWritten("/users/{userId}/{field}", async (event: WrittenEvent) =>
{
	if (!profileFieldChanged(event.params.field))
	{
		return null;
	}
	const {userId} = event.params;
	const [profile, authUser] = await Promise.all([read(`/users/${userId}`), authUserOf(userId)]);
	return send(userEvent(userId, profile, authUser, eventTimeOf(event.time)));
});

export const ingestUserDeleted = functionsV1.auth
	.user()
	.onDelete((user, context) => send(userEvent(user.uid, null, null, eventTimeOf(context.timestamp))));

export const ingestComment = onValueWritten("/comments/{blueprintId}/{commentId}", (event: WrittenEvent) =>
	send(
		commentEvent(event.params.blueprintId, event.params.commentId, event.data.after.val(), eventTimeOf(event.time)),
	),
);

export const ingestModerators = onValueWritten("/moderators", (event: WrittenEvent) =>
	send(moderatorsEvent(event.data.after.val(), eventTimeOf(event.time))),
);

// /byTag/<category>/<name> changes whenever a blueprint gains or loses a tag; the tag list changes only when a tag
// node appears or disappears, and only then is the whole of /byTag read.
export const ingestTagList = onValueWritten("/byTag/{category}/{name}", async (event: WrittenEvent) =>
{
	if (event.data.before.exists() === event.data.after.exists())
	{
		return null;
	}
	return send(tagListEvent(await read("/byTag"), eventTimeOf(event.time)));
});

/** Replays /ingest/buffer to the Worker in order. Moderators only. */
export const drainIngestBuffer = onCall(async (request) =>
{
	const userId = request.auth?.uid;
	if (!userId)
	{
		throw new HttpsError("unauthenticated", "Authentication is required.");
	}
	if ((await read(`/moderators/${userId}`)) !== true)
	{
		throw new HttpsError("permission-denied", "Moderator access is required.");
	}
	const result = await drainBuffer(dependencies());
	functions.logger.log(`Drained ${result.replayed} buffered ingest events`);
	return result;
});
