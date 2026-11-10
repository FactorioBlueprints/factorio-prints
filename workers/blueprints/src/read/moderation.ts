// Moderator-only history and restore. Deleting a blueprint phases its composite out; restoring phases the last
// version back in at the moderator's action time, with the next version number and the moderator as last updater.
import type {blueprint} from "../schema.ts";
import {blueprintPrivateDatas, blueprints, blueprintTags, blueprintVersions, userEntitlements} from "../tables.ts";
import {SYSTEM_TO_SENTINEL} from "../temporal/columns.ts";
import
{
	bumpVersion,
	commit,
	createUnitOfWork,
	type Database,
	findAsOf,
	findCurrent,
	history,
	mergeList,
	type TemporalValues,
	upsert,
} from "../temporal/temporal.ts";

export const isModerator = async (db: Database, userId: string): Promise<boolean> =>
	(await findCurrent(
		db,
		userEntitlements,
		{
			userId,
			userRole: "administrator",
		},
	)) !== undefined;

/** Every version of a blueprint, oldest first, with the blueprint's fields as of that version. */
export const blueprintHistory = async (db: Database, key: string) =>
{
	const [versions, rows] = await Promise.all([
		history(
			db,
			blueprintVersions,
			{
				key,
			},
		),
		history(
			db,
			blueprints,
			{
				key,
			},
		),
	]);
	return versions.map((version) =>
	{
		const row = rows.find(
			(candidate) => candidate.systemFrom <= version.systemFrom && candidate.systemTo > version.systemFrom,
		);
		return {
			number: version.number,
			systemFrom: version.systemFrom,
			systemTo: version.systemTo,
			title: row?.title,
			descriptionMarkdown: row?.descriptionMarkdown,
			blueprintStringSha: row?.blueprintStringSha,
			imgurImageId: row?.imgurImageId,
			lastUpdatedById: version.lastUpdatedById,
		};
	});
};

export type RestoreResult =
	|
	  {
			status: "restored";
			version: number;
	  }
	|
	  {
			status: "not-found" | "not-deleted" | "conflict";
	  };

export const restoreBlueprint = async (
	db: Database,
	key: string,
	moderatorId: string,
	now: number,
): Promise<RestoreResult> =>
{
	const latest = (
		await history(
			db,
			blueprints,
			{
				key,
			},
		)
	).at(-1);
	if (latest === undefined)
	{
		return {
			status: "not-found",
		};
	}
	if (latest.systemTo === SYSTEM_TO_SENTINEL)
	{
		return {
			status: "not-deleted",
		};
	}

	// The composite as it was in the instant before it was phased out.
	const asOf = latest.systemTo - 1;
	const tags = (
		await history(
			db,
			blueprintTags,
			{
				blueprintKey: key,
			},
		)
	).filter((tag) => tag.systemFrom <= asOf && tag.systemTo > asOf);
	const privateData = await findAsOf(
		db,
		blueprintPrivateDatas,
		{
			key,
		},
		asOf,
	);

	const unitOfWork = createUnitOfWork(db, now);
	const root = await upsert(
		unitOfWork,
		blueprints,
		{
			...latest,
			lastUpdatedById: moderatorId,
		} as TemporalValues<typeof blueprint>,
	);
	const tagChanges = await mergeList(
		unitOfWork,
		blueprintTags,
		{
			blueprintKey: key,
		},
		tags,
	);
	const privateChanges =
		privateData === undefined ? [] : [await upsert(unitOfWork, blueprintPrivateDatas, privateData)];
	await bumpVersion(
		unitOfWork,
		blueprintVersions,
		{
			key,
		},
		[root, ...tagChanges, ...privateChanges],
		{
			createdById: latest.createdById,
			createdOn: latest.createdOn,
			lastUpdatedById: moderatorId,
		},
	);
	if ((await commit(unitOfWork)).status === "conflict")
	{
		return {
			status: "conflict",
		};
	}
	return {
		status: "restored",
		version: (await findCurrent(
			db,
			blueprintVersions,
			{
				key,
			},
		))!.number,
	};
};
