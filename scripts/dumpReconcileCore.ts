import type {AuthUser} from "../functions/src/ingestEvents.ts";
import {DumpChildScanner} from "./dumpStreamCore.ts";
import
{
	type BuildOptions,
	buildReconcileRequests,
	type RealtimeDump,
	type ReconcileRequestBody,
	type ReconcileResponse,
} from "./reconcileCore.ts";

// Merges one Realtime Database backup into the blueprint store through the Worker's reconcile code, reading the
// backup as a stream. Every node becomes the change event live ingest would send, and in repair mode an event is
// applied only where the stored rows differ and are older than the event: a row written after the event's time,
// by live ingest for instance, is left alone. A blueprint can be timed by its own lastUpdatedDate, so the version
// the merge brings in is dated by the save that made it. Everything without a date of its own (favorites,
// collections, profiles, moderators, tags, deletions) uses the backup instant. A current blueprint the backup
// lacks is phased out at the backup instant, again unless it was written after that.
// Where the requests go is up to the caller: the Worker's /reconcile route, or its code run on a local database.

export interface DumpReconcileOptions
{
	/** Opens the dump's text; it is read twice. */
	readDump: () => AsyncIterable<string>;
	/** The instant the backup was taken, in epoch milliseconds. */
	dumpTime: number;
	blueprintTime: NonNullable<BuildOptions["blueprintTime"]>;
	mode: "shadow" | "repair";
	/** Events per request. The Worker's route does several database calls per event within one invocation's limit. */
	chunkSize: number;
	/** Correct a blueprint's created date and author in place where nothing else about it differs. */
	amendAudit?: boolean;
	send: (request: ReconcileRequestBody) => Promise<ReconcileResponse>;
	/**
	 * The account record of a user in the dump, or null when the account no longer exists, which marks the user
	 * deleted. Without it, profiles are not reconciled.
	 */
	accountOf?: (userId: string, profile: Record<string, unknown>) => AuthUser | null;
}

export interface DumpReconcileReport
{
	blueprintsInDump: number;
	events: number;
	/** Events whose stored rows differed. */
	drifting: number;
	/** Events older than the rows they would change, which are left alone. */
	stale: number;
	ignored: number;
	/** Blueprints whose created date or author was corrected in place, or would be in shadow mode. */
	amended: number;
	/** Row changes by "table:outcome". */
	changes: Record<string, number>;
}

type Node = Record<string, unknown>;

export const reconcileDump = async (options: DumpReconcileOptions): Promise<DumpReconcileReport> =>
{
	const {dumpTime, mode} = options;
	const report: DumpReconcileReport =
	{
		blueprintsInDump: 0,
		events: 0,
		drifting: 0,
		stale: 0,
		ignored: 0,
		amended: 0,
		changes: {},
	};
	const send = async (request: ReconcileRequestBody): Promise<void> =>
	{
		const result = await options.send(
			{
				...request,
				amendAudit: options.amendAudit,
			},
		);
		report.amended += result.amended;
		report.events += request.events.length;
		report.drifting += result.drift.length;
		report.stale += result.stale;
		report.ignored += result.ignored;
		const changes = result.drift.flatMap((entry) => entry.changes) as
		{
			table: string;
			outcome: string;
		}[];
		for (const {table, outcome} of changes)
		{
			report.changes[`${table}:${outcome}`] = (report.changes[`${table}:${outcome}`] ?? 0) + 1;
		}
	};
	/** Sends the events of a part of the dump. Deletions are sent once, at the end, from every key seen. */
	const sendPart = async (part: RealtimeDump, authUsers?: readonly AuthUser[]): Promise<void> =>
	{
		const requests = buildReconcileRequests(
			part,
			{
				dumpTime,
				mode,
				chunkSize: options.chunkSize,
				blueprintTime: options.blueprintTime,
				authUsers,
			},
		);
		for (const request of requests)
		{
			if (request.expectedBlueprintKeys === undefined)
			{
				await send(request);
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
	let batch: Record<string, Node> = {};
	const sendBatch = async (): Promise<void> =>
	{
		if (Object.keys(batch).length > 0)
		{
			await sendPart(
				{
					blueprints: batch,
					blueprintsPrivate: small.blueprintsPrivate as Record<string, Node>,
					thumbnails: small.thumbnails as Record<string, string>,
				},
			);
		}
		batch = {};
	};
	for await (const [, key, value] of children(["blueprints"]))
	{
		blueprintKeys.push(key);
		batch[key] = value as Node;
		if (Object.keys(batch).length >= options.chunkSize)
		{
			await sendBatch();
		}
	}
	await sendBatch();
	report.blueprintsInDump = blueprintKeys.length;

	// Favorites and collection entries only count for blueprints that exist, so users follow the blueprints.
	const users = small.users as Record<string, Node>;
	const {accountOf} = options;
	await sendPart(
		{
			users,
		},
		accountOf &&
			Object.entries(users).flatMap(([userId, profile]) =>
			{
				const account = accountOf(userId, profile);
				return account === null ? [] : [account];
			}),
	);
	// The request that closes the dump: current blueprints it lacks are phased out, and the watermark advances.
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
