import {createReadStream} from "node:fs";
import {mkdir, writeFile} from "node:fs/promises";
import {basename, join} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {parseArgs} from "node:util";
import {createGunzip} from "node:zlib";
import {ingestDump} from "./dumpIngestCore.ts";

// Ingests one Realtime Database backup (<instant>_<project>_data.json.gz) on top of the history in the local
// SQLite database built by importHistory.ts. Without --repair it only reports what would change. Blueprint strings
// the database did not have are written to --strings-out, named by their SHA-256, for uploadStrings.ts.

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
				"dump-time":
				{
					type: "string",
				},
				sqlite:
				{
					type: "string",
				},
				"strings-out":
				{
					type: "string",
				},
				repair:
				{
					type: "boolean",
					default: false,
				},
			},
		},
	);
	const {dump, sqlite} = values;
	const stringsDirectory = values["strings-out"];
	// A backup is named by the instant it was taken.
	const dumpTime = Date.parse(values["dump-time"] ?? basename(dump ?? "").split("_")[0]);
	if (!dump || !sqlite || !stringsDirectory || Number.isNaN(dumpTime))
	{
		throw new Error(
			"Usage: node workers/blueprints/local/ingestDump.ts --dump <instant>_data.json.gz --sqlite <file> --strings-out <dir> [--dump-time <ISO instant>] [--repair]",
		);
	}
	await mkdir(
		stringsDirectory,
		{
			recursive: true,
		},
	);

	const database = new DatabaseSync(sqlite);
	const report = await ingestDump(
		{
			database,
			strings:
			{
				put: (key, content) => writeFile(join(stringsDirectory, basename(key)), content),
			},
			readDump: () =>
			{
				const text = createReadStream(dump).pipe(createGunzip());
				text.setEncoding("utf8");
				return text as AsyncIterable<string>;
			},
			dumpTime,
			blueprintTime: "lastUpdatedDate",
			mode: values.repair ? "repair" : "shadow",
		},
	);
	database.close();
	console.log(JSON.stringify(report, null, "\t"));
};

await main();
