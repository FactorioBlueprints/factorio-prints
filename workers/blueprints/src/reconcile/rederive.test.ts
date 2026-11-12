import {env} from "cloudflare:workers";
import type {DrizzleD1Database} from "drizzle-orm/d1";
import {beforeEach, describe, expect, it} from "vite-plus/test";
import {emptyDatabase} from "../../test/database.ts";
import {applyEvent} from "../ingest/applyEvent.ts";
import fixtures from "../ingest/fixtures/blueprints.json";
import type {RealtimeBlueprint} from "../ingest/realtime.ts";
import {rederiveGameData} from "./rederive.ts";

const first = fixtures.blueprints[0] as unknown as
{
	key: string;
	blueprint: RealtimeBlueprint;
	expected:
	{
		blueprint:
		{
			blueprintStringSha: string;
		};
	};
};
const second = fixtures.blueprints[1] as unknown as typeof first;
const firstSha = first.expected.blueprint.blueprintStringSha;
const secondSha = second.expected.blueprint.blueprintStringSha;
const [lowSha, highSha] = [firstSha, secondSha].sort();
const t1 = Date.UTC(2026, 10, 9, 12);

let db: DrizzleD1Database;

const dependencies = () => (
{
	db,
	strings: env.BLUEPRINT_STRINGS,
});

const stored = async (): Promise<string[]> =>
	(
		await env.DB.prepare(
			`SELECT 'data ' || sha || ' ' || position || ' ' || coalesce(label, '') AS line FROM blueprint_game_data
			UNION ALL SELECT 'icon ' || sha || ' ' || position || ' ' || "index" || ' ' || signal_name || ' ' || signal_type
				FROM blueprint_game_data_icon
			UNION ALL SELECT 'recipe ' || sha || ' ' || position || ' ' || recipe || ' ' || count FROM blueprint_game_data_recipe
			UNION ALL SELECT 'entity ' || sha || ' ' || position || ' ' || entity || ' ' || count FROM blueprint_game_data_entity
			UNION ALL SELECT 'mod ' || blueprint_string_sha || ' ' || mod_pack_name FROM blueprint_string_mod
			ORDER BY 1`,
		).all<
		{
			line: string;
		}>()
	).results.map((row) => row.line);

beforeEach(async () =>
{
	db = await emptyDatabase();
	for (const fixture of [first, second])
	{
		await applyEvent(
			dependencies(),
			{
				type: "blueprint",
				eventTime: t1,
				key: fixture.key,
				blueprint: fixture.blueprint,
			},
		);
	}
});

describe("rederiveGameData", () =>
{
	it("replaces the stored game data of a string where it differs from what the parser derives today, table by table, and then finds nothing left to change", async () =>
	{
		const correct = await stored();
		// What an older parser might have left behind: a wrong icon type, a missing entity row and a stray recipe.
		await env.DB.batch([
			env.DB.prepare("UPDATE blueprint_game_data_icon SET signal_type = 'virtual' WHERE sha = ?").bind(lowSha),
			env.DB.prepare(
				`DELETE FROM blueprint_game_data_entity WHERE rowid IN
					(SELECT rowid FROM blueprint_game_data_entity WHERE sha = ? LIMIT 1)`,
			).bind(lowSha),
			env.DB.prepare(
				"INSERT INTO blueprint_game_data_recipe (sha, position, recipe, count) VALUES (?, '1', 'stray', 9)",
			).bind(lowSha),
		]);
		const broken = await stored();

		const shadow = await rederiveGameData(
			dependencies(),
			{
				after: "",
				limit: 10,
				dryRun: true,
			},
		);
		const afterShadow = await stored();
		const repaired = await rederiveGameData(
			dependencies(),
			{
				after: "",
				limit: 10,
				dryRun: false,
			},
		);
		const afterRepair = await stored();
		const again = await rederiveGameData(
			dependencies(),
			{
				after: "",
				limit: 10,
				dryRun: false,
			},
		);

		expect(
			{
				wasBroken: broken.join("\n") !== correct.join("\n"),
				shadowWroteNothing: afterShadow.join("\n") === broken.join("\n"),
				shadow,
				repaired,
				restored: afterRepair.join("\n") === correct.join("\n"),
				again,
			},
		).toEqual(
			{
				wasBroken: true,
				shadowWroteNothing: true,
				shadow: repaired,
				repaired:
				{
					checked: 2,
					next: null,
					missing: [],
					changed: [
						{
							sha: lowSha,
							tables: [
								"blueprint_game_data_entity",
								"blueprint_game_data_icon",
								"blueprint_game_data_recipe",
							],
						},
					],
				},
				restored: true,
				again:
				{
					checked: 2,
					next: null,
					missing: [],
					changed: [],
				},
			},
		);
	});

	it("walks the strings a page at a time in sha order, and names a string whose content is not in the bucket", async () =>
	{
		await env.BLUEPRINT_STRINGS.delete(`strings/${highSha}`);

		const firstPage = await rederiveGameData(
			dependencies(),
			{
				after: "",
				limit: 1,
				dryRun: false,
			},
		);
		const secondPage = await rederiveGameData(
			dependencies(),
			{
				after: firstPage.next ?? "",
				limit: 1,
				dryRun: false,
			},
		);
		const end = await rederiveGameData(
			dependencies(),
			{
				after: secondPage.next ?? "",
				limit: 1,
				dryRun: false,
			},
		);

		expect([firstPage, secondPage, end]).toEqual([
			{
				checked: 1,
				next: lowSha,
				missing: [],
				changed: [],
			},
			{
				checked: 1,
				next: highSha,
				missing: [highSha],
				changed: [],
			},
			{
				checked: 0,
				next: null,
				missing: [],
				changed: [],
			},
		]);
	});
});
