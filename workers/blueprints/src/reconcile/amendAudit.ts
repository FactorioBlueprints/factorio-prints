// Corrects a blueprint's current version in place. History recorded some created dates and authors wrongly, and
// a few tags were later tidied in the Realtime Database without a save. The store otherwise never rewrites a row:
// a correction would need a new version dated now, which would make an old blueprint look freshly updated. So when
// a reconcile asks for it, and a blueprint's current version differs from the dump in nothing but these, they are
// overwritten on the current rows, keeping the version's system time and number. Tags are corrected only when the
// dump shows the very version that is stored, saved at the same instant. A version written after the event's
// time is left alone, like everything else.
import {and, eq} from "drizzle-orm";
import type {IngestDependencies} from "../ingest/applyEvent.ts";
import type {IngestEvent} from "../ingest/events.ts";
import {mapBlueprint} from "../ingest/mapBlueprint.ts";
import type {BatchItem} from "drizzle-orm/batch";
import {blueprint, blueprintTag, blueprintVersion} from "../schema.ts";
import {blueprints, blueprintTags, blueprintVersions} from "../tables.ts";
import {SYSTEM_TO_SENTINEL} from "../temporal/columns.ts";
import {findCurrent, history} from "../temporal/temporal.ts";

const AUDIT_FIELDS = ["createdById", "createdOn", "lastUpdatedById"] as const;

/** True when the event's blueprint was (or, when `dryRun`, would be) corrected in place. */
export const amendBlueprintAudit = async (
	dependencies: IngestDependencies,
	event: IngestEvent,
	dryRun: boolean,
): Promise<boolean> =>
{
	if (event.type !== "blueprint" || event.blueprint === null || event.blueprint === undefined) return false;
	const {db} = dependencies;
	const key =
	{
		key: event.key,
	};
	const [current, version] = await Promise.all([
		findCurrent(db, blueprints, key),
		findCurrent(db, blueprintVersions, key),
	]);
	if (current === undefined || version === undefined || version.systemFrom > event.eventTime) return false;

	let rows;
	try
	{
		rows = await mapBlueprint(
			event.key,
			event.blueprint,
			{
				blueprintPrivate: event.blueprintPrivate,
				thumbnail: event.thumbnail,
			},
		);
	}
	catch
	{
		return false;
	}
	if (rows === undefined) return false;

	const incoming = rows.blueprint as Record<string, unknown>;
	const stored = current as Record<string, unknown>;
	const isAudit = (field: string) => (AUDIT_FIELDS as readonly string[]).includes(field);
	const sameContent = Object.keys(incoming).every((field) => isAudit(field) || incoming[field] === stored[field]);
	if (!sameContent) return false;
	const statements: BatchItem<"sqlite">[] = [];

	if (AUDIT_FIELDS.some((field) => incoming[field] !== stored[field]))
	{
		const audit =
		{
			createdById: rows.blueprint.createdById,
			createdOn: rows.blueprint.createdOn,
			lastUpdatedById: rows.blueprint.lastUpdatedById,
		};
		statements.push(
			db
				.update(blueprint)
				.set(audit)
				.where(and(eq(blueprint.key, event.key), eq(blueprint.systemTo, SYSTEM_TO_SENTINEL))),
			db
				.update(blueprintVersion)
				.set(audit)
				.where(and(eq(blueprintVersion.key, event.key), eq(blueprintVersion.systemTo, SYSTEM_TO_SENTINEL))),
		);
	}

	if (version.systemFrom === event.eventTime)
	{
		const tagId = (tag: {tagCategory: string; tagName: string}) => `${tag.tagCategory}/${tag.tagName}`;
		const storedTags = (
			await history(
				db,
				blueprintTags,
				{
					blueprintKey: event.key,
				},
			)
		).filter((tag) => tag.systemTo === SYSTEM_TO_SENTINEL);
		const wanted = new Set(rows.blueprintTags.map(tagId));
		const present = new Set(storedTags.map(tagId));
		for (const tag of storedTags.filter((each) => !wanted.has(tagId(each))))
		{
			const thisRow = and(
				eq(blueprintTag.blueprintKey, event.key),
				eq(blueprintTag.tagCategory, tag.tagCategory),
				eq(blueprintTag.tagName, tag.tagName),
				eq(blueprintTag.systemTo, SYSTEM_TO_SENTINEL),
			);
			// A tag that began with this version was never part of it; an older one ended when the version began.
			statements.push(
				tag.systemFrom === version.systemFrom
					? db.delete(blueprintTag).where(thisRow)
					: db
							.update(blueprintTag)
							.set(
								{
									systemTo: version.systemFrom,
								},
							)
							.where(thisRow),
			);
		}
		for (const tag of rows.blueprintTags.filter((each) => !present.has(tagId(each))))
		{
			statements.push(
				db.insert(blueprintTag).values(
					{
						...tag,
						systemFrom: version.systemFrom,
						systemTo: SYSTEM_TO_SENTINEL,
					},
				),
			);
		}
	}

	if (statements.length === 0) return false;
	if (!dryRun)
	{
		await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
	}
	return true;
};
