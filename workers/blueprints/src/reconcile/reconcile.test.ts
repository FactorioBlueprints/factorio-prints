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

const watermarks = async () =>
	(
		await env.DB.prepare(
			"SELECT name, timestamp, system_from FROM data_import_timestamp WHERE system_to = 253402300799999",
		).all()
	).results;

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
				amended: 0,
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
		expect(await watermarks()).toEqual([]);

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
		// Closing a dump in repair mode records its instant as the import watermark, and an older dump cannot move it back.
		await reconcile(
			dependencies(),
			{
				mode: "repair",
				events: [],
				expectedBlueprintKeys: [key],
				dumpTime: dumpTime - 1000,
			},
		);
		expect(await watermarks()).toEqual([
			{
				name: "firebase",
				timestamp: dumpTime,
				system_from: dumpTime,
			},
		]);
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

	it("corrects a wrong created date or author in place when asked, without a new version or a new system time", async () =>
	{
		await applyEvent(dependencies(), blueprintEvent(t1, "Same"));
		const corrected: IngestEvent =
		{
			type: "blueprint",
			eventTime: t1,
			key,
			blueprint:
			{
				...fixture.blueprint,
				title: "Same",
				createdDate: 1_600_000_000_000,
				authorId: "the-real-author",
				author:
				{
					userId: "the-real-author",
				},
			},
		};
		const audit = async () =>
			(
				await env.DB.prepare(
					`SELECT 'blueprint' AS source, created_by_id, created_on, last_updated_by_id, system_from, system_to
					FROM blueprint UNION ALL
					SELECT 'version ' || number, created_by_id, created_on, last_updated_by_id, system_from, system_to
					FROM blueprint_version ORDER BY 1`,
				).all()
			).results.map((row) => Object.values(row).join(" | "));
		const before = await audit();

		// Without the option the correction cannot be made: it is not newer than the version it would replace.
		const plain = await reconcile(
			dependencies(),
			{
				mode: "repair",
				events: [corrected],
			},
		);
		const afterPlain = await audit();
		const shadow = await reconcile(
			dependencies(),
			{
				mode: "shadow",
				events: [corrected],
				amendAudit: true,
			},
		);
		const afterShadow = await audit();
		const amended = await reconcile(
			dependencies(),
			{
				mode: "repair",
				events: [corrected],
				amendAudit: true,
			},
		);
		const again = await reconcile(
			dependencies(),
			{
				mode: "repair",
				events: [corrected],
				amendAudit: true,
			},
		);

		expect(
			{
				untouched: [afterPlain, afterShadow],
				counts: [plain.amended, shadow.amended, amended.amended, again.amended],
				driftAfter: again.drift,
				rows: await audit(),
			},
		).toEqual(
			{
				untouched: [before, before],
				counts: [0, 1, 1, 0],
				driftAfter: [],
				rows: [
					`blueprint | the-real-author | 1600000000000 | the-real-author | ${t1} | ${SYSTEM_TO_SENTINEL}`,
					`version 1 | the-real-author | 1600000000000 | the-real-author | ${t1} | ${SYSTEM_TO_SENTINEL}`,
				],
			},
		);
	});

	it("does not correct in place when anything else about the blueprint differs, or when the stored version is newer", async () =>
	{
		await applyEvent(dependencies(), blueprintEvent(t1, "Stored"));
		const event = (eventTime: number, title: string): IngestEvent => (
		{
			type: "blueprint",
			eventTime,
			key,
			blueprint:
			{
				...fixture.blueprint,
				title,
				createdDate: 1_600_000_000_000,
			},
		});

		const report = await reconcile(
			dependencies(),
			{
				mode: "repair",
				events: [event(t1 - 1000, "Stored"), event(dumpTime, "Retitled")],
				amendAudit: true,
			},
		);

		expect(
			{
				amended: report.amended,
				versions: (
					await history(
						db,
						blueprints,
						{
							key,
						},
					)
				).map((row) => [row.title, row.createdOn, row.systemFrom]),
			},
		).toEqual(
			{
				amended: 0,
				versions: [
					["Stored", fixture.blueprint.createdDate, t1],
					["Retitled", 1_600_000_000_000, dumpTime],
				],
			},
		);
	});

	it("brings an image's details from the dump in at the dump instant, even when the blueprint itself is older than the stored image row, but not over a newer row", async () =>
	{
		const withHash = (eventTime: number, deletehash: string, blueprintKey = key): IngestEvent => (
		{
			type: "blueprint",
			eventTime,
			key: blueprintKey,
			blueprint:
			{
				...fixture.blueprint,
				title: "Same",
				image:
				{
					...fixture.blueprint.image!,
					deletehash,
				},
			},
		});
		const images = async () =>
			(
				await env.DB.prepare(
					"SELECT delete_hash, system_from, system_to FROM imgur_image ORDER BY system_from",
				).all()
			).results.map((row) => Object.values(row).join(" | "));
		// History: the blueprint was saved before t1, and the image row, stamped t1, lost its delete hash.
		await applyEvent(dependencies(), blueprintEvent(t1, "Same"));
		const before = await images();

		const shadow = await reconcile(
			dependencies(),
			{
				mode: "shadow",
				events: [withHash(t1 - 1000, "from-dump")],
				dumpTime,
			},
		);
		const afterShadow = await images();
		await reconcile(
			dependencies(),
			{
				mode: "repair",
				events: [withHash(t1 - 1000, "from-dump")],
				dumpTime,
			},
		);
		const repaired = await images();
		// A live save after the dump changes the image again; an older dump must not undo it.
		await applyEvent(dependencies(), withHash(dumpTime + 1000, "live"));
		await reconcile(
			dependencies(),
			{
				mode: "repair",
				events: [withHash(t1 - 1000, "from-dump")],
				dumpTime,
			},
		);

		expect(
			{
				before,
				shadowDrift: shadow.drift.map((entry) =>
					entry.changes.map((change) => `${change.table}:${change.outcome}`),
				),
				afterShadow,
				repaired,
				afterLive: await images(),
			},
		).toEqual(
			{
				before: [` | ${t1} | ${SYSTEM_TO_SENTINEL}`],
				shadowDrift: [["imgur_image:updated"]],
				afterShadow: before,
				repaired: [` | ${t1} | ${dumpTime}`, `from-dump | ${dumpTime} | ${SYSTEM_TO_SENTINEL}`],
				afterLive: [
					` | ${t1} | ${dumpTime}`,
					`from-dump | ${dumpTime} | ${dumpTime + 1000}`,
					`live | ${dumpTime + 1000} | ${SYSTEM_TO_SENTINEL}`,
				],
			},
		);
	});

	it("corrects the tags of a version in place when the dump shows the same version with other tags", async () =>
	{
		const tagged = (eventTime: number, title: string, tags: string[]): IngestEvent => (
		{
			type: "blueprint",
			eventTime,
			key,
			blueprint:
			{
				...fixture.blueprint,
				title,
				tags,
			},
		});
		const t2 = t1 + 60_000;
		const tagRows = async () =>
			(
				await env.DB.prepare(
					"SELECT tag_name, system_from, system_to FROM blueprint_tag ORDER BY tag_name, system_from",
				).all()
			).results.map((row) => Object.values(row).join(" | "));
		await applyEvent(dependencies(), tagged(t1, "First", ["/general/kept/", "/general/older/"]));
		await applyEvent(
			dependencies(),
			tagged(t2, "Second", ["/general/kept/", "/general/older/", "/general/wrong/"]),
		);

		// The dump shows the second version, saved at the same instant, without two of those tags and with another.
		const report = await reconcile(
			dependencies(),
			{
				mode: "repair",
				events: [tagged(t2, "Second", ["/general/kept/", "/general/added/"])],
				amendAudit: true,
			},
		);
		const again = await reconcile(
			dependencies(),
			{
				mode: "repair",
				events: [tagged(t2, "Second", ["/general/kept/", "/general/added/"])],
				amendAudit: true,
			},
		);

		expect(
			{
				amended: [report.amended, again.amended],
				driftAfter: again.drift,
				tags: await tagRows(),
				versions: (
					await history(
						db,
						blueprints,
						{
							key,
						},
					)
				).length,
			},
		).toEqual(
			{
				amended: [1, 0],
				driftAfter: [],
				tags: [
					`added | ${t2} | ${SYSTEM_TO_SENTINEL}`,
					`kept | ${t1} | ${SYSTEM_TO_SENTINEL}`,
					// It began with the first version, so it ends where the second begins.
					`older | ${t1} | ${t2}`,
					// "wrong" began with the second version and was never part of it: no row remains.
				],
				versions: 2,
			},
		);
	});
});
