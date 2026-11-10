import {createReadStream} from "node:fs";
import {mkdir, readdir, readFile, stat, writeFile} from "node:fs/promises";
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
	rekeyRow,
	sha256Hex,
	type SqlValue,
	tableNameFor,
} from "./historyImportCore.ts";
import {STRING_STORED_IN_R2} from "../workers/blueprints/src/stringLayout.ts";
import {REBUILD_VOTE_SUMMARY_STATEMENTS} from "../workers/blueprints/src/voteSummaryRebuild.ts";

// Imports factorio.school's history database, exported per table with CSVWRITE (timestamps already converted to epoch
// milliseconds and the end-of-time sentinel remapped), into a local SQLite database built from the drizzle-kit
// migrations. The history keys blueprint strings by SHA-1; the import re-keys them, and every reference, by SHA-256.

// BLUEPRINT_VOTE_SUMMARY is a cache of the favorite count, rebuilt from the imported votes rather than copied (and
// still temporal in older copies of the history database). BLUEPRINT_STRING_CONTENT is
// not a table: it holds the strings, which go to R2 under their SHA-256 and give the SHA-1 to SHA-256 key map.
const SKIPPED_TABLES = new Set(["BLUEPRINT_VOTE_SUMMARY", "BLUEPRINT_STRING_CONTENT"]);
// Columns the export leaves out because their content lives in R2. They stay NOT NULL until Klass drops them.
const EXTERNAL_COLUMNS: Readonly<Record<string, Readonly<Record<string, string>>>> =
{
	blueprint_string:
	{
		blueprint_string: STRING_STORED_IN_R2,
	},
};
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

const importTable = async (
	database: DatabaseSync,
	csvPath: string,
	csvTable: string,
	sha256BySha1: ReadonlyMap<string, string>,
): Promise<number> =>
{
	const table = tableNameFor(csvTable);
	const columns = writableColumns(database, table);
	const external = Object.entries(EXTERNAL_COLUMNS[table] ?? {});
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
		const names = [...header.map((column) => column.name), ...external.map(([name]) => name)];
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
		const names = header.map((column) => column.name);
		pending.push([
			...rekeyRow(csvTable, names, row, sha256BySha1).map((value, index) =>
				coerceValue(value, header![index].type),
			),
			...external.map(([, value]) => value),
		]);
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

/** Writes each string to a file named by its SHA-256, and returns the SHA-256 of every SHA-1 key in the export. */
const writeStrings = async (csvPath: string, outputDirectory: string): Promise<Map<string, string>> =>
{
	await mkdir(
		outputDirectory,
		{
			recursive: true,
		},
	);
	const parser = new CsvRowParser();
	let header = true;
	const sha256BySha1 = new Map<string, string>();
	const accept = async (row: CsvField[]): Promise<void> =>
	{
		if (header)
		{
			header = false;
			return;
		}
		const [sha1, content] = row;
		if (!sha1 || !/^[0-9a-f]{40}$/.test(sha1) || content === null || sha256BySha1.has(sha1))
		{
			throw new Error(`Bad blueprint string row for sha ${sha1}`);
		}
		const sha256 = sha256Hex(content);
		// A rerun finds the file already there under its digest, so there is nothing to write again.
		const path = join(outputDirectory, sha256);
		const existing = await stat(path).catch(() => null);
		if (existing?.size !== Buffer.byteLength(content))
		{
			await writeFile(path, content);
		}
		sha256BySha1.set(sha1, sha256);
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
	return sha256BySha1;
};

/**
 * Imports every table of the export into a migrated database, re-keyed by SHA-256, with the strings written to
 * stringsDirectory for R2. Returns the rows imported per table.
 */
export const importCsvDirectory = async (
	database: DatabaseSync,
	csvDirectory: string,
	stringsDirectory: string,
): Promise<Record<string, number>> =>
{
	const report: Record<string, number> = {};
	const sha256BySha1 = await writeStrings(join(csvDirectory, "BLUEPRINT_STRING_CONTENT.csv"), stringsDirectory);
	report["r2:blueprint-strings"] = sha256BySha1.size;
	console.error(`Wrote ${sha256BySha1.size} strings`);

	const csvFiles = (await readdir(csvDirectory)).filter((file) => file.endsWith(".csv")).sort();
	for (const file of csvFiles)
	{
		const csvTable = file.replace(/\.csv$/, "");
		if (SKIPPED_TABLES.has(csvTable))
		{
			continue;
		}
		report[tableNameFor(csvTable)] = await importTable(database, join(csvDirectory, file), csvTable, sha256BySha1);
		console.error(`${csvTable}: ${report[tableNameFor(csvTable)]} rows`);
	}

	rebuildVoteSummaryCache(database);
	report["blueprint_vote_summary (rebuilt)"] = (
		database.prepare("SELECT count(*) AS count FROM blueprint_vote_summary").get() as
		{
			count: number;
		}
	).count;
	return report;
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
	const stringsDirectory = values["strings-out"];
	if (!csvDirectory || !migrationsDirectory || !sqlitePath || !stringsDirectory)
	{
		throw new Error(
			"Usage: node scripts/importHistory.ts --csv-dir <dir> --migrations-dir <dir> --sqlite <file> --strings-out <dir>",
		);
	}

	const database = new DatabaseSync(sqlitePath);
	await applyMigrations(database, migrationsDirectory);
	const report = await importCsvDirectory(database, csvDirectory, stringsDirectory);
	database.close();
	console.log(JSON.stringify(report, null, 2));
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedModuleUrl)
{
	await main();
}
