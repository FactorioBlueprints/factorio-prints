// @vitest-environment node
import {mkdtemp, readdir, readFile, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {DatabaseSync} from "node:sqlite";
import {describe, expect, it} from "vite-plus/test";
import {applyMigrations, importCsvDirectory, rebuildVoteSummaryCache} from "../scripts/importHistory";

const sentinel = 253402300799999;

describe("rebuildVoteSummaryCache", () =>
{
	it("fills blueprint_vote_summary from the imported current blueprints and votes", async () =>
	{
		const database = new DatabaseSync(":memory:");
		await applyMigrations(database, "workers/blueprints/migrations");
		const insertBlueprint = database.prepare(
			`INSERT INTO blueprint (key, imgur_image_id, blueprint_string_sha, system_from, system_to, created_by_id,
				created_on, last_updated_by_id, title, description_markdown)
			VALUES (?, 'img', 'sha', 1, ?, 'user', 1, 'user', 'title', '')`,
		);
		insertBlueprint.run("a", sentinel);
		insertBlueprint.run("b", sentinel);
		insertBlueprint.run("deleted", 2);
		const insertVote = database.prepare(
			"INSERT INTO vote (user_id, blueprint_key, system_from, system_to, direction) VALUES (?, ?, 1, ?, ?)",
		);
		insertVote.run("alice", "a", sentinel, "up");
		insertVote.run("bob", "a", 2, "up");
		insertVote.run("carol", "b", sentinel, "down");

		rebuildVoteSummaryCache(database);

		expect(
			database
				.prepare("SELECT key, number_of_upvotes FROM blueprint_vote_summary ORDER BY key")
				.all()
				.map((row) => (
				{
					...row,
				})),
		).toStrictEqual([
			{
				key: "a",
				number_of_upvotes: 1,
			},
			{
				key: "b",
				number_of_upvotes: 0,
			},
		]);
		database.close();
	});
});

describe("importCsvDirectory", () =>
{
	const helloSha256 = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
	const worldSha256 = "486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7";
	const helloSha1 = "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d";
	const worldSha1 = "7c211433f02071597741e6ff5a8ea34789abbf43";

	const exportOf = async (files: Record<string, string>): Promise<string> =>
	{
		const directory = await mkdtemp(join(tmpdir(), "history-export-"));
		for (const [name, content] of Object.entries(files))
		{
			await writeFile(join(directory, name), content);
		}
		return directory;
	};

	const rows = (database: DatabaseSync, sql: string): Record<string, unknown>[] =>
		database
			.prepare(sql)
			.all()
			.map((row) => (
			{
				...row,
			}));

	it("re-keys every string and reference from SHA-1 to SHA-256, keeps the content out of the database and writes it out for R2", async () =>
	{
		const csvDirectory = await exportOf(
			{
				"BLUEPRINT_STRING.csv": `"SHA","CREATED_ON","CREATED_BY_ID"\n"${helloSha1}","5","alice"\n"${worldSha1}","6","bob"\n`,
				"BLUEPRINT_STRING_CONTENT.csv": `"SHA","BLUEPRINT_STRING"\n"${helloSha1}","hello"\n"${worldSha1}","world"\n`,
				"BLUEPRINT.csv":
					'"KEY","TITLE","DESCRIPTION_MARKDOWN","IMGUR_IMAGE_ID","BLUEPRINT_STRING_SHA","CREATED_BY_ID","CREATED_ON","LAST_UPDATED_BY_ID","SYSTEM_FROM","SYSTEM_TO"\n' +
					`"a","old","","img","${helloSha1}","alice","5","alice","5","6"\n` +
					`"a","new","","img","${worldSha1}","alice","5","alice","6","253402300799999"\n`,
				"BLUEPRINT_GAME_DATA_ENTITY.csv": `"SHA","POSITION","ENTITY","COUNT"\n"${worldSha1}","0","inserter","3"\n`,
				"BLUEPRINT_STRING_MOD.csv": `"BLUEPRINT_STRING_SHA","MOD_PACK_NAME"\n"${helloSha1}","base"\n`,
				"BLUEPRINT_VOTE_SUMMARY.csv": '"KEY","NUMBER_OF_UPVOTES","SYSTEM_FROM","SYSTEM_TO"\n"a","9","5","6"\n',
			},
		);
		const stringsDirectory = await mkdtemp(join(tmpdir(), "r2-strings-"));
		const database = new DatabaseSync(":memory:");
		await applyMigrations(database, "workers/blueprints/migrations");

		const report = await importCsvDirectory(database, csvDirectory, stringsDirectory);

		expect(
			{
				report,
				strings: rows(
					database,
					"SELECT sha, created_by_id, created_on, blueprint_string FROM blueprint_string ORDER BY created_on",
				),
				blueprints: rows(database, "SELECT title, blueprint_string_sha FROM blueprint ORDER BY system_from"),
				entities: rows(database, "SELECT sha, entity, count FROM blueprint_game_data_entity"),
				mods: rows(database, "SELECT blueprint_string_sha, mod_pack_name FROM blueprint_string_mod"),
				summary: rows(database, "SELECT key, number_of_upvotes FROM blueprint_vote_summary"),
				files: (await readdir(stringsDirectory)).sort(),
				hello: await readFile(join(stringsDirectory, helloSha256), "utf8"),
			},
		).toStrictEqual(
			{
				report:
				{
					"r2:blueprint-strings": 2,
					blueprint: 2,
					blueprint_game_data_entity: 1,
					blueprint_string: 2,
					blueprint_string_mod: 1,
					"blueprint_vote_summary (rebuilt)": 1,
				},
				strings: [
					{
						sha: helloSha256,
						created_by_id: "alice",
						created_on: 5,
						blueprint_string: "",
					},
					{
						sha: worldSha256,
						created_by_id: "bob",
						created_on: 6,
						blueprint_string: "",
					},
				],
				blueprints: [
					{
						title: "old",
						blueprint_string_sha: helloSha256,
					},
					{
						title: "new",
						blueprint_string_sha: worldSha256,
					},
				],
				entities: [
					{
						sha: worldSha256,
						entity: "inserter",
						count: 3,
					},
				],
				mods: [
					{
						blueprint_string_sha: helloSha256,
						mod_pack_name: "base",
					},
				],
				summary: [
					{
						key: "a",
						number_of_upvotes: 0,
					},
				],
				files: [helloSha256, worldSha256].sort(),
				hello: "hello",
			},
		);
		database.close();
	});

	it("stops the import when a row references a string that is not in the export", async () =>
	{
		const csvDirectory = await exportOf(
			{
				"BLUEPRINT_STRING_CONTENT.csv": `"SHA","BLUEPRINT_STRING"\n"${helloSha1}","hello"\n`,
				"BLUEPRINT_STRING_MOD.csv": `"BLUEPRINT_STRING_SHA","MOD_PACK_NAME"\n"${worldSha1}","base"\n`,
			},
		);
		const database = new DatabaseSync(":memory:");
		await applyMigrations(database, "workers/blueprints/migrations");

		await expect(
			importCsvDirectory(database, csvDirectory, await mkdtemp(join(tmpdir(), "r2-strings-"))),
		).rejects.toThrow(
			`BLUEPRINT_STRING_MOD.blueprint_string_sha references ${worldSha1}, which has no blueprint string`,
		);
		database.close();
	});
});
