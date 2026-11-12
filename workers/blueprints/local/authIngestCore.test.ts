// @vitest-environment node
import {DatabaseSync} from "node:sqlite";
import {describe, expect, it} from "vite-plus/test";
import {applyMigrations} from "../../../scripts/importHistory.ts";
import fixtures from "../src/ingest/fixtures/blueprints.json";
import {applyAuthExport} from "./authIngestCore.ts";
import {ingestDump} from "./dumpIngestCore.ts";

const sentinel = 253402300799999;
const dumpTime = Date.UTC(2026, 10, 11, 16);
const exportedAt = Date.UTC(2026, 10, 12, 5);

describe("applyAuthExport", () =>
{
	it("fills the account-only fields of users that still have an account, and marks the rest deleted, dropping their favorites and collection", async () =>
	{
		const database = new DatabaseSync(":memory:");
		await applyMigrations(database, "workers/blueprints/migrations");
		const dump =
		{
			blueprints:
			{
				bp:
				{
					...(fixtures.blueprints[0].blueprint as Record<string, unknown>),
					lastUpdatedDate: dumpTime - 1000,
				},
			},
			users:
			{
				kept:
				{
					displayName: "Kept",
					favorites:
					{
						bp: true,
					},
				},
				complete:
				{
					displayName: "Complete",
					email: "complete@example.com",
					photoURL: "https://example.com/complete.png",
					providerId: "google.com",
				},
				gone:
				{
					displayName: "Gone",
					email: "gone@example.com",
					favorites:
					{
						bp: true,
					},
					collection:
					{
						bp: true,
					},
				},
			},
		};
		await ingestDump(
			{
				database,
				strings:
				{
					put: async () => undefined,
				},
				readDump: async function* ()
				{
					yield JSON.stringify(dump);
				},
				dumpTime,
				blueprintTime: "lastUpdatedDate",
				mode: "repair",
			},
		);

		const report = await applyAuthExport(
			database,
			{
				exportedAt,
				users: [
					{
						uid: "kept",
						email: "kept@example.com",
						photoURL: "https://example.com/kept.png",
						providerIds: ["github.com", "google.com"],
						disabled: false,
					},
					{
						uid: "complete",
						email: "complete@example.com",
						photoURL: "https://example.com/complete.png",
						providerIds: ["google.com"],
						disabled: false,
					},
					{
						uid: "never-had-a-profile",
						email: null,
						photoURL: null,
						providerIds: ["google.com"],
						disabled: false,
					},
				],
			},
			"repair",
		);

		const list = (sql: string): unknown[] =>
			database
				.prepare(sql)
				.all()
				.map((row) => Object.values(row).join(" | "));
		expect(
			{
				report,
				users: list(
					`SELECT user_id, display_name, email, photo_u_r_l, provider_id, system_from FROM firebase_user
					WHERE system_to = ${sentinel} ORDER BY user_id`,
				),
				votes: list("SELECT user_id, system_from, system_to FROM vote ORDER BY user_id"),
				collection: list("SELECT user_id, system_from, system_to FROM blueprint_collection_entry"),
				favorites: list("SELECT key, number_of_upvotes FROM blueprint_vote_summary"),
			},
		).toStrictEqual(
			{
				report:
				{
					users: 3,
					deleted: ["gone"],
					filled: 1,
					unchanged: 1,
				},
				users: [
					`complete | Complete | complete@example.com | https://example.com/complete.png | google.com | ${dumpTime}`,
					`gone | deleted account | deleted account | deleted account |  | ${exportedAt}`,
					`kept | Kept | kept@example.com | https://example.com/kept.png | github.com | ${exportedAt}`,
				],
				votes: [`gone | ${dumpTime} | ${exportedAt}`, `kept | ${dumpTime} | ${sentinel}`],
				collection: [`gone | ${dumpTime} | ${exportedAt}`],
				favorites: ["bp | 1"],
			},
		);
		database.close();
	});
});
