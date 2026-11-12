import {execFileSync} from "node:child_process";
import {existsSync} from "node:fs";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {parseArgs} from "node:util";
import {buildTableDelta, checksumQuery, type DeltaTable} from "./d1DeltaCore.ts";
import {rowsWrittenEstimate} from "./d1LoadCore.ts";

// Brings a remote D1 database that matches one local SQLite database (--before) to the state of another (--after),
// writing only the rows that differ. Each changed table gets one SQL file of idempotent statements, run through
// `wrangler d1 execute --file`; delta-loaded.json remembers the files that went through, so an interrupted run
// picks up where it stopped. Afterwards every table's checksum is compared with the local one.
// Without a target it only writes the files and prints the estimate of rows written. --rehearse applies the files
// to a local SQLite copy of the before state instead of the remote database, with the same check.

interface Checksum
{
	name: string;
	rows: number;
	characters: number;
	numbers: number;
}

const tablesOf = (
	database: DatabaseSync,
): (DeltaTable &
{
	indexes: number;
})[] =>
{
	// Names with a leading underscore are helper tables of the local scripts and of D1 itself.
	const names = database
		.prepare(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' " +
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
				type: string;
				pk: number;
				hidden: number;
			}[]
		).filter((column) => column.hidden === 0);
		const keyColumns = columns
			.filter((column) => column.pk > 0)
			.sort((left, right) => left.pk - right.pk)
			.map((column) => column.name);
		return {
			name,
			columns: columns.map((column) => column.name),
			keyColumns: keyColumns.length > 0 ? keyColumns : columns.map((column) => column.name),
			integerColumns: columns
				.filter((column) => column.type.toUpperCase().includes("INT"))
				.map((column) => column.name),
			indexes: database.prepare(`PRAGMA index_list("${name}")`).all().length,
		};
	});
};

const main = async (): Promise<void> =>
{
	const {values} = parseArgs(
		{
			options:
			{
				before:
				{
					type: "string",
				},
				after:
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
				rehearse:
				{
					type: "string",
				},
			},
		},
	);
	const sqlDirectory = values["sql-dir"];
	const {after, before, config, database: remoteName, rehearse} = values;
	const remote = remoteName !== undefined && config !== undefined;
	if (
		!before ||
		!after ||
		!sqlDirectory ||
		(remoteName === undefined) !== (config === undefined) ||
		(remote && rehearse)
	)
	{
		throw new Error(
			"Usage: node scripts/deltaD1.ts --before <file> --after <file> --sql-dir <dir> [--database <d1 name> --config <wrangler.jsonc> | --rehearse <copy of before>]",
		);
	}
	await mkdir(
		sqlDirectory,
		{
			recursive: true,
		},
	);

	const database = new DatabaseSync(
		after,
		{
			readOnly: true,
		},
	);
	database.prepare("ATTACH ? AS before").run(before);
	const tables = tablesOf(database);
	const files: string[] = [];
	const changed:
	{
		rows: number;
		indexes: number;
	}[] = [];
	const summary: Record<
		string,
		{
			deleted: number;
			inserted: number;
			statements: number;
		}
	> = {};
	for (const table of tables)
	{
		const delta = buildTableDelta(database, "before", table);
		if (delta.statements.length === 0)
		{
			continue;
		}
		const file = `delta.${table.name}.sql`;
		await writeFile(join(sqlDirectory, file), `${delta.statements.join("\n")}\n`);
		files.push(file);
		changed.push(
			{
				rows: delta.deleted + delta.inserted,
				indexes: table.indexes,
			},
		);
		summary[table.name] =
		{
			deleted: delta.deleted,
			inserted: delta.inserted,
			statements: delta.statements.length,
		};
	}
	const local = database.prepare(checksumQuery(tables)).all() as unknown as Checksum[];
	database.close();
	console.log(
		JSON.stringify(
			{
				tables: summary,
				files,
				estimatedRowsWritten: rowsWrittenEstimate(changed),
			},
			null,
			"\t",
		),
	);

	let target: Checksum[];
	if (rehearse)
	{
		const copy = new DatabaseSync(rehearse);
		for (const file of files)
		{
			copy.exec("BEGIN");
			copy.exec(await readFile(join(sqlDirectory, file), "utf8"));
			copy.exec("COMMIT");
		}
		target = copy.prepare(checksumQuery(tables)).all() as unknown as Checksum[];
		copy.close();
	}
	else if (remote)
	{
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
		const statePath = join(sqlDirectory, "delta-loaded.json");
		const loaded = new Set<string>(
			existsSync(statePath) ? (JSON.parse(await readFile(statePath, "utf8")) as string[]) : [],
		);
		for (const file of files)
		{
			if (loaded.has(file))
			{
				continue;
			}
			wrangler("--file", join(sqlDirectory, file));
			loaded.add(file);
			await writeFile(statePath, JSON.stringify([...loaded], null, "\t"));
			console.log(`${file} loaded`);
		}
		const output = wrangler("--json", "--command", tables.map((table) => checksumQuery([table])).join("; "));
		const results = JSON.parse(output.slice(output.indexOf("["))) as
		{
			results: Checksum[];
		}[];
		target = results.flatMap((result) => result.results);
	}
	else
	{
		return;
	}

	const byName = new Map(target.map((checksum) => [checksum.name, checksum]));
	const mismatched = local
		.filter((checksum) => JSON.stringify(checksum) !== JSON.stringify(byName.get(checksum.name)))
		.map((checksum) => checksum.name);
	console.log(`${local.length - mismatched.length} of ${local.length} tables match the local result`);
	if (mismatched.length > 0)
	{
		throw new Error(`The target differs from the local result in: ${mismatched.join(", ")}`);
	}
};

await main();
