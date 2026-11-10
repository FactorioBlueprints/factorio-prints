import {env} from "cloudflare:workers";
import type {DrizzleD1Database} from "drizzle-orm/d1";
import {beforeEach, describe, expect, it} from "vite-plus/test";
import {emptyDatabase} from "../../test/database.ts";
import {applyEvent} from "../ingest/applyEvent.ts";
import type {IngestEvent} from "../ingest/events.ts";
import fixtures from "../ingest/fixtures/blueprints.json";
import type {RealtimeBlueprint} from "../ingest/realtime.ts";
import {blueprints, votes} from "../tables.ts";
import {SYSTEM_TO_SENTINEL} from "../temporal/columns.ts";
import {findCurrent, history} from "../temporal/temporal.ts";
import {reconcile} from "./reconcile.ts";

const fixture = fixtures.blueprints[0] as unknown as
{
	key: string;
	blueprint: RealtimeBlueprint;
};
const key = fixture.key;
const t1 = Date.UTC(2026, 10, 9, 12);
const dumpTime = t1 + 3_600_000;

let db: DrizzleD1Database;

beforeEach(async () =>
{
	db = await emptyDatabase();
});

const dependencies = () => (
{
	db,
	strings: env.BLUEPRINT_STRINGS,
});

const blueprintEvent = (eventTime: number, title: string, blueprintKey = key): IngestEvent => (
{
	type: "blueprint",
	eventTime,
	key: blueprintKey,
	blueprint:
	{
		...fixture.blueprint,
		title,
	},
});

const count = async (table: string) =>
	(await env.DB.prepare(`SELECT count(*) AS count FROM ${table}`).first<
	{
		count: number;
	}>())!.count;

describe("reconcile", () =>
{
	it("reports drift in shadow mode without writing anything", async () =>
	{
		await applyEvent(dependencies(), blueprintEvent(t1, "Old"));

		const report = await reconcile(
			dependencies(),
			{
				mode: "shadow",
				events: [blueprintEvent(dumpTime, "New")],
			},
		);

		expect(report.drift).toEqual([
			{
				event:
				{
					type: "blueprint",
					key,
				},
				changes: [
					{
						table: "blueprint",
						key:
						{
							key,
						},
						outcome: "updated",
					},
					{
						table: "blueprint_version",
						key:
						{
							key,
						},
						outcome: "updated",
					},
				],
			},
		]);
		expect(
			(
				await findCurrent(
					db,
					blueprints,
					{
						key,
					},
				)
			)?.title,
		).toEqual("Old");
		expect(
			(
				await history(
					db,
					blueprints,
					{
						key,
					},
				)
			).length,
		).toEqual(1);
	});

	it("repairs drift in repair mode, after which shadow mode finds none", async () =>
	{
		await applyEvent(dependencies(), blueprintEvent(t1, "Old"));

		await reconcile(
			dependencies(),
			{
				mode: "repair",
				events: [blueprintEvent(dumpTime, "New")],
			},
		);

		expect(
			(
				await findCurrent(
					db,
					blueprints,
					{
						key,
					},
				)
			)?.title,
		).toEqual("New");
		expect(
			(
				await reconcile(
					dependencies(),
					{
						mode: "shadow",
						events: [blueprintEvent(dumpTime, "New")],
					},
				)
			).drift,
		).toEqual([]);
	});

	it("does not count rows live ingest changed after the dump as drift", async () =>
	{
		await applyEvent(dependencies(), blueprintEvent(dumpTime + 1, "Newer than the dump"));

		const report = await reconcile(
			dependencies(),
			{
				mode: "shadow",
				events: [blueprintEvent(dumpTime, "Dumped")],
			},
		);

		expect(report).toEqual(
			{
				drift: [],
				stale: 1,
				ignored: 0,
			},
		);
	});

	it("writes no string or row for a new blueprint in shadow mode", async () =>
	{
		const report = await reconcile(
			dependencies(),
			{
				mode: "shadow",
				events: [blueprintEvent(dumpTime, "New", "fresh")],
			},
		);

		expect(report.drift.map((entry) => entry.event)).toEqual([
			{
				type: "blueprint",
				key: "fresh",
			},
		]);
		expect(await count("blueprint")).toEqual(0);
		expect(await count("blueprint_string")).toEqual(0);
	});

	it("phases out current blueprints missing from the dump", async () =>
	{
		await applyEvent(dependencies(), blueprintEvent(t1, "Kept"));
		await applyEvent(dependencies(), blueprintEvent(t1, "Gone", "gone"));

		const shadow = await reconcile(
			dependencies(),
			{
				mode: "shadow",
				events: [],
				expectedBlueprintKeys: [key],
				dumpTime,
			},
		);
		expect(shadow.drift.map((entry) => entry.event)).toEqual([
			{
				type: "blueprint",
				key: "gone",
			},
		]);

		await reconcile(
			dependencies(),
			{
				mode: "repair",
				events: [],
				expectedBlueprintKeys: [key],
				dumpTime,
			},
		);
		expect(
			await findCurrent(
				db,
				blueprints,
				{
					key: "gone",
				},
			),
		).toBeUndefined();
		expect(
			await findCurrent(
				db,
				blueprints,
				{
					key,
				},
			),
		).not.toBeUndefined();
	});

	it("merges a user's whole favorites list, so votes missing from the dump are phased out", async () =>
	{
		await applyEvent(dependencies(), blueprintEvent(t1, "A", "a"));
		await applyEvent(dependencies(), blueprintEvent(t1, "B", "b"));
		await applyEvent(
			dependencies(),
			{
				type: "vote",
				eventTime: t1,
				userId: "alice",
				blueprintKey: "a",
				favorited: true,
			},
		);

		await reconcile(
			dependencies(),
			{
				mode: "repair",
				events: [
					{
						type: "favoriteList",
						eventTime: dumpTime,
						userId: "alice",
						favorites:
						{
							b: true,
							missing: true,
						},
					},
				],
			},
		);

		const current = (
			await history(
				db,
				votes,
				{
					userId: "alice",
				},
			)
		)
			.filter((row) => row.systemTo === SYSTEM_TO_SENTINEL)
			.map((row) => row.blueprintKey);
		expect(current).toEqual(["b"]);
	});
});
