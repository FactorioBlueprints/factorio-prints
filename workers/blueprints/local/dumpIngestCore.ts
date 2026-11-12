import type {DatabaseSync} from "node:sqlite";
import {drizzle} from "drizzle-orm/d1";
import {reconcile, type ReconcileRequest} from "../src/reconcile/reconcile.ts";
import {DumpChildScanner} from "../../../scripts/dumpStreamCore.ts";
import {localD1} from "./localD1.ts";
import {type BuildOptions, buildReconcileRequests, type RealtimeDump} from "../../../scripts/reconcileCore.ts";

// Ingests one Realtime Database backup on top of the history in a local SQLite database, through the Worker's own
// reconcile code: every node of the dump becomes the change event live ingest would send, and an event is applied
// only where the stored rows differ. A blueprint can be timed by its own lastUpdatedDate, so the version this
// brings in is dated by the save that made it; an unchanged blueprint gets no version even when its date moved.
// Everything without a date of its own (favorites, collections, moderators, tags, deletions) uses the dump instant.

export interface StringStore
{
	put: (key: string, content: string) => Promise<unknown>;
}

export interface IngestDumpOptions
{
	database: DatabaseSync;
	/** Receives each blueprint string the database did not have, under its R2 key. */
	strings: StringStore;
	/** Opens the dump's text; it is read twice. */
	readDump: () => AsyncIterable<string>;
	/** The instant the backup was taken, in epoch milliseconds. */
	dumpTime: number;
	blueprintTime: NonNullable<BuildOptions["blueprintTime"]>;
	mode: "shadow" | "repair";
}

export interface IngestDumpReport
{
	blueprintsInDump: number;
	events: number;
	/** Events whose stored rows differed. */
	drifting: number;
	/** Events older than the rows they would change, which are left alone. */
	stale: number;
	ignored: number;
	/** Row changes by "table:outcome". */
	changes: Record<string, number>;
}

type Node = Record<string, unknown>;

export const ingestDump = async (options: IngestDumpOptions): Promise<IngestDumpReport> =>
{
	const {dumpTime, mode} = options;
	const dependencies =
	{
		db: drizzle(localD1(options.database) as unknown as D1Database),
		strings: options.strings as unknown as R2Bucket,
	};
	const report: IngestDumpReport =
	{
		blueprintsInDump: 0,
		events: 0,
		drifting: 0,
		stale: 0,
		ignored: 0,
		changes: {},
	};
	const send = async (request: ReconcileRequest): Promise<void> =>
	{
		const result = await reconcile(dependencies, request);
		report.events += request.events.length;
		report.drifting += result.drift.length;
		report.stale += result.stale;
		report.ignored += result.ignored;
		for (const {table, outcome} of result.drift.flatMap((entry) => entry.changes))
		{
			report.changes[`${table}:${outcome}`] = (report.changes[`${table}:${outcome}`] ?? 0) + 1;
		}
	};
	/** Sends the events of a part of the dump. Deletions are sent once, at the end, from every key seen. */
	const sendPart = async (part: RealtimeDump): Promise<void> =>
	{
		const requests = buildReconcileRequests(
			part,
			{
				dumpTime,
				mode,
				chunkSize: 500,
				blueprintTime: options.blueprintTime,
			},
		);
		for (const request of requests)
		{
			if (request.expectedBlueprintKeys === undefined)
			{
				await send(request as ReconcileRequest);
			}
		}
	};
	const children = async function* (nodes: string[]): AsyncGenerator<[string, string, unknown]>
	{
		const scanner = new DumpChildScanner(nodes);
		for await (const chunk of options.readDump())
		{
			for (const [node, key, json] of scanner.push(chunk))
			{
				yield [node, key, JSON.parse(json)];
			}
		}
	};

	// The first pass gathers the small nodes: a blueprint's event needs its private node and thumbnail, which come
	// after it in the dump, and tags and moderators go in before the blueprints.
	const small: Record<string, Record<string, unknown>> =
	{
		blueprintsPrivate: {},
		thumbnails: {},
		users: {},
		moderators: {},
		byTag: {},
	};
	for await (const [node, key, value] of children(Object.keys(small)))
	{
		small[node][key] = value;
	}
	// A node the dump lacks is left out rather than sent empty, which would phase out everything it holds.
	const present = <T>(node: string): T | undefined =>
		Object.keys(small[node]).length > 0 ? (small[node] as T) : undefined;
	await sendPart(
		{
			moderators: present("moderators"),
			byTag: present("byTag"),
		},
	);

	const blueprintKeys: string[] = [];
	for await (const [, key, value] of children(["blueprints"]))
	{
		blueprintKeys.push(key);
		await sendPart(
			{
				blueprints:
				{
					[key]: value as Node,
				},
				blueprintsPrivate: small.blueprintsPrivate as Record<string, Node>,
				thumbnails: small.thumbnails as Record<string, string>,
			},
		);
	}
	report.blueprintsInDump = blueprintKeys.length;

	// Favorites and collection entries only count for blueprints that exist, so users follow the blueprints.
	await sendPart(
		{
			users: small.users as Record<string, Node>,
		},
	);
	await send(
		{
			mode,
			events: [],
			expectedBlueprintKeys: blueprintKeys,
			dumpTime,
		},
	);
	return report;
};
