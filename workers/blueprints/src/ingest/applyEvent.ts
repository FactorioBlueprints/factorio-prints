import {eq} from "drizzle-orm";
import {buildModPackLookup, extractGameData} from "../../../../src/parsing/gameData.ts";
import {blueprintString, factorioItem} from "../schema.ts";
import {putBlueprintString, STRING_STORED_IN_R2} from "../strings.ts";
import
{
	blueprintCollectionEntries,
	blueprintGameDataEntities,
	blueprintGameDataIcons,
	blueprintGameDataRecipes,
	blueprintGameDatas,
	blueprintPrivateDatas,
	blueprints,
	blueprintStringMods,
	blueprintStrings,
	blueprintTags,
	blueprintVersions,
	comments,
	commentVersions,
	firebaseUsers,
	firebaseUserVersions,
	imgurImages,
	tags,
	userEntitlements,
	votes,
} from "../tables.ts";
import {SYSTEM_TO_SENTINEL} from "../temporal/columns.ts";
import
{
	bumpVersion,
	commit,
	createUnitOfWork,
	type Database,
	findCurrent,
	history,
	insertAllIfAbsent,
	insertIfAbsent,
	mergeList,
	phaseOut,
	type RowChange,
	type UnitOfWork,
	upsert,
	type WriteOptions,
} from "../temporal/temporal.ts";
import type
{
	BlueprintEvent,
	CollectionEvent,
	CollectionListEvent,
	FavoriteListEvent,
	CommentEvent,
	IngestEvent,
	ModeratorsEvent,
	TagListEvent,
	UserEvent,
	VoteEvent,
} from "./events.ts";
import {mapBlueprint} from "./mapBlueprint.ts";
import {mapComments} from "./mapComments.ts";
import {applyAuth, mapCollections, mapFavorites, mapModerators, mapUser} from "./mapUser.ts";
import {mapTagList} from "./tags.ts";

export interface IngestDependencies
{
	db: Database;
	strings: R2Bucket;
	/** Plan without writing anything, R2 included. The reconciler's shadow mode. */
	dryRun?: boolean;
}

export interface EventResult
{
	/** "applied" includes an event that changed nothing, such as a replay. */
	status: "applied" | "skipped-stale" | "ignored" | "conflict";
	reason?: string;
	changes: RowChange[];
}

/** A reason to ignore the event, or nothing once its writes are planned. */
type Planned = string | undefined;

// A conflict means another unit of work changed a row between this one's reads and its batch. Planning again reads
// the new rows, and compare-before-cut and the stale guard make the retry safe.
const MAX_ATTEMPTS = 3;

const storeBlueprintString = async (
	dependencies: IngestDependencies,
	unitOfWork: UnitOfWork,
	sha: string,
	content: string,
	createdById: string,
): Promise<void> =>
{
	const [existing] = await dependencies.db
		.select(
			{
				sha: blueprintString.sha,
			},
		)
		.from(blueprintString)
		.where(eq(blueprintString.sha, sha))
		.limit(1);
	if (existing !== undefined) return;

	// R2 first: D1 must never reference a string R2 lacks, and a string written for a batch that then fails is
	// harmless because it is content-addressed.
	if (!dependencies.dryRun) await putBlueprintString(dependencies.strings, sha, content);
	const factorioItems = await dependencies.db
		.select(
			{
				name: factorioItem.name,
				modPackName: factorioItem.modPackName,
			},
		)
		.from(factorioItem)
		.where(eq(factorioItem.systemTo, SYSTEM_TO_SENTINEL));
	const gameData = extractGameData(sha, content, buildModPackLookup(factorioItems));

	await insertIfAbsent(
		unitOfWork,
		blueprintStrings,
		{
			sha,
			createdById,
			createdOn: unitOfWork.now,
			blueprintString: STRING_STORED_IN_R2,
		},
	);
	await insertAllIfAbsent(unitOfWork, blueprintGameDatas, gameData.gameData);
	await insertAllIfAbsent(unitOfWork, blueprintGameDataIcons, gameData.icons);
	await insertAllIfAbsent(unitOfWork, blueprintGameDataRecipes, gameData.recipes);
	await insertAllIfAbsent(unitOfWork, blueprintGameDataEntities, gameData.entities);
	await insertAllIfAbsent(unitOfWork, blueprintStringMods, gameData.mods);
};

