import {readFile} from "node:fs/promises";
import {basename, join} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {parseArgs} from "node:util";
import {drizzle} from "drizzle-orm/d1";
import {rederiveAll} from "../../../scripts/dumpReconcileCore.ts";
import {rederiveGameData} from "../src/reconcile/rederive.ts";
import {localD1} from "./localD1.ts";

// Checks the game data of every blueprint string in the local SQLite database against what the parser derives
// today, reading each string from the given directories (files named by SHA-256, as importHistory.ts and
// ingestDump.ts write them). Without --repair it only reports what differs.

const main = async (): Promise<void> =>
{
	const {values} = parseArgs(
		{
			options:
			{
				sqlite:
				{
					type: "string",
				},
				"strings-in":
				{
					type: "string",
					multiple: true,
				},
				repair:
				{
					type: "boolean",
					default: false,
				},
			},
		},
	);
	const directories = values["strings-in"] ?? [];
	if (!values.sqlite || directories.length === 0)
	{
		throw new Error(
			"Usage: node workers/blueprints/local/rederiveGameData.ts --sqlite <file> --strings-in <dir> [--strings-in <dir>] [--repair]",
		);
	}
	const database = new DatabaseSync(values.sqlite);
	const strings =
	{
		get: async (key: string) =>
		{
			for (const directory of directories)
			{
				const content = await readFile(join(directory, basename(key)), "utf8").catch(() => null);
				if (content !== null)
				{
					return {
						text: async () => content,
					};
				}
			}
			return null;
		},
	};
	const dependencies =
	{
		db: drizzle(localD1(database) as unknown as D1Database),
		strings: strings as unknown as R2Bucket,
	};
	const summary = await rederiveAll(
		{
			mode: values.repair ? "repair" : "shadow",
			pageSize: 200,
			send: async (request) => (
			{
				rederive: await rederiveGameData(
					dependencies,
					{
						...request.rederive!,
						dryRun: request.mode === "shadow",
					},
				),
			}),
		},
	);
	database.close();
	console.log(JSON.stringify(summary, null, "\t"));
};

await main();
