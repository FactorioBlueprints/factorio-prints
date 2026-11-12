import {createReadStream} from "node:fs";
import {mkdir, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {parseArgs} from "node:util";
import {createGunzip} from "node:zlib";
import {DumpChildScanner} from "./dumpStreamCore.ts";
import
{
	buildDateTableStatements,
	RETIME_REPORT_QUERY,
	RETIME_STATEMENTS,
	VERSION_CUT_REPORT_QUERY,
	VERSION_CUT_STATEMENTS,
} from "./retimeCore.ts";

// Brings the version history in the local SQLite database in line with the edits it records. First it starts the
// versions history left out, where only a blueprint's tags or private data changed. Then it re-times each current
// version to the lastUpdatedDate a Realtime Database backup gives the blueprint, where that is earlier than the
// backup instant history stamped the version with. The statements are written to one SQL file, which is also what a
// remote D1 database would be given; without --apply nothing is changed.

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
				"sql-dir":
				{
					type: "string",
				},
				apply:
				{
					type: "boolean",
					default: false,
				},
			},
		},
	);
	const sqlDirectory = values["sql-dir"];
	const {dump, sqlite} = values;
	if (!dump || !sqlite || !sqlDirectory)
	{
		throw new Error(
			"Usage: node scripts/retimeHistory.ts --dump <instant>_data.json.gz --sqlite <file> --sql-dir <dir> [--apply]",
		);
	}

	const scanner = new DumpChildScanner(["blueprints"]);
	const dates: [string, number][] = [];
	const text = createReadStream(dump).pipe(createGunzip());
	text.setEncoding("utf8");
	for await (const chunk of text)
	{
		for (const [, key, json] of scanner.push(chunk as string))
		{
			const {lastUpdatedDate} = JSON.parse(json) as
			{
				lastUpdatedDate?: unknown;
			};
			if (typeof lastUpdatedDate === "number")
			{
				dates.push([key, lastUpdatedDate]);
			}
		}
	}

	const statements = [...VERSION_CUT_STATEMENTS, ...buildDateTableStatements(dates), ...RETIME_STATEMENTS];
	await mkdir(
		sqlDirectory,
		{
			recursive: true,
		},
	);
	const sqlPath = join(sqlDirectory, "retime_history.sql");
	await writeFile(sqlPath, `${statements.join("\n")}\n`);
	console.log(`${dates.length} dated blueprints in the dump; statements written to ${sqlPath}`);
	if (!values.apply)
	{
		return;
	}

	const database = new DatabaseSync(sqlite);
	database.exec("BEGIN");
	for (const statement of statements)
	{
		database.exec(statement);
	}
	database.exec("COMMIT");
	const report =
	{
		versionsCut: database.prepare(VERSION_CUT_REPORT_QUERY).get(),
		retime: database.prepare(RETIME_REPORT_QUERY).get(),
	};
	const skipped = database
		.prepare("SELECT key, old_from, new_from FROM _blueprint_retime WHERE eligible = 0 ORDER BY key")
		.all();
	database.close();
	const skippedPath = join(sqlDirectory, "retime_skipped.json");
	await writeFile(skippedPath, JSON.stringify(skipped, null, "\t"));
	console.log(
		JSON.stringify(
			{
				...report,
				skippedPath,
			},
			null,
			"\t",
		),
	);
};

await main();
