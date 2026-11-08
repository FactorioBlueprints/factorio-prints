import {describe, expect, it} from "vite-plus/test";
import {buildInsertBatches, coerceValue, CsvRowParser, tableNameFor} from "../scripts/historyImportCore";

const parseAll = (chunks: string[]): (string | null)[][] =>
{
	const parser = new CsvRowParser();
	const rows = chunks.flatMap((chunk) => parser.push(chunk));
	return [...rows, ...parser.end()];
};

describe("CsvRowParser", () =>
{
	it("reads CSVWRITE output, where NULL is an unquoted empty field and strings are quoted", () =>
	{
		expect(parseAll(['"A","B","C"\n"x",,""\n'])).toStrictEqual([
			["A", "B", "C"],
			["x", null, ""],
		]);
	});

	it("unescapes doubled quotes and keeps newlines and commas inside quoted fields", () =>
	{
		expect(parseAll(['"say ""hi""","line1\nline2, still"\n'])).toStrictEqual([['say "hi"', "line1\nline2, still"]]);
	});

	it("handles rows, fields and escaped quotes split across chunk boundaries", () =>
	{
		const text = '"a""b","c"\n,"d"\n';
		for (let split = 0; split <= text.length; split++)
		{
			expect(parseAll([text.slice(0, split), text.slice(split)])).toStrictEqual([
				['a"b', "c"],
				[null, "d"],
			]);
		}
	});

	it("emits a final row that has no trailing newline", () =>
	{
		expect(parseAll(['"a","b"'])).toStrictEqual([["a", "b"]]);
	});

	it("accepts CRLF line endings", () =>
	{
		expect(parseAll(['"a","b"\r\n"c","d"\r\n'])).toStrictEqual([
			["a", "b"],
			["c", "d"],
		]);
	});
});

describe("coerceValue", () =>
{
	it("turns integer columns into numbers, including booleans and epoch milliseconds", () =>
	{
		expect([
			coerceValue("1493041443000", "INTEGER"),
			coerceValue("TRUE", "INTEGER"),
			coerceValue("FALSE", "INTEGER"),
			coerceValue(null, "INTEGER"),
		]).toStrictEqual([1493041443000, 1, 0, null]);
	});

	it("keeps text columns as strings, including empty strings and numeric-looking text", () =>
	{
		expect([coerceValue("", "TEXT"), coerceValue("007", "TEXT"), coerceValue(null, "TEXT")]).toStrictEqual([
			"",
			"007",
			null,
		]);
	});

	it("rejects a non-numeric value in an integer column instead of storing garbage", () =>
	{
		expect(() => coerceValue("abc", "INTEGER")).toThrow("not an integer");
	});
});

describe("tableNameFor", () =>
{
	it("lowercases table names", () =>
	{
		expect(tableNameFor("BLUEPRINT_GAME_DATA_ENTITY")).toBe("blueprint_game_data_entity");
	});
});

describe("buildInsertBatches", () =>
{
	it("packs rows into multi-row inserts that never exceed the bound-parameter limit", () =>
	{
		const rows = Array.from(
			{
				length: 7,
			},
			(_, index) => [`k${index}`, index, null],
		);

		const batches = buildInsertBatches("t", ["key", "n", "x"], rows, 6);

		expect(batches).toStrictEqual([
			{
				sql: 'INSERT INTO "t" ("key", "n", "x") VALUES (?, ?, ?), (?, ?, ?)',
				params: ["k0", 0, null, "k1", 1, null],
			},
			{
				sql: 'INSERT INTO "t" ("key", "n", "x") VALUES (?, ?, ?), (?, ?, ?)',
				params: ["k2", 2, null, "k3", 3, null],
			},
			{
				sql: 'INSERT INTO "t" ("key", "n", "x") VALUES (?, ?, ?), (?, ?, ?)',
				params: ["k4", 4, null, "k5", 5, null],
			},
			{
				sql: 'INSERT INTO "t" ("key", "n", "x") VALUES (?, ?, ?)',
				params: ["k6", 6, null],
			},
		]);
	});

	it("starts a new statement before a row would push it past the byte budget, so no statement nears 100 KB", () =>
	{
		const big = "x".repeat(60_000);
		const rows = [
			["a", big],
			["b", "small"],
			["c", big],
		];

		const batches = buildInsertBatches("t", ["key", "v"], rows, 100, 90_000);

		expect(
			batches.map((batch) => batch.params.filter((value) => typeof value === "string" && value.length === 1)),
		).toStrictEqual([["a", "b"], ["c"]]);
	});

	it("refuses a table with more columns than the parameter limit allows in one row", () =>
	{
		expect(() => buildInsertBatches("t", ["a", "b", "c"], [[1, 2, 3]], 2)).toThrow("parameter limit");
	});
});
