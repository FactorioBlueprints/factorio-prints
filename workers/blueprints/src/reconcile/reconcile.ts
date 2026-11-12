// Compares current D1 rows against a Realtime Database dump and reports or repairs the drift, as factorio.school
// does for its history database. The dump arrives as the same change events ingest applies, built from the
// dump's raw nodes with the dump instant as their event time: an event whose planned writes are not all "unchanged"
// is drift. Rows live ingest changed after the dump are stale relative to it and are not drift: a repair only
// overwrites a row whose stored system time is older than the event's time, so it is safe to run while live ingest
// is writing. The same holds for a blueprint the dump lacks: it is phased out at the dump instant unless it was
// written after that. The request that lists the dump's blueprint keys closes the dump, and in repair mode it
// records the dump instant as the import watermark.
import {eq} from "drizzle-orm";
import {applyEvent, dryRunEvent, type EventResult, type IngestDependencies} from "../ingest/applyEvent.ts";
import type {IngestEvent} from "../ingest/events.ts";
import {mapBlueprint} from "../ingest/mapBlueprint.ts";
import {blueprint, dataImportTimestamp} from "../schema.ts";
import {imgurImages} from "../tables.ts";
import {SYSTEM_TO_SENTINEL} from "../temporal/columns.ts";
import {amendBlueprintAudit} from "./amendAudit.ts";
import {commit, createUnitOfWork, findCurrent, type RowChange, temporalTable, upsert} from "../temporal/temporal.ts";

export interface ReconcileRequest
{
	/** "shadow" reports only and is the default; "repair" applies each drifting event. */
	mode: "shadow" | "repair";
	events: IngestEvent[];
	/** Every blueprint key in the dump. Current blueprints not listed are drift, repaired by phasing them out. */
	expectedBlueprintKeys?: string[];
	/** The dump instant, required with `expectedBlueprintKeys`. */
	dumpTime?: number;
	/** Correct a blueprint's created date and author in place where nothing else differs (see amendAudit.ts). */
	amendAudit?: boolean;
}

export interface DriftEntry
{
	/** The event's type and identifying keys. */
	event: Record<string, string>;
	changes: RowChange[];
}

export interface ReconcileReport
{
	drift: DriftEntry[];
	/** Events older than what D1 holds, because live ingest got there after the dump. */
	stale: number;
	/** Events the mapping rejects, such as a blueprint without a string. */
	ignored: number;
	/** Blueprints whose created date or author was corrected in place, or would be in shadow mode. */
	amended: number;
}

const importTimestamps = temporalTable(dataImportTimestamp, ["name"]);
const WATERMARK_NAME = "firebase";

const advanceWatermark = async (dependencies: IngestDependencies, dumpTime: number): Promise<void> =>
{
	const unitOfWork = createUnitOfWork(dependencies.db, dumpTime);
	await upsert(
		unitOfWork,
		importTimestamps,
		{
			name: WATERMARK_NAME,
			timestamp: dumpTime,
		},
		{
			eventTime: dumpTime,
		},
	);
	await commit(unitOfWork);
};

/**
 * An image's details (type, size, delete hash) are the dump's own data about the image, whatever the date of the
 * blueprint that shows it. A blueprint event dated before the stored image row is stale and leaves the row alone,
 * so the dump's details are brought in separately, at the dump instant, guarded by the image row's own time.
 */
const reconcileImage = async (
	dependencies: IngestDependencies,
	event: IngestEvent,
	dumpTime: number,
	dryRun: boolean,
): Promise<RowChange | undefined> =>
{
	if (event.type !== "blueprint" || event.blueprint === null || event.blueprint === undefined) return undefined;
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
		return undefined;
	}
	if (rows === undefined) return undefined;
	// A new image is the blueprint event's to insert; this only corrects one already stored.
	const stored = await findCurrent(
		dependencies.db,
		imgurImages,
		{
			imgurId: rows.imgurImage.imgurId,
		},
	);
	if (stored === undefined) return undefined;
	const unitOfWork = createUnitOfWork(dependencies.db, dumpTime);
	const change = await upsert(
		unitOfWork,
		imgurImages,
		rows.imgurImage,
		{
			eventTime: dumpTime,
		},
	);
	if (!isDrift(change)) return undefined;
	if (!dryRun) await commit(unitOfWork);
	return change;
};

const IDENTIFYING_FIELDS = ["key", "userId", "blueprintKey", "commentId"] as const;

const describeEvent = (event: IngestEvent): Record<string, string> =>
{
	const description: Record<string, string> =
	{
		type: event.type,
	};
	for (const field of IDENTIFYING_FIELDS)
	{
		const value = (event as unknown as Record<string, unknown>)[field];
		if (typeof value === "string") description[field] = value;
	}
	return description;
};

const isDrift = (change: RowChange) =>
	change.outcome === "inserted" || change.outcome === "updated" || change.outcome === "phased-out";

const deletionsOfMissingBlueprints = async (
	dependencies: IngestDependencies,
	expectedKeys: readonly string[],
	dumpTime: number,
): Promise<IngestEvent[]> =>
{
	const expected = new Set(expectedKeys);
	const current = await dependencies.db
		.select(
			{
				key: blueprint.key,
			},
		)
		.from(blueprint)
		.where(eq(blueprint.systemTo, SYSTEM_TO_SENTINEL));
	return current
		.filter(({key}) => !expected.has(key))
		.map(({key}) => (
		{
			type: "blueprint",
			eventTime: dumpTime,
			key,
			blueprint: null,
		}));
};

export const reconcile = async (
	dependencies: IngestDependencies,
	request: ReconcileRequest,
): Promise<ReconcileReport> =>
{
	const events = [...request.events];
	if (request.expectedBlueprintKeys !== undefined)
	{
		if (request.dumpTime === undefined) throw new Error("expectedBlueprintKeys needs dumpTime");
		events.push(
			...(await deletionsOfMissingBlueprints(dependencies, request.expectedBlueprintKeys, request.dumpTime)),
		);
	}

	const report: ReconcileReport =
	{
		drift: [],
		stale: 0,
		ignored: 0,
		amended: 0,
	};
	for (const event of events)
	{
		if (request.amendAudit && (await amendBlueprintAudit(dependencies, event, request.mode === "shadow")))
		{
			report.amended++;
			// In shadow mode the rows still differ, so the dry run below would only repeat it as drift.
			if (request.mode === "shadow") continue;
		}
		const result: EventResult =
			request.mode === "repair" ? await applyEvent(dependencies, event) : await dryRunEvent(dependencies, event);
		if (result.status === "skipped-stale") report.stale++;
		if (result.status === "ignored") report.ignored++;
		const changes = result.changes.filter(isDrift);
		if (request.dumpTime !== undefined && !changes.some((change) => change.table === imgurImages.name))
		{
			const image = await reconcileImage(dependencies, event, request.dumpTime, request.mode === "shadow");
			if (image !== undefined) changes.push(image);
		}
		if (changes.length > 0)
		{
			report.drift.push(
				{
					event: describeEvent(event),
					changes,
				},
			);
		}
	}
	if (request.mode === "repair" && request.expectedBlueprintKeys !== undefined && request.dumpTime !== undefined)
	{
		await advanceWatermark(dependencies, request.dumpTime);
	}
	return report;
};
