// @vitest-environment node
import {DatabaseSync} from "node:sqlite";
import {describe, expect, it} from "vite-plus/test";
import {buildLoadStatements, fingerprintQuery, rowsWrittenEstimate} from "../scripts/d1LoadCore";

describe("buildLoadStatements", () =>
{
	it("packs rows into literal multi-row inserts under the byte budget, escaping quotes and keeping NULL and numbers", () =>
	{
		expect(
			buildLoadStatements(
				"t",
				["key", "n", "x"],
				["key"],
				[
					["it's", 1, null],
					["b", 2, "two\nlines"],
					["c", 3, ""],
				],
				100,
			),
		).toStrictEqual([
			"INSERT OR IGNORE INTO \"t\" (\"key\", \"n\", \"x\") VALUES ('it''s', 1, NULL), ('b', 2, 'two\nlines');",
			'INSERT OR IGNORE INTO "t" ("key", "n", "x") VALUES (\'c\', 3, \'\');',
		]);
	});

	it("loads a value too large for one statement in pieces, and running the statements again changes nothing", () =>
	{
		// The astral character straddles a piece boundary: a split surrogate pair would not survive UTF-8.
		const big = `${"a".repeat(99)}\u{1F600}${"é".repeat(150)}'quoted'`;
		const statements = buildLoadStatements(
			"t",
			["key", "system_to", "v"],
			["key", "system_to"],
			[
				["small", 9, "s"],
				["big", 9, big],
				["after", 9, null],
			],
			400,
		);
		const database = new DatabaseSync(":memory:");
		database.exec(
			"CREATE TABLE t (key TEXT NOT NULL, system_to INTEGER NOT NULL, v TEXT, PRIMARY KEY (key, system_to))",
		);

		for (const statement of [...statements, ...statements])
		{
			database.exec(statement);
		}

		expect(
			{
				rows: database
					.prepare("SELECT key, system_to, v FROM t ORDER BY rowid")
					.all()
					.map((row) => (
					{
						...row,
					})),
				longestStatementBytes: Math.max(...statements.map((statement) => Buffer.byteLength(statement))) <= 400,
				wellFormed: statements.every((statement) => Buffer.from(statement).toString() === statement),
			},
		).toStrictEqual(
			{
				rows: [
					{
						key: "small",
						system_to: 9,
						v: "s",
					},
					{
						key: "big",
						system_to: 9,
						v: big,
					},
					{
						key: "after",
						system_to: 9,
						v: null,
					},
				],
				longestStatementBytes: true,
				wellFormed: true,
			},
		);
		database.close();
	});

	it("refuses a row that cannot fit a statement even with its large values loaded in pieces", () =>
	{
		expect(() => buildLoadStatements("t", ["key"], ["key"], [["k".repeat(20)]], 60)).toThrow(
			"A row of t needs a 66-byte statement, over the 60-byte budget",
		);
	});
});

describe("rowsWrittenEstimate", () =>
{
	it("counts one write per row plus one per index entry, as D1 bills them", () =>
	{
		expect(
			rowsWrittenEstimate([
				{
					rows: 10,
					indexes: 3,
				},
				{
					rows: 5,
					indexes: 0,
				},
			]),
		).toBe(45);
	});
});

describe("fingerprintQuery", () =>
{
	it("counts each table's rows and the total length of every value, so a short or truncated load shows up", () =>
	{
		const database = new DatabaseSync(":memory:");
		database.exec('CREATE TABLE a (k TEXT, n INTEGER); CREATE TABLE b ("index" TEXT)');
		database.exec("INSERT INTO a VALUES ('xy', 100), (NULL, 7); INSERT INTO b VALUES ('héllo')");

		expect(
			database
				.prepare(
					fingerprintQuery([
						{
							name: "a",
							columns: ["k", "n"],
						},
						{
							name: "b",
							columns: ["index"],
						},
					]),
				)
				.all()
				.map((row) => (
				{
					...row,
				})),
		).toStrictEqual([
			{
				name: "a",
				rows: 2,
				characters: 6,
			},
			{
				name: "b",
				rows: 1,
				characters: 5,
			},
		]);
		database.close();
	});
});
