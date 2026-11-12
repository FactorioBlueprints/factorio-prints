// @vitest-environment node
import {DatabaseSync} from "node:sqlite";
import {describe, expect, it} from "vite-plus/test";
import {buildTableDelta, checksumQuery, type DeltaTable} from "../scripts/d1DeltaCore";

const sentinel = 253402300799999;
const schema = `CREATE TABLE thing (key TEXT NOT NULL, system_to INTEGER NOT NULL, system_from INTEGER NOT NULL, title TEXT,
	PRIMARY KEY (key, system_to));
	CREATE UNIQUE INDEX thing_from ON thing (key, system_from);`;
const table: DeltaTable =
{
	name: "thing",
	columns: ["key", "system_to", "system_from", "title"],
	keyColumns: ["key", "system_to"],
	integerColumns: ["system_to", "system_from"],
};

const contents = (database: DatabaseSync, schemaName = "main"): unknown[] =>
	database
		.prepare(`SELECT key, system_to, system_from, title FROM ${schemaName}.thing ORDER BY key, system_from`)
		.all()
		.map((row) => Object.values(row).join(" | "));

describe("buildTableDelta", () =>
{
	it("turns the difference between two databases into deletes then inserts that bring the first to the second, and can be run again", () =>
	{
		const database = new DatabaseSync(":memory:");
		database.exec("ATTACH ':memory:' AS before");
		database.exec(schema);
		database.exec(schema.replaceAll("thing", "before.thing").replace("ON before.thing", "ON thing"));
		database.exec(
			`INSERT INTO before.thing VALUES
				('same', ${sentinel}, 100, 'unchanged'),
				('edited', ${sentinel}, 100, 'old title'),
				('retimed', 200, 100, 'v1'),
				('retimed', ${sentinel}, 200, 'v2'),
				('gone', ${sentinel}, 100, NULL),
				('removed', ${sentinel}, 100, 'dropped outright')`,
		);
		// The same versions after an ingestion and a re-time: phase-outs move a row's key, re-times move both ends.
		database.exec(
			`INSERT INTO thing VALUES
				('same', ${sentinel}, 100, 'unchanged'),
				('edited', 300, 100, 'old title'),
				('edited', ${sentinel}, 300, 'it''s new'),
				('retimed', 150, 100, 'v1'),
				('retimed', ${sentinel}, 150, 'v2'),
				('gone', 400, 100, NULL),
				('added', ${sentinel}, 300, 'brand new')`,
		);
		const remote = new DatabaseSync(":memory:");
		remote.exec(schema);
		for (const row of database.prepare("SELECT * FROM before.thing").all())
		{
			remote
				.prepare("INSERT INTO thing VALUES (?, ?, ?, ?)")
				.run(...(Object.values(row) as (string | number | null)[]));
		}

		const delta = buildTableDelta(database, "before", table, 200);
		for (const statement of [...delta.statements, ...delta.statements])
		{
			remote.exec(statement);
		}

		expect(
			{
				deleted: delta.deleted,
				inserted: delta.inserted,
				withinBudget: delta.statements.every((statement) => Buffer.byteLength(statement) <= 200),
				deletesFirst: delta.statements
					.map((statement) => statement.slice(0, 6))
					.join(",")
					.replace(/^(DELETE,)+(INSERT,?)+$/, "ok"),
				remote: contents(remote),
				checksumsAgree:
					JSON.stringify(remote.prepare(checksumQuery([table])).all()) ===
					JSON.stringify(database.prepare(checksumQuery([table])).all()),
			},
		).toStrictEqual(
			{
				deleted: 5,
				inserted: 6,
				withinBudget: true,
				deletesFirst: "ok",
				remote: contents(database),
				checksumsAgree: true,
			},
		);
		database.close();
		remote.close();
	});
});

describe("checksumQuery", () =>
{
	it("tells apart two tables that differ only in a number of the same length, such as a re-timed version", () =>
	{
		const database = new DatabaseSync(":memory:");
		database.exec(schema);
		const checksum = (): unknown => (
		{
			...database.prepare(checksumQuery([table])).get(),
		});
		database.exec("INSERT INTO thing VALUES ('a', 900, 200, 'héllo'), ('b', 900, 100, NULL)");
		const before = checksum();
		database.exec("UPDATE thing SET system_from = 150 WHERE key = 'a'");

		expect([before, checksum()]).toStrictEqual([
			{
				name: "thing",
				rows: 2,
				characters: 19,
				numbers: 2100,
			},
			{
				name: "thing",
				rows: 2,
				characters: 19,
				numbers: 2050,
			},
		]);
		database.close();
	});
});
