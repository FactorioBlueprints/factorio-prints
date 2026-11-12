// Corrects a blueprint's created date and author in place. History recorded some of these wrongly, and the store
// otherwise never rewrites a row: a correction would need a new version dated now, which would make an old
// blueprint look freshly updated. So when a reconcile asks for it, and a blueprint's current version differs from
// the dump in nothing but these fields, the fields are overwritten on the current rows, keeping their system time
// and version number. A version written after the event's time is left alone, like everything else.
import {and, eq} from "drizzle-orm";
import type {IngestDependencies} from "../ingest/applyEvent.ts";
import type {IngestEvent} from "../ingest/events.ts";
import {mapBlueprint} from "../ingest/mapBlueprint.ts";
import {blueprint, blueprintVersion} from "../schema.ts";
import {blueprints, blueprintVersions} from "../tables.ts";
import {SYSTEM_TO_SENTINEL} from "../temporal/columns.ts";
import {findCurrent} from "../temporal/temporal.ts";

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
	const auditDiffers = AUDIT_FIELDS.some((field) => incoming[field] !== stored[field]);
	if (!sameContent || !auditDiffers) return false;

	if (!dryRun)
	{
		const audit =
		{
			createdById: rows.blueprint.createdById,
			createdOn: rows.blueprint.createdOn,
			lastUpdatedById: rows.blueprint.lastUpdatedById,
		};
		await db.batch([
			db
				.update(blueprint)
				.set(audit)
				.where(and(eq(blueprint.key, event.key), eq(blueprint.systemTo, SYSTEM_TO_SENTINEL))),
			db
				.update(blueprintVersion)
				.set(audit)
				.where(and(eq(blueprintVersion.key, event.key), eq(blueprintVersion.systemTo, SYSTEM_TO_SENTINEL))),
		]);
	}
	return true;
};
