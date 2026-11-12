import {execFileSync} from "node:child_process";
import {createWriteStream, existsSync, type WriteStream} from "node:fs";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {once} from "node:events";
import {join} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {parseArgs} from "node:util";
import {buildLoadStatements, fingerprintQuery, rowsWrittenEstimate} from "./d1LoadCore.ts";
import type {SqlValue} from "./historyImportCore.ts";

// Loads the SQLite database built by importHistory.ts into a remote D1 database that has the migrations applied.
// It writes the rows as SQL files of idempotent statements and runs each through `wrangler d1 execute --file`.
// A table whose remote fingerprint already equals the local one is skipped, and loaded.json remembers the files
// that went through, so an interrupted run picks up where it stopped. Without --apply it only writes the files and
// prints the estimate of rows written.

const ROWS_PER_READ = 5_000;
const BYTES_PER_FILE = 100_000_000;

interface Fingerprint
{
	name: string;
	rows: number;
	characters: number;
}

interface Table
{
	name: string;
	columns: string[];
	keyColumns: string[];
	indexes: number;
}

const localTables = (database: DatabaseSync): Table[] =>
{
	const names = database
		.prepare(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' " +
				// A leading underscore marks helper tables: D1's own, and those the local history tools leave behind.
				"AND name NOT LIKE '\\_%' ESCAPE '\\' ORDER BY name",
		)
		.all() as
	{
		name: string;
	}[];
	return names.map(({name}) =>
	{
		// hidden marks generated columns, which are never written.
		const columns = (
			database.prepare(`PRAGMA table_xinfo("${name}")`).all() as
			{
				name: string;
				pk: number;
				hidden: number;
			}[]
		).filter((column) => column.hidden === 0);
		return {
			name,
			columns: columns.map((column) => column.name),
			keyColumns: columns
				.filter((column) => column.pk > 0)
				.sort((left, right) => left.pk - right.pk)
				.map((column) => column.name),
			indexes: database.prepare(`PRAGMA index_list("${name}")`).all().length,
		};
	});
};

const writeSqlFiles = async (database: DatabaseSync, table: Table, sqlDirectory: string): Promise<string[]> =>
{
	const files: string[] = [];
	let stream: WriteStream | null = null;
	let bytes = 0;
	const close = async (): Promise<void> =>
	{
		if (stream !== null)
		{
			stream.end();
			await once(stream, "finish");
			stream = null;
		}
	};
	const write = async (rows: SqlValue[][]): Promise<void> =>
	{
		for (const statement of buildLoadStatements(table.name, table.columns, table.keyColumns, rows))
		{
			if (stream === null || bytes > BYTES_PER_FILE)
			{
				await close();
				const file = `${table.name}.${String(files.length + 1).padStart(3, "0")}.sql`;
				files.push(file);
				stream = createWriteStream(join(sqlDirectory, file));
				bytes = 0;
			}
			if (!stream.write(`${statement}\n`))
			{
				await once(stream, "drain");
			}
			bytes += Buffer.byteLength(statement) + 1;
		}
	};

	const select = database.prepare(
		`SELECT ${table.columns.map((column) => `"${column}"`).join(", ")} FROM "${table.name}"`,
	);
	select.setReturnArrays(true);
	let pending: SqlValue[][] = [];
	for (const row of select.iterate())
	{
		pending.push(row as unknown as SqlValue[]);
		if (pending.length >= ROWS_PER_READ)
		{
			await write(pending);
			pending = [];
		}
	}
	await write(pending);
	await close();
	return files;
};

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
				"sql-dir":
				{
					type: "string",
				},
				database:
				{
					type: "string",
				},
				config:
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
	const {config, database: remoteName, sqlite} = values;
	if (!sqlite || !sqlDirectory || !remoteName || !config)
	{
		throw new Error(
			"Usage: node scripts/loadD1.ts --sqlite <file> --sql-dir <dir> --database <d1 name> --config <wrangler.jsonc> [--apply]",
		);
	}
	await mkdir(
		sqlDirectory,
		{
			recursive: true,
		},
	);

	const wrangler = (...wranglerArguments: string[]): string =>
		execFileSync(
			"pnpm",
			[
				"exec",
				"wrangler",
				"d1",
				"execute",
				remoteName,
				"--remote",
				"--yes",
				"--config",
				config,
				...wranglerArguments,
			],
			{
				encoding: "utf8",
				maxBuffer: 64 * 1024 * 1024,
				stdio: ["ignore", "pipe", "inherit"],
			},
		);
	const fingerprintsByName = (fingerprints: Fingerprint[]): Map<string, Fingerprint> =>
		new Map(fingerprints.map((fingerprint) => [fingerprint.name, fingerprint]));
	const same = (left: Fingerprint | undefined, right: Fingerprint | undefined): boolean =>
		left !== undefined && right !== undefined && left.rows === right.rows && left.characters === right.characters;

	const database = new DatabaseSync(
		sqlite,
		{
			readOnly: true,
		},
	);
	const tables = localTables(database);
	const remoteFingerprints = (): Map<string, Fingerprint> =>
	{
		const output = wrangler("--json", "--command", tables.map((table) => fingerprintQuery([table])).join("; "));
		const results = JSON.parse(output.slice(output.indexOf("["))) as
		{
			results: Fingerprint[];
		}[];
		return fingerprintsByName(results.flatMap((result) => result.results));
	};
	const local = fingerprintsByName(
		tables.map((table) => database.prepare(fingerprintQuery([table])).get() as unknown as Fingerprint),
	);

	const before = remoteFingerprints();
	const toLoad = tables.filter((table) => !same(local.get(table.name), before.get(table.name)));
	const estimate = rowsWrittenEstimate(
		toLoad.map((table) => (
		{
			rows: local.get(table.name)!.rows,
			indexes: table.indexes,
		})),
	);
	console.log(`${toLoad.length} of ${tables.length} tables to load, about ${estimate} rows written`);
	if (!values.apply)
	{
		database.close();
		return;
	}

	const statePath = join(sqlDirectory, "loaded.json");
	const loaded = new Set<string>(
		existsSync(statePath) ? (JSON.parse(await readFile(statePath, "utf8")) as string[]) : [],
	);
	for (const table of toLoad)
	{
		const files = await writeSqlFiles(database, table, sqlDirectory);
		for (const file of files)
		{
			if (loaded.has(file))
			{
				continue;
			}
			const started = Date.now();
			wrangler("--file", join(sqlDirectory, file));
			loaded.add(file);
			await writeFile(statePath, JSON.stringify([...loaded], null, "\t"));
			console.log(`${file} loaded in ${Math.round((Date.now() - started) / 1000)} s`);
		}
	}
	database.close();

	const after = remoteFingerprints();
	const report = tables.map((table) => (
	{
		table: table.name,
		local: local.get(table.name),
		remote: after.get(table.name),
		match: same(local.get(table.name), after.get(table.name)),
	}));
	console.log(JSON.stringify(report, null, "\t"));
	const mismatched = report.filter((entry) => !entry.match).map((entry) => entry.table);
	if (mismatched.length > 0)
	{
		throw new Error(
			`Remote differs from local in: ${mismatched.join(", ")}. Delete ${statePath} to load them again.`,
		);
	}
};

await main();
