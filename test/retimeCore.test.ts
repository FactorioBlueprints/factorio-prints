// @vitest-environment node
import {DatabaseSync} from "node:sqlite";
import {describe, expect, it} from "vite-plus/test";
import {applyMigrations} from "../scripts/importHistory";
import
{
	buildDateTableStatements,
	RETIME_REPORT_QUERY,
	RETIME_STATEMENTS,
	VERSION_CUT_REPORT_QUERY,
	VERSION_CUT_STATEMENTS,
} from "../scripts/retimeCore";

const sentinel = 253402300799999;

describe("re-timing history versions to the date of the save that made them", () =>
{
	it("moves a current version back to its lastUpdatedDate with the rows it replaced, and skips what would break the order of versions", async () =>
	{
		const database = new DatabaseSync(":memory:");
		await applyMigrations(database, "workers/blueprints/migrations");
		const version = (key: string, number: number, from: number, to: number): void =>
		{
			database
				.prepare(
					`INSERT INTO blueprint (key, imgur_image_id, blueprint_string_sha, system_from, system_to, created_by_id,
						created_on, last_updated_by_id, title, description_markdown)
					VALUES (?, 'img', 'sha', ?, ?, 'user', 1, 'user', ?, '')`,
				)
				.run(key, from, to, `v${number}`);
			database
				.prepare(
					`INSERT INTO blueprint_version (key, system_from, system_to, created_by_id, created_on,
						last_updated_by_id, number) VALUES (?, ?, ?, 'user', 1, 'user', ?)`,
				)
				.run(key, from, to, number);
			database
				.prepare("INSERT INTO blueprint_private_data (key, system_from, system_to) VALUES (?, ?, ?)")
				.run(key, from, to);
		};
		const tag = (key: string, name: string, from: number, to: number): void =>
		{
			database
				.prepare(
					"INSERT INTO blueprint_tag (blueprint_key, tag_category, tag_name, system_from, system_to) VALUES (?, 'general', ?, ?, ?)",
				)
				.run(key, name, from, to);
		};
		// Saved at 150, between the backups taken at 100 and 200: the second version belongs at 150.
		version("edited", 1, 100, 200);
		version("edited", 2, 200, sentinel);
		tag("edited", "kept", 100, sentinel);
		tag("edited", "dropped", 100, 200);
		tag("edited", "added", 200, sentinel);
		// Created at 40 and first seen by the backup at 100.
		version("first", 1, 100, sentinel);
		// Dated 90, at or before the version it would follow: left alone.
		version("tooEarly", 1, 100, 200);
		version("tooEarly", 2, 200, sentinel);
		// A tag changed at 170 without a version, so moving the version to 150 would put it before that change.
		version("tagBetween", 1, 100, 200);
		version("tagBetween", 2, 200, sentinel);
		tag("tagBetween", "odd", 170, sentinel);
		// Dated after its current version, or absent from the dump: nothing to move.
		version("bumped", 1, 100, sentinel);
		version("undated", 1, 100, sentinel);

		const statements = [
			...buildDateTableStatements(
				[
					["edited", 150],
					["first", 40],
					["tooEarly", 90],
					["tagBetween", 150],
					["bumped", 300],
					["it's absent", 1],
				],
				150,
			),
			...RETIME_STATEMENTS,
		];
		database.exec(statements.join("\n"));
		const report =
		{
			...database.prepare(RETIME_REPORT_QUERY).get(),
		};
		database.exec(statements.join("\n"));

		const rows = (table: string, keyColumn: string, extra: string): unknown[] =>
			database
				.prepare(
					`SELECT ${keyColumn} AS key, ${extra} AS what, system_from, system_to FROM ${table}
					WHERE ${keyColumn} IN ('edited', 'first', 'tooEarly', 'tagBetween', 'bumped') ORDER BY 1, 3, 2`,
				)
				.all()
				.map((row) => Object.values(row).join(" "));
		expect(
			{
				report,
				blueprint: rows("blueprint", "key", "title"),
				version: rows("blueprint_version", "key", "number"),
				privateData: rows("blueprint_private_data", "key", "''"),
				tags: rows("blueprint_tag", "blueprint_key", "tag_name"),
			},
		).toStrictEqual(
			{
				report:
				{
					dated: 5,
					earlier: 4,
					retimed: 2,
					skipped: 2,
				},
				blueprint: [
					"bumped v1 100 253402300799999",
					"edited v1 100 150",
					"edited v2 150 253402300799999",
					"first v1 40 253402300799999",
					"tagBetween v1 100 200",
					"tagBetween v2 200 253402300799999",
					"tooEarly v1 100 200",
					"tooEarly v2 200 253402300799999",
				],
				version: [
					"bumped 1 100 253402300799999",
					"edited 1 100 150",
					"edited 2 150 253402300799999",
					"first 1 40 253402300799999",
					"tagBetween 1 100 200",
					"tagBetween 2 200 253402300799999",
					"tooEarly 1 100 200",
					"tooEarly 2 200 253402300799999",
				],
				privateData: [
					"bumped  100 253402300799999",
					"edited  100 150",
					"edited  150 253402300799999",
					"first  40 253402300799999",
					"tagBetween  100 200",
					"tagBetween  200 253402300799999",
					"tooEarly  100 200",
					"tooEarly  200 253402300799999",
				],
				tags: [
					"edited dropped 100 150",
					"edited kept 100 253402300799999",
					"edited added 150 253402300799999",
					"tagBetween odd 170 253402300799999",
				],
			},
		);
		database.close();
	});
});

