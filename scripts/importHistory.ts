import {createReadStream} from "node:fs";
import {mkdir, readdir, readFile, writeFile} from "node:fs/promises";
import {join, resolve} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {pathToFileURL} from "node:url";
import {parseArgs} from "node:util";
import
{
	buildInsertBatches,
	type ColumnType,
	coerceValue,
	type CsvField,
	CsvRowParser,
	type SqlValue,
	tableNameFor,
} from "./historyImportCore.ts";
import {REBUILD_VOTE_SUMMARY_STATEMENTS} from "../workers/blueprints/src/voteSummaryRebuild.ts";

// Imports factorio.school's history database, exported per table with CSVWRITE (timestamps already converted to epoch
// milliseconds and the end-of-time sentinel remapped), into a local SQLite database built from the drizzle-kit
// migrations. It uses the same bound-parameter statements the remote D1 import will use.

// Tables the D1 plan deliberately leaves out. BLUEPRINT_VOTE_SUMMARY is a cache of the favorite count, rebuilt from
// the imported votes rather than copied.
// BLUEPRINT_STRING waits on a decision: the Klass model stores the string inline (NOT NULL), but the plan keeps
// strings in R2, and 565 of them exceed D1's 2 MB value limit. Its content is written out for R2 with --strings-out.
const SKIPPED_TABLES = new Set(["BLUEPRINT_VOTE_SUMMARY", "BLUEPRINT_STRING", "BLUEPRINT_STRING_CONTENT"]);
const ROWS_PER_FLUSH = 5_000;

interface TableColumn
{
	name: string;
	type: ColumnType;
}

export const applyMigrations = async (database: DatabaseSync, migrationsDirectory: string): Promise<void> =>
{
	const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
	for (const file of files)
	{
		const sql = await readFile(join(migrationsDirectory, file), "utf8");
		for (const statement of sql.split("--> statement-breakpoint"))
		{
			if (statement.trim().length > 0)
			{
				database.exec(statement);
			}
		}
	}
};

/** Recounts the blueprint_vote_summary cache from the imported current blueprints and votes. */
export const rebuildVoteSummaryCache = (database: DatabaseSync): void =>
{
	database.exec("BEGIN");
	for (const statement of REBUILD_VOTE_SUMMARY_STATEMENTS)
	{
		database.exec(statement);
	}
	database.exec("COMMIT");
};

const writableColumns = (database: DatabaseSync, table: string): Map<string, TableColumn> =>
{
	// table_xinfo marks generated columns with hidden = 2 (virtual) or 3 (stored); those are never written.
	const rows = database.prepare(`PRAGMA table_xinfo("${table}")`).all() as
	{
		name: string;
		type: string;
		hidden: number;
	}[];
	if (rows.length === 0)
	{
		throw new Error(`Table ${table} does not exist in the migrated schema`);
	}
	return new Map(
		rows
			.filter((row) => row.hidden === 0)
			.map((row) =>
			{
				const type = row.type.toUpperCase();
				const columnType: ColumnType = type.includes("INT") ? "INTEGER" : type === "REAL" ? "REAL" : "TEXT";
				return [
					row.name,
					{
						name: row.name,
						type: columnType,
					},
				];
			}),
	);
};

const importTable = async (database: DatabaseSync, csvPath: string, csvTable: string): Promise<number> =>
{
	const table = tableNameFor(csvTable);
	const columns = writableColumns(database, table);
	const parser = new CsvRowParser();
	let header: TableColumn[] | null = null;
	let pending: SqlValue[][] = [];
	let imported = 0;

	const flush = (): void =>
	{
		if (header === null || pending.length === 0)
		{
			return;
		}
		const names = header.map((column) => column.name);
		database.exec("BEGIN");
		for (const batch of buildInsertBatches(table, names, pending))
		{
			database.prepare(batch.sql).run(...batch.params);
		}
		database.exec("COMMIT");
		imported += pending.length;
		pending = [];
	};

	const accept = (row: CsvField[]): void =>
	{
		if (header === null)
		{
			header = row.map((name) =>
			{
				const column = columns.get((name ?? "").toLowerCase());
				if (!column)
				{
					throw new Error(`${csvTable}.${name} has no matching column in ${table}`);
				}
				return column;
			});
			return;
		}
		if (row.length !== header.length)
		{
			throw new Error(
				`${csvTable} row ${imported + pending.length + 1} has ${row.length} fields, expected ${header.length}`,
			);
		}
		pending.push(row.map((value, index) => coerceValue(value, header![index].type)));
		if (pending.length >= ROWS_PER_FLUSH)
		{
			flush();
		}
	};

	for await (const chunk of createReadStream(
		csvPath,
		{
			encoding: "utf8",
		},
	))
	{
		parser.push(chunk as string).forEach(accept);
	}
	parser.end().forEach(accept);
	flush();
	return imported;
};

const writeStrings = async (csvPath: string, outputDirectory: string): Promise<number> =>
{
	await mkdir(
		outputDirectory,
		{
			recursive: true,
		},
	);
	const parser = new CsvRowParser();
	let header = true;
	let written = 0;
	const accept = async (row: CsvField[]): Promise<void> =>
	{
		if (header)
		{
			header = false;
			return;
		}
		const [sha, content] = row;
		if (!sha || !/^[0-9a-f]{40}$/.test(sha) || content === null)
		{
			throw new Error(`Bad blueprint string row for sha ${sha}`);
		}
		await writeFile(join(outputDirectory, sha), content);
		written++;
	};
	for await (const chunk of createReadStream(
		csvPath,
		{
			encoding: "utf8",
		},
	))
	{
		for (const row of parser.push(chunk as string))
		{
			await accept(row);
		}
	}
	for (const row of parser.end())
	{
		await accept(row);
	}
	return written;
};

const main = async (): Promise<void> =>
{
	const {values} = parseArgs(
		{
			options:
			{
				"csv-dir":
				{
					type: "string",
				},
				"migrations-dir":
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
			},
		},
	);
	const csvDirectory = values["csv-dir"];
	const migrationsDirectory = values["migrations-dir"];
	const sqlitePath = values.sqlite;
	if (!csvDirectory || !migrationsDirectory || !sqlitePath)
	{
		throw new Error(
			"Usage: node scripts/importHistory.ts --csv-dir <dir> --migrations-dir <dir> --sqlite <file> [--strings-out <dir>]",
		);
	}

	const database = new DatabaseSync(sqlitePath);
	await applyMigrations(database, migrationsDirectory);

	const report: Record<string, number> = {};
	const csvFiles = (await readdir(csvDirectory)).filter((file) => file.endsWith(".csv")).sort();
	for (const file of csvFiles)
	{
		const csvTable = file.replace(/\.csv$/, "");
		if (SKIPPED_TABLES.has(csvTable))
		{
			continue;
		}
		report[tableNameFor(csvTable)] = await importTable(database, join(csvDirectory, file), csvTable);
		console.error(`${csvTable}: ${report[tableNameFor(csvTable)]} rows`);
	}

	rebuildVoteSummaryCache(database);
	report["blueprint_vote_summary (rebuilt)"] = (
		database.prepare("SELECT count(*) AS count FROM blueprint_vote_summary").get() as
		{
			count: number;
		}
	).count;

	if (values["strings-out"])
	{
		report["r2:blueprint-strings"] = await writeStrings(
			join(csvDirectory, "BLUEPRINT_STRING_CONTENT.csv"),
			values["strings-out"],
		);
	}

	database.close();
	console.log(JSON.stringify(report, null, 2));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedModuleUrl)
{
	await main();
}
