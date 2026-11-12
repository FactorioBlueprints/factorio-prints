import {createReadStream} from "node:fs";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {parseArgs} from "node:util";
import {createGunzip} from "node:zlib";
import type {AuthExport} from "./authExportCore.ts";
import {DumpChildScanner} from "./dumpStreamCore.ts";
import
{
	type DatedBlueprint,
	type FavoritedBlueprint,
	planCounterRepairs,
	planDateRepairs,
	planFavoriteRemovals,
} from "./realtimeRepairCore.ts";

// A dry run: plans corrections to the Realtime Database's bookkeeping from a backup, the local copy of the
// blueprint store and an Auth listing, writes each plan as a multi-path update file, and prints what it found.
// It reads nothing from the live database and writes nothing to it; applyRealtimeUpdates.ts applies a plan.
//   dates.json      lastUpdatedDate set back where a save that changed nothing moved it forward
//   favorites.json  own-blueprint favorites and favorites of accounts that no longer exist, removed
//   counters.json   numberOfFavorites set to the favorites that remain

type Node = Record<string, unknown>;

const main = async (): Promise<void> =>
{
	const {values} = parseArgs(
		{
			options:
			{
				dump:
				{
					type: "string",
				},
				sqlite:
				{
					type: "string",
				},
				"auth-export":
				{
					type: "string",
				},
				"out-dir":
				{
					type: "string",
				},
			},
		},
	);
	const {dump, sqlite} = values;
	if (!dump || !sqlite || !values["auth-export"] || !values["out-dir"])
	{
		throw new Error(
			"Usage: node scripts/planRealtimeRepairs.ts --dump <instant>_data.json.gz --sqlite <file> --auth-export <users.json> --out-dir <dir>",
		);
	}
	const children = async function* (nodes: string[]): AsyncGenerator<[string, string, Node]>
	{
		const scanner = new DumpChildScanner(nodes);
		const text = createReadStream(dump).pipe(createGunzip());
		text.setEncoding("utf8");
		for await (const chunk of text)
		{
			for (const [node, key, json] of scanner.push(chunk as string))
			{
				yield [node, key, JSON.parse(json) as Node];
			}
		}
	};
	const count = (value: unknown): number => (typeof value === "number" ? value : 0);

	const summaryCounters = new Map<string, number>();
	for await (const [, key, summary] of children(["blueprintSummaries"]))
	{
		summaryCounters.set(key, count(summary.numberOfFavorites));
	}
	const database = new DatabaseSync(
		sqlite,
		{
			readOnly: true,
		},
	);
	const versionStart = database.prepare(
		"SELECT system_from FROM blueprint_version WHERE key = ? AND system_to = 253402300799999",
	);
	const dated: DatedBlueprint[] = [];
	const favorited: FavoritedBlueprint[] = [];
	for await (const [, id, blueprint] of children(["blueprints"]))
	{
		const stored = versionStart.get(id) as
			|
			  {
					system_from: number;
			  }
			| undefined;
		if (stored !== undefined && typeof blueprint.lastUpdatedDate === "number")
		{
			dated.push(
				{
					id,
					title: String(blueprint.title),
					realtimeDate: blueprint.lastUpdatedDate,
					storeDate: stored.system_from,
				},
			);
		}
		const author = blueprint.author as Node | undefined;
		favorited.push(
			{
				id,
				authorId: String(blueprint.authorId ?? author?.userId),
				favorites: Object.entries((blueprint.favorites ?? {}) as Node)
					.filter(([, favorite]) => favorite === true)
					.map(([userId]) => userId),
				blueprintCounter: count(blueprint.numberOfFavorites),
				summaryCounter: summaryCounters.get(id) ?? 0,
			},
		);
	}
	database.close();
	const accounts = new Set(
		(JSON.parse(await readFile(values["auth-export"], "utf8")) as AuthExport).users.map((user) => user.uid),
	);

	const dates = planDateRepairs(dated);
	const favorites = planFavoriteRemovals(favorited, accounts);
	const counters = planCounterRepairs(favorited, accounts);
	await mkdir(
		values["out-dir"],
		{
			recursive: true,
		},
	);
	for (const [name, plan] of Object.entries(
		{
			dates,
			favorites,
			counters,
		},
	))
	{
		await writeFile(join(values["out-dir"], `${name}.json`), JSON.stringify(plan.updates, null, "\t"));
	}
	await writeFile(
		join(values["out-dir"], "details.json"),
		JSON.stringify(
			{
				dates,
				favorites,
				counters,
			},
			null,
			"\t",
		),
	);
	const iso = (time: number): string => new Date(time).toISOString();
	const sum = (pick: (blueprint: FavoritedBlueprint) => number): number =>
		favorited.reduce((total, blueprint) => total + pick(blueprint), 0);
	console.log(
		JSON.stringify(
			{
				dates:
				{
					setBack: dates.repaired.length,
					storeNewerLeftAlone: dates.storeNewer.length,
					examples: [...dates.repaired]
						.sort((left, right) => right.realtimeDate - left.realtimeDate)
						.slice(0, 10)
						.map((repair) => (
						{
							id: repair.id,
							title: repair.title,
							realtimeDate: iso(repair.realtimeDate),
							newDate: iso(repair.newDate),
							why: "saved again with nothing stored changed; the store's version began at the new date",
						})),
				},
				favorites:
				{
					removed: favorites.removed.length,
					ownBlueprint: favorites.removed.filter((removal) => removal.why === "own blueprint").length,
					accountGone: favorites.removed.filter((removal) => removal.why !== "own blueprint").length,
				},
				counters:
				{
					blueprints: counters.repaired.length,
					blueprintCounterChanges: counters.repaired.filter(
						(repair) => repair.blueprintCounter !== repair.newValue,
					).length,
					summaryCounterChanges: counters.repaired.filter(
						(repair) => repair.summaryCounter !== repair.newValue,
					).length,
					sumOfBlueprintCountersBefore: sum((blueprint) => blueprint.blueprintCounter),
					sumOfSummaryCountersBefore: sum((blueprint) => blueprint.summaryCounter),
					sumAfter: sum((blueprint) => blueprint.favorites.length) - favorites.removed.length,
				},
			},
			null,
			"\t",
		),
	);
};

await main();
