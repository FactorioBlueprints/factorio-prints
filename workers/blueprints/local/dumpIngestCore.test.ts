// @vitest-environment node
import {DatabaseSync} from "node:sqlite";
import {describe, expect, it} from "vite-plus/test";
import {ingestDump} from "./dumpIngestCore.ts";
import {applyMigrations} from "../../../scripts/importHistory.ts";
import {drizzle} from "drizzle-orm/d1";
import {applyEvent} from "../src/ingest/applyEvent.ts";
import type {IngestEvent} from "../src/ingest/events.ts";
import fixtures from "../src/ingest/fixtures/blueprints.json";
import {localD1} from "./localD1.ts";

const sentinel = 253402300799999;
const base = fixtures.blueprints[0].blueprint as Record<string, unknown>;
const backupTime = Date.UTC(2026, 9, 13, 4);
const dumpTime = Date.UTC(2026, 10, 9, 15);
const savedBeforeBackup = backupTime - 3_600_000;
const savedAfterBackup = backupTime + 86_400_000;
const createdAfterBackup = backupTime + 2 * 86_400_000;

const blueprint = (title: string, lastUpdatedDate: number) => (
{
	...base,
	title,
	lastUpdatedDate,
});

/** A dump as the text chunks a file stream would give, cut at awkward places. */
const chunksOf = (dump: unknown) =>
	async function* ()
	{
		const text = JSON.stringify(dump);
		for (let start = 0; start < text.length; start += 997)
		{
			yield text.slice(start, start + 997);
		}
	};

const strings = () =>
{
	const stored = new Map<string, string>();
	return {
		stored,
		put: async (key: string, content: string) =>
		{
			stored.set(key, content);
		},
	};
};

