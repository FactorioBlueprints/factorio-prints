import type {AuthUser} from "../functions/src/ingestEvents.ts";
import {DumpChildScanner} from "./dumpStreamCore.ts";
import
{
	type BuildOptions,
	buildReconcileRequests,
	type RealtimeDump,
	type ReconcileRequestBody,
	type ReconcileResponse,
	type RederiveResponse,
} from "./reconcileCore.ts";

// Merges one Realtime Database backup into the blueprint store through the Worker's reconcile code, reading the
// backup as a stream. Every node becomes the change event live ingest would send, and in repair mode an event is
// applied only where the stored rows differ and are older than the event: a row written after the event's time,
// by live ingest for instance, is left alone. A blueprint can be timed by its own lastUpdatedDate, so the version
// the merge brings in is dated by the save that made it. Everything without a date of its own (favorites,
// collections, profiles, moderators, tags, deletions) uses the backup instant. A current blueprint the backup
// lacks is phased out at the backup instant, again unless it was written after that. So is one the backup still
// holds but without a summary: the site lists, finds and shows a blueprint through its summary, so that is a
// blueprint whose deletion was left half done.
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
				// On every request, so the Worker can bring image details in at the backup instant.
				dumpTime,
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
		blueprintSummaries: {},
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

	// A dump with no summaries at all is a partial one, and says nothing about which blueprints are listed.
	const summaries = present<Record<string, unknown>>("blueprintSummaries");
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
		if (summaries !== undefined && !(key in summaries)) continue;
		blueprintKeys.push(key);
		batch[key] = value as Node;
		if (Object.keys(batch).length >= options.chunkSize)
		{
			await sendBatch();
		}
	}
	await sendBatch();
	report.blueprintsInDump = blueprintKeys.length;

	// The request that closes the dump: current blueprints it lacks are phased out, and the watermark advances.
	// It comes before the users, so the favorites of a blueprint that just ended end in the same pass.
	await send(
		{
			mode,
			events: [],
			expectedBlueprintKeys: blueprintKeys,
			dumpTime,
		},
	);
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
	return report;
};

export interface RederiveOptions
{
	mode: "shadow" | "repair";
	/** Strings per request. Each is read from the bucket and parsed within one invocation's limits. */
	pageSize: number;
	send: (request: ReconcileRequestBody) => Promise<RederiveResponse>;
}

export interface RederiveSummary
{
	checked: number;
	changedStrings: number;
	/** Strings whose rows differed, by table. */
	changedTables: Record<string, number>;
	/** Strings whose content the bucket does not hold. */
	missing: string[];
}

/**
 * Has the Worker check the game data of every stored string against what its parser derives today, a page at a
 * time, replacing the rows that differ in repair mode. A second run finds nothing to change.
 */
export const rederiveAll = async (options: RederiveOptions): Promise<RederiveSummary> =>
{
	const summary: RederiveSummary =
	{
		checked: 0,
		changedStrings: 0,
		changedTables: {},
		missing: [],
	};
	let after: string | null = "";
	while (after !== null)
	{
		const {rederive} = await options.send(
			{
				mode: options.mode,
				events: [],
				rederive:
				{
					after,
					limit: options.pageSize,
				},
			},
		);
		summary.checked += rederive.checked;
		summary.changedStrings += rederive.changed.length;
		summary.missing.push(...rederive.missing);
		for (const table of rederive.changed.flatMap((string) => string.tables))
		{
			summary.changedTables[table] = (summary.changedTables[table] ?? 0) + 1;
		}
		after = rederive.next;
	}
	return summary;
};