describe("cutting the versions that history left out", () =>
{
	it("starts a version wherever a blueprint's tags or private data changed without one, renumbers the versions after it, and changes nothing when run again", async () =>
	{
		const database = new DatabaseSync(":memory:");
		await applyMigrations(database, "workers/blueprints/migrations");
		const version = (key: string, number: number, from: number, to: number, author = "user"): void =>
		{
			database
				.prepare(
					`INSERT INTO blueprint_version (key, system_from, system_to, created_by_id, created_on,
						last_updated_by_id, number) VALUES (?, ?, ?, ?, 7, ?, ?)`,
				)
				.run(key, from, to, author, author, number);
		};
		const tag = (key: string, name: string, from: number, to: number): void =>
		{
			database
				.prepare(
					"INSERT INTO blueprint_tag (blueprint_key, tag_category, tag_name, system_from, system_to) VALUES (?, 'general', ?, ?, ?)",
				)
				.run(key, name, from, to);
		};
		const privateData = (key: string, from: number, to: number): void =>
		{
			database
				.prepare("INSERT INTO blueprint_private_data (key, system_from, system_to) VALUES (?, ?, ?)")
				.run(key, from, to);
		};
		// Tags changed at 150 and again at 170 inside version 1, and at 250 inside version 2; private data at 270.
		version("edited", 1, 100, 200, "alice");
		version("edited", 2, 200, sentinel, "bob");
		tag("edited", "first", 100, 150);
		tag("edited", "second", 150, 170);
		tag("edited", "third", 170, 250);
		tag("edited", "fourth", 250, sentinel);
		privateData("edited", 100, 270);
		privateData("edited", 270, sentinel);
		// Everything changed with a version, including the tags that ended when the blueprint was deleted at 200.
		version("untouched", 1, 100, 200);
		tag("untouched", "always", 100, 200);
		privateData("untouched", 100, 200);
		// Deleted and created again: history numbered both versions 1.
		version("recreated", 1, 100, 200);
		version("recreated", 1, 300, sentinel);

		const statements = VERSION_CUT_STATEMENTS.join("\n");
		database.exec(statements);
		const report =
		{
			...database.prepare(VERSION_CUT_REPORT_QUERY).get(),
		};
		const rows = (): unknown[] =>
			database
				.prepare(
					"SELECT key, number, system_from, system_to, created_by_id FROM blueprint_version ORDER BY key, system_from",
				)
				.all()
				.map((row) => Object.values(row).join(" | "));
		const once = rows();
		database.exec(statements);

		expect(
			{
				report,
				once,
				twice: rows(),
			},
		).toStrictEqual(
			{
				report:
				{
					cuts: 4,
					blueprints: 1,
				},
				once: [
					"edited | 1 | 100 | 150 | alice",
					"edited | 2 | 150 | 170 | alice",
					"edited | 3 | 170 | 200 | alice",
					"edited | 4 | 200 | 250 | bob",
					"edited | 5 | 250 | 270 | bob",
					`edited | 6 | 270 | ${sentinel} | bob`,
					"recreated | 1 | 100 | 200 | user",
					`recreated | 2 | 300 | ${sentinel} | user`,
					"untouched | 1 | 100 | 200 | user",
				],
				twice: once,
			},
		);
		database.close();
	});
});