const planBlueprint = async (
	dependencies: IngestDependencies,
	unitOfWork: UnitOfWork,
	event: BlueprintEvent,
	options: WriteOptions,
): Promise<Planned> =>
{
	const {key} = event;
	if (event.blueprint === null)
	{
		const root = await phaseOut(
			unitOfWork,
			blueprints,
			{
				key,
			},
			options,
		);
		if (root.outcome !== "phased-out") return undefined;
		await mergeList(
			unitOfWork,
			blueprintTags,
			{
				blueprintKey: key,
			},
			[],
		);
		await phaseOut(
			unitOfWork,
			blueprintPrivateDatas,
			{
				key,
			},
		);
		await phaseOut(
			unitOfWork,
			blueprintVersions,
			{
				key,
			},
		);
		return undefined;
	}

	let rows;
	try
	{
		rows = await mapBlueprint(
			key,
			event.blueprint,
			{
				blueprintPrivate: event.blueprintPrivate,
				thumbnail: event.thumbnail,
			},
		);
	}
	catch (error)
	{
		return (error as Error).message;
	}
	if (rows === undefined) return "blueprint has no string";

	const root = await upsert(unitOfWork, blueprints, rows.blueprint, options);
	if (root.outcome === "skipped-stale") return undefined;
	const tagChanges = await mergeList(
		unitOfWork,
		blueprintTags,
		{
			blueprintKey: key,
		},
		rows.blueprintTags,
	);
	const privateData = await upsert(unitOfWork, blueprintPrivateDatas, rows.blueprintPrivateData);
	await upsert(unitOfWork, imgurImages, rows.imgurImage);
	await bumpVersion(
		unitOfWork,
		blueprintVersions,
		{
			key,
		},
		[root, ...tagChanges, privateData],
		rows.blueprintVersion,
	);
	await storeBlueprintString(
		dependencies,
		unitOfWork,
		rows.blueprint.blueprintStringSha,
		event.blueprint.blueprintString!,
		rows.blueprint.lastUpdatedById,
	);
	return undefined;
};

const planVote = async (unitOfWork: UnitOfWork, event: VoteEvent, options: WriteOptions): Promise<Planned> =>
{
	const {userId, blueprintKey} = event;
	if (!event.favorited)
	{
		await phaseOut(
			unitOfWork,
			votes,
			{
				userId,
				blueprintKey,
			},
			options,
		);
		return undefined;
	}
	const blueprint = await findCurrent(
		unitOfWork.db,
		blueprints,
		{
			key: blueprintKey,
		},
	);
	if (blueprint === undefined) return "blueprint does not exist";
	if (blueprint.createdById === userId) return "users cannot favorite their own blueprint";
	await upsert(
		unitOfWork,
		votes,
		{
			userId,
			blueprintKey,
			direction: "up",
		},
		options,
	);
	return undefined;
};

const planCollection = async (
	unitOfWork: UnitOfWork,
	event: CollectionEvent,
	options: WriteOptions,
): Promise<Planned> =>
{
	const {userId, blueprintKey} = event;
	if (!event.collected)
	{
		await phaseOut(
			unitOfWork,
			blueprintCollectionEntries,
			{
				userId,
				blueprintKey,
			},
			options,
		);
		return undefined;
	}
	if (
		(await findCurrent(
			unitOfWork.db,
			blueprints,
			{
				key: blueprintKey,
			},
		)) === undefined
	)
	{
		return "blueprint does not exist";
	}
	await upsert(
		unitOfWork,
		blueprintCollectionEntries,
		{
			userId,
			blueprintKey,
		},
		options,
	);
	return undefined;
};

const planComment = async (unitOfWork: UnitOfWork, event: CommentEvent, options: WriteOptions): Promise<Planned> =>
{
	const id = event.commentId;
	if (event.comment === null)
	{
		const root = await phaseOut(
			unitOfWork,
			comments,
			{
				id,
			},
			options,
		);
		if (root.outcome === "phased-out")
			await phaseOut(
				unitOfWork,
				commentVersions,
				{
					id,
				},
			);
		return undefined;
	}
	const blueprintExists =
		(await findCurrent(
			unitOfWork.db,
			blueprints,
			{
				key: event.blueprintKey,
			},
		)) !== undefined;
	const [row] = mapComments(
		event.blueprintKey,
		{
			[id]: event.comment,
		},
		{
			blueprintKeys: new Set(blueprintExists ? [event.blueprintKey] : []),
		},
	);
	if (row === undefined) return "comment has no content, time or author, or its blueprint does not exist";

	const root = await upsert(unitOfWork, comments, row, options);
	if (root.outcome === "skipped-stale") return undefined;
	await bumpVersion(
		unitOfWork,
		commentVersions,
		{
			id,
		},
		[root],
		{
			createdById: row.createdById,
			createdOn: row.createdOn,
			lastUpdatedById: row.lastUpdatedById,
		},
	);
	return undefined;
};

const planUser = async (unitOfWork: UnitOfWork, event: UserEvent, options: WriteOptions): Promise<Planned> =>
{
	const {userId} = event;
	const profile = applyAuth(event.profile ?? {}, event.authUser ?? undefined);
	const root = await upsert(unitOfWork, firebaseUsers, mapUser(userId, profile), options);
	if (root.outcome === "skipped-stale") return undefined;
	await bumpVersion(
		unitOfWork,
		firebaseUserVersions,
		{
			userId,
		},
		[root],
	);
	if (event.authUser === null)
	{
		// As the converter does for an account missing from the auth export: its favorites and collection go.
		await mergeList(
			unitOfWork,
			votes,
			{
				userId,
			},
			[],
		);
		await mergeList(
			unitOfWork,
			blueprintCollectionEntries,
			{
				userId,
			},
			[],
		);
	}
	return undefined;
};

