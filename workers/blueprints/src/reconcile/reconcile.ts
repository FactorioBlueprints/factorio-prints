// Compares current D1 rows against a Realtime Database dump and reports or repairs the drift, as factorio.school
// does for its history database. The dump arrives as the same change events ingest applies, built from the
// dump's raw nodes with the dump instant as their event time: an event whose planned writes are not all "unchanged"
// is drift. Rows live ingest changed after the dump are stale relative to it and are not drift.
import {eq} from "drizzle-orm";
import {applyEvent, dryRunEvent, type EventResult, type IngestDependencies} from "../ingest/applyEvent.ts";
import type {IngestEvent} from "../ingest/events.ts";
import {blueprint} from "../schema.ts";
import {SYSTEM_TO_SENTINEL} from "../temporal/columns.ts";
import type {RowChange} from "../temporal/temporal.ts";

export interface ReconcileRequest
{
	/** "shadow" reports only and is the default; "repair" applies each drifting event. */
	mode: "shadow" | "repair";
	events: IngestEvent[];
	/** Every blueprint key in the dump. Current blueprints not listed are drift, repaired by phasing them out. */
	expectedBlueprintKeys?: string[];
	/** The dump instant, required with `expectedBlueprintKeys`. */
	dumpTime?: number;
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
}

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
	};
	for (const event of events)
	{
		const result: EventResult =
			request.mode === "repair" ? await applyEvent(dependencies, event) : await dryRunEvent(dependencies, event);
		if (result.status === "skipped-stale") report.stale++;
		if (result.status === "ignored") report.ignored++;
		const changes = result.changes.filter(isDrift);
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
	return report;
};
