// @vitest-environment node
import {DatabaseSync} from "node:sqlite";
import {describe, expect, it} from "vite-plus/test";
import {applyMigrations, rebuildVoteSummaryCache} from "../scripts/importHistory";

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