const planModerators = async (unitOfWork: UnitOfWork, event: ModeratorsEvent, options: WriteOptions) =>
{
	await mergeList(
		unitOfWork,
		userEntitlements,
		{
			userRole: "administrator",
		},
		mapModerators(event.moderators),
		options,
	);
	return undefined;
};

const planTagList = async (unitOfWork: UnitOfWork, event: TagListEvent, options: WriteOptions) =>
{
	const existing = (await history(unitOfWork.db, tags, {})).filter((row) => row.systemTo === SYSTEM_TO_SENTINEL);
	await mergeList(unitOfWork, tags, {}, mapTagList(event.byTag ?? {}, existing), options);
	return undefined;
};

/** The author of each listed blueprint that is current, by key. */
const currentBlueprintAuthors = async (unitOfWork: UnitOfWork, keys: readonly string[]) =>
{
	const authors = new Map<string, string>();
	for (const key of keys)
	{
		const blueprint = await findCurrent(
			unitOfWork.db,
			blueprints,
			{
				key,
			},
		);
		if (blueprint !== undefined) authors.set(key, blueprint.createdById);
	}
	return authors;
};

const planFavoriteList = async (unitOfWork: UnitOfWork, event: FavoriteListEvent, options: WriteOptions) =>
{
	const favorites = event.favorites ?? {};
	const blueprintAuthors = await currentBlueprintAuthors(unitOfWork, Object.keys(favorites));
	const rows = mapFavorites(
		event.userId,
		{
			favorites,
		},
		{
			blueprintAuthors,
		},
	);
	await mergeList(
		unitOfWork,
		votes,
		{
			userId: event.userId,
		},
		rows,
		options,
	);
	return undefined;
};

const planCollectionList = async (unitOfWork: UnitOfWork, event: CollectionListEvent, options: WriteOptions) =>
{
	const collection = event.collection ?? {};
	const blueprintKeys = new Set((await currentBlueprintAuthors(unitOfWork, Object.keys(collection))).keys());
	const rows = mapCollections(
		event.userId,
		{
			collection,
		},
		{
			blueprintKeys,
		},
	);
	await mergeList(
		unitOfWork,
		blueprintCollectionEntries,
		{
			userId: event.userId,
		},
		rows,
		options,
	);
	return undefined;
};

const plan = (dependencies: IngestDependencies, unitOfWork: UnitOfWork, event: IngestEvent): Promise<Planned> =>
{
	const options: WriteOptions =
	{
		eventTime: event.eventTime,
	};
	switch (event.type)
	{
		case "blueprint":
			return planBlueprint(dependencies, unitOfWork, event, options);
		case "user":
			return planUser(unitOfWork, event, options);
		case "vote":
			return planVote(unitOfWork, event, options);
		case "collection":
			return planCollection(unitOfWork, event, options);
		case "comment":
			return planComment(unitOfWork, event, options);
		case "moderators":
			return planModerators(unitOfWork, event, options);
		case "tags":
			return planTagList(unitOfWork, event, options);
		case "favoriteList":
			return planFavoriteList(unitOfWork, event, options);
		case "collectionList":
			return planCollectionList(unitOfWork, event, options);
	}
};

const applyOnce = async (dependencies: IngestDependencies, event: IngestEvent): Promise<EventResult> =>
{
	// The source's change time is the unit of work's one timestamp, so history records when things changed and a
	// replayed or late event compares against the right instant.
	const unitOfWork = createUnitOfWork(dependencies.db, event.eventTime);
	const ignored = await plan(dependencies, unitOfWork, event);
	if (ignored !== undefined)
		return {
			status: "ignored",
			reason: ignored,
			changes: [],
		};

	const result = await commit(unitOfWork);
	if (result.status === "conflict")
		return {
			status: "conflict",
			changes: result.changes,
		};
	const stale = result.changes.length > 0 && result.changes.every((change) => change.outcome === "skipped-stale");
	return {
		status: stale ? "skipped-stale" : "applied",
		changes: result.changes,
	};
};

/** Applies one change event in one atomic unit of work, retrying when a concurrent write conflicts. */
export const applyEvent = async (dependencies: IngestDependencies, event: IngestEvent): Promise<EventResult> =>
{
	let result = await applyOnce(dependencies, event);
	for (let attempt = 1; result.status === "conflict" && attempt < MAX_ATTEMPTS; attempt++)
	{
		result = await applyOnce(dependencies, event);
	}
	return result;
};

const isStaleOnly = (changes: readonly RowChange[]) =>
	changes.length > 0 && changes.every((change) => change.outcome === "skipped-stale");

/** Plans one event and reports what it would change, writing nothing. */
export const dryRunEvent = async (dependencies: IngestDependencies, event: IngestEvent): Promise<EventResult> =>
{
	const unitOfWork = createUnitOfWork(dependencies.db, event.eventTime);
	const ignored = await plan(
		{
			...dependencies,
			dryRun: true,
		},
		unitOfWork,
		event,
	);
	if (ignored !== undefined)
		return {
			status: "ignored",
			reason: ignored,
			changes: [],
		};
	const changes = unitOfWork.planned.map((write) => write.change);
	return {
		status: isStaleOnly(changes) ? "skipped-stale" : "applied",
		changes,
	};
};