describe("ingestDump", () =>
{
	it("dates a changed or new blueprint by its own lastUpdatedDate, leaves an unchanged one alone even when its date moved, and phases out one the dump lacks", async () =>
	{
		const database = new DatabaseSync(":memory:");
		await applyMigrations(database, "workers/blueprints/migrations");
		// History as an earlier backup left it: every version stamped with the backup instant.
		await ingestDump(
			{
				database,
				strings: strings(),
				readDump: chunksOf(
					{
						blueprints:
						{
							changed: blueprint("Before", savedBeforeBackup),
							bumped: blueprint("Same", savedBeforeBackup),
							old: blueprint("Old", savedBeforeBackup),
							gone: blueprint("Gone", savedBeforeBackup),
						},
						users:
						{
							alice:
							{
								displayName: "Alice",
								email: "alice@example.com",
								photoURL: "https://example.com/alice.png",
								providerId: "google.com",
								favorites:
								{
									old: true,
								},
							},
						},
					},
				),
				dumpTime: backupTime,
				blueprintTime: "dump",
				mode: "repair",
			},
		);
		const newStrings = strings();

		const report = await ingestDump(
			{
				database,
				strings: newStrings,
				readDump: chunksOf(
					{
						blueprints:
						{
							changed: blueprint("After", savedAfterBackup),
							bumped: blueprint("Same", savedAfterBackup),
							old: blueprint("Old", savedBeforeBackup),
							created:
							{
								...blueprint("Created", createdAfterBackup),
								blueprintString: fixtures.blueprints[1].blueprint.blueprintString,
							},
						},
						users:
						{
							// Renamed, and the dump no longer carries the fields only the account record has.
							alice:
							{
								displayName: "Alice B",
								favorites:
								{
									old: true,
									created: true,
								},
							},
							bob:
							{
								displayName: "Bob",
								providerId: "github.com",
							},
						},
					},
				),
				dumpTime,
				blueprintTime: "lastUpdatedDate",
				mode: "repair",
			},
		);

		expect(
			{
				report,
				versions: database
					.prepare("SELECT key, title, system_from, system_to FROM blueprint ORDER BY key, system_from")
					.all()
					.map((row) => (
					{
						...row,
					})),
				votes: database
					.prepare("SELECT user_id, blueprint_key, system_from FROM vote ORDER BY system_from")
					.all()
					.map((row) => (
					{
						...row,
					})),
				users: database
					.prepare(
						`SELECT user_id, display_name, email, photo_u_r_l, provider_id, system_from, system_to
						FROM firebase_user ORDER BY user_id, system_from`,
					)
					.all()
					.map((row) => Object.values(row).join(" | ")),
				watermark: database
					.prepare("SELECT timestamp, system_from, system_to FROM data_import_timestamp ORDER BY system_from")
					.all()
					.map((row) => Object.values(row).join(" | ")),
				newStrings: newStrings.stored.size,
			},
		).toStrictEqual(
			{
				report:
				{
					blueprintsInDump: 4,
					events: 10,
					drifting: 6,
					stale: 1,
					ignored: 0,
					changes: expect.objectContaining(
						{
							"blueprint:inserted": 1,
							"blueprint:updated": 1,
							"blueprint:phased-out": 1,
							"vote:inserted": 1,
							"firebase_user:inserted": 1,
							"firebase_user:updated": 1,
						},
					) as unknown,
				},
				versions: [
					{
						key: "bumped",
						title: "Same",
						system_from: backupTime,
						system_to: sentinel,
					},
					{
						key: "changed",
						title: "Before",
						system_from: backupTime,
						system_to: savedAfterBackup,
					},
					{
						key: "changed",
						title: "After",
						system_from: savedAfterBackup,
						system_to: sentinel,
					},
					{
						key: "created",
						title: "Created",
						system_from: createdAfterBackup,
						system_to: sentinel,
					},
					{
						key: "gone",
						title: "Gone",
						system_from: backupTime,
						system_to: dumpTime,
					},
					{
						key: "old",
						title: "Old",
						system_from: backupTime,
						system_to: sentinel,
					},
				],
				votes: [
					{
						user_id: "alice",
						blueprint_key: "old",
						system_from: backupTime,
					},
					{
						user_id: "alice",
						blueprint_key: "created",
						system_from: dumpTime,
					},
				],
				users: [
					`alice | Alice | alice@example.com | https://example.com/alice.png | google.com | ${backupTime} | ${dumpTime}`,
					`alice | Alice B | alice@example.com | https://example.com/alice.png | google.com | ${dumpTime} | ${sentinel}`,
					`bob | Bob |  |  | github.com | ${dumpTime} | ${sentinel}`,
				],
				watermark: [`${backupTime} | ${backupTime} | ${dumpTime}`, `${dumpTime} | ${dumpTime} | ${sentinel}`],
				newStrings: 1,
			},
		);
		database.close();
	});

	it("overwrites what is older than the dump and leaves alone everything live ingest wrote after it", async () =>
	{
		const database = new DatabaseSync(":memory:");
		await applyMigrations(database, "workers/blueprints/migrations");
		const merge = (dump: unknown, time: number) =>
			ingestDump(
				{
					database,
					strings: strings(),
					readDump: chunksOf(dump),
					dumpTime: time,
					blueprintTime: "lastUpdatedDate",
					mode: "repair",
				},
			);
		await merge(
			{
				blueprints:
				{
					outdated: blueprint("Old", savedBeforeBackup),
					retitledLive: blueprint("Old", savedBeforeBackup),
					deletedBeforeDump: blueprint("Old", savedBeforeBackup),
				},
				users:
				{
					bob:
					{
						displayName: "Bob",
						favorites:
						{
							outdated: true,
						},
					},
				},
			},
			backupTime,
		);
		// Live ingest, after the dump was taken: a retitle, a new blueprint and a favorite.
		const liveTime = dumpTime + 60_000;
		const live = async (event: IngestEvent) =>
			applyEvent(
				{
					db: drizzle(localD1(database) as unknown as D1Database),
					strings: strings() as unknown as R2Bucket,
				},
				event,
			);
		await live(
			{
				type: "blueprint",
				eventTime: liveTime,
				key: "retitledLive",
				blueprint: blueprint("Live", liveTime),
			},
		);
		await live(
			{
				type: "blueprint",
				eventTime: liveTime,
				key: "bornLive",
				blueprint: blueprint("Born live", liveTime),
			},
		);
		await live(
			{
				type: "vote",
				eventTime: liveTime,
				userId: "alice",
				blueprintKey: "outdated",
				favorited: true,
			},
		);

		// The dump shows the world as it was before those events.
		const report = await merge(
			{
				blueprints:
				{
					outdated: blueprint("Dump", savedAfterBackup),
					retitledLive: blueprint("Old", savedBeforeBackup),
				},
				users:
				{
					alice:
					{
						displayName: "Alice",
					},
					bob:
					{
						displayName: "Bob",
					},
				},
			},
			dumpTime,
		);

		const list = (sql: string): unknown[] =>
			database
				.prepare(sql)
				.all()
				.map((row) => Object.values(row).join(" | "));
		expect(
			{
				stale: report.stale > 0,
				current: list(
					`SELECT key, title, system_from FROM blueprint WHERE system_to = ${sentinel} ORDER BY key`,
				),
				ended: list(
					`SELECT key, title, system_to FROM blueprint WHERE system_to <> ${sentinel} ORDER BY key, system_to`,
				),
				votes: list("SELECT user_id, blueprint_key, system_from, system_to FROM vote ORDER BY user_id"),
			},
		).toStrictEqual(
			{
				stale: true,
				current: [
					`bornLive | Born live | ${liveTime}`,
					`outdated | Dump | ${savedAfterBackup}`,
					`retitledLive | Live | ${liveTime}`,
				],
				ended: [
					`deletedBeforeDump | Old | ${dumpTime}`,
					`outdated | Old | ${savedAfterBackup}`,
					`retitledLive | Old | ${liveTime}`,
				],
				votes: [`alice | outdated | ${liveTime} | ${sentinel}`, `bob | outdated | ${backupTime} | ${dumpTime}`],
			},
		);
		database.close();
	});
});
