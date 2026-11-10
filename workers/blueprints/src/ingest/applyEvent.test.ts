import {env} from "cloudflare:workers";
import type {DrizzleD1Database} from "drizzle-orm/d1";
import {beforeEach, describe, expect, it} from "vite-plus/test";
import {emptyDatabase} from "../../test/database.ts";
import {getBlueprintString} from "../strings.ts";
import
{
	blueprintCollectionEntries,
	blueprintPrivateDatas,
	blueprints,
	blueprintTags,
	blueprintVersions,
	commentVersions,
	comments,
	imgurImages,
	tags,
	userEntitlements,
	votes,
} from "../tables.ts";
import {SYSTEM_TO_SENTINEL} from "../temporal/columns.ts";
import {findCurrent, history} from "../temporal/temporal.ts";
import {applyEvent} from "./applyEvent.ts";
import type {IngestEvent} from "./events.ts";
import fixtures from "./fixtures/blueprints.json";
import type {RealtimeBlueprint, RealtimeBlueprintPrivate} from "./realtime.ts";

const fixture = fixtures.blueprints[0] as unknown as
{
	key: string;
	blueprint: RealtimeBlueprint;
	blueprintPrivate?: RealtimeBlueprintPrivate;
	expected:
	{
		blueprint: Record<string, unknown>;
		blueprintTags: Record<string, unknown>[];
		blueprintPrivateData: Record<string, unknown>;
		imgurImage: Record<string, unknown>;
	};
};
const key = fixture.key;
const author = fixture.expected.blueprint.createdById as string;
const sha = fixture.expected.blueprint.blueprintStringSha as string;

const t1 = Date.UTC(2026, 10, 9, 12, 0, 0, 0);
const t2 = t1 + 60_000;
const t3 = t1 + 120_000;

let db: DrizzleD1Database;

beforeEach(async () =>
{
	db = await emptyDatabase();
});

const apply = (event: IngestEvent) =>
	applyEvent(
		{
			db,
			strings: env.BLUEPRINT_STRINGS,
		},
		event,
	);

const saveBlueprint = (eventTime: number, overrides: Partial<RealtimeBlueprint> = {}) =>
	apply(
		{
			type: "blueprint",
			eventTime,
			key,
			blueprint:
			{
				...fixture.blueprint,
				...overrides,
			},
			blueprintPrivate: fixture.blueprintPrivate,
		},
	);

const withoutSystem = <T extends Record<string, unknown>>(row: T | undefined) =>
{
	if (row === undefined) return undefined;
	const {systemFrom: _from, systemTo: _to, systemFromText: _fromText, systemToText: _toText, ...rest} = row;
	return rest;
};

const currentTags = async () =>
	(
		await history(
			db,
			blueprintTags,
			{
				blueprintKey: key,
			},
		)
	)
		.filter((row) => row.systemTo === SYSTEM_TO_SENTINEL)
		.map((row) => `${row.tagCategory}/${row.tagName}`)
		.sort();

const count = async (table: string) =>
	(await env.DB.prepare(`SELECT count(*) AS count FROM ${table}`).first<
	{
		count: number;
	}>())!.count;

describe("blueprint events", () =>
{
	it("phase in the whole composite at the event time, with the string in R2 and its game data in D1", async () =>
	{
		expect((await saveBlueprint(t1)).status).toEqual("applied");

		const blueprint = await findCurrent(
			db,
			blueprints,
			{
				key,
			},
		);
		expect(withoutSystem(blueprint)).toEqual(
			{
				...fixture.expected.blueprint,
				createdOnText: blueprint?.createdOnText,
			},
		);
		expect(blueprint?.systemFrom).toEqual(t1);
		expect(
			withoutSystem(
				await findCurrent(
					db,
					blueprintPrivateDatas,
					{
						key,
					},
				),
			),
		).toEqual(fixture.expected.blueprintPrivateData);
		expect(
			withoutSystem(
				await findCurrent(
					db,
					imgurImages,
					{
						imgurId: "Kq7amGs",
					},
				),
			),
		).toEqual(fixture.expected.imgurImage);
		expect(await currentTags()).toEqual(["general/tileable", "mods/vanilla", "version/0,15", "version/2,0"]);
		expect(
			(
				await findCurrent(
					db,
					blueprintVersions,
					{
						key,
					},
				)
			)?.number,
		).toEqual(1);

		expect(await getBlueprintString(env.BLUEPRINT_STRINGS, sha)).toEqual(fixture.blueprint.blueprintString);
		expect(
			await env.DB.prepare("SELECT sha, created_by_id, created_on, blueprint_string FROM blueprint_string").all(),
		).toMatchObject(
			{
				results: [
					{
						sha,
						created_by_id: author,
						created_on: t1,
						blueprint_string: "",
					},
				],
			},
		);
		expect(await count("blueprint_game_data")).toBeGreaterThan(0);
		expect(await count("blueprint_game_data_entity")).toBeGreaterThan(0);
		expect(await env.DB.prepare("SELECT key, number_of_upvotes FROM blueprint_vote_summary").all()).toMatchObject(
			{
				results: [
					{
						key,
						number_of_upvotes: 0,
					},
				],
			},
		);
	});

	it("change nothing when the same event is replayed", async () =>
	{
		await saveBlueprint(t1);
		const replay = await saveBlueprint(t1);

		expect(replay.status).toEqual("applied");
		expect(replay.changes.every((change) => change.outcome === "unchanged")).toEqual(true);
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
		expect(
			(
				await history(
					db,
					blueprintVersions,
					{
						key,
					},
				)
			).length,
		).toEqual(1);
	});

	it("make exactly one new version for one later save", async () =>
	{
		await saveBlueprint(t1);
		await saveBlueprint(
			t2,
			{
				title: "Renamed",
			},
		);

		expect(
			(
				await history(
					db,
					blueprints,
					{
						key,
					},
				)
			).map((row) => [row.title, row.systemFrom, row.systemTo]),
		).toEqual([
			["PU Shuffle", t1, t2],
			["Renamed", t2, SYSTEM_TO_SENTINEL],
		]);
		expect(
			(
				await history(
					db,
					blueprintVersions,
					{
						key,
					},
				)
			).map((row) => row.number),
		).toEqual([1, 2]);
		expect(
			(
				await history(
					db,
					blueprintTags,
					{
						blueprintKey: key,
					},
				)
			).length,
		).toEqual(4);
	});

	it("skip an event older than the stored blueprint", async () =>
	{
		await saveBlueprint(
			t2,
			{
				title: "Newer",
			},
		);

		expect(
			(
				await saveBlueprint(
					t1,
					{
						title: "Older",
					},
				)
			).status,
		).toEqual("skipped-stale");
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
		).toEqual("Newer");
		expect(
			(
				await history(
					db,
					blueprintVersions,
					{
						key,
					},
				)
			).length,
		).toEqual(1);
	});

	it("phase out the composite and its cached vote count when the blueprint is deleted", async () =>
	{
		await saveBlueprint(t1);

		expect(
			(
				await apply(
					{
						type: "blueprint",
						eventTime: t2,
						key,
						blueprint: null,
					},
				)
			).status,
		).toEqual("applied");

		expect(
			await findCurrent(
				db,
				blueprints,
				{
					key,
				},
			),
		).toBeUndefined();
		expect(
			await findCurrent(
				db,
				blueprintPrivateDatas,
				{
					key,
				},
			),
		).toBeUndefined();
		expect(
			await findCurrent(
				db,
				blueprintVersions,
				{
					key,
				},
			),
		).toBeUndefined();
		expect(await currentTags()).toEqual([]);
		expect(await count("blueprint_vote_summary")).toEqual(0);
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

	it("ignore a blueprint without a string, as the converter does", async () =>
	{
		expect(
			await saveBlueprint(
				t1,
				{
					blueprintString: null,
				},
			),
		).toEqual(
			{
				status: "ignored",
				reason: "blueprint has no string",
				changes: [],
			},
		);
		expect(await count("blueprint")).toEqual(0);
	});

	it("reuse a stored string without parsing it again", async () =>
	{
		await saveBlueprint(t1);
		const gameDataRows = await count("blueprint_game_data");

		await apply(
			{
				type: "blueprint",
				eventTime: t2,
				key: "another",
				blueprint: fixture.blueprint,
			},
		);

		expect(await count("blueprint_string")).toEqual(1);
		expect(await count("blueprint_game_data")).toEqual(gameDataRows);
		expect(
			(
				await findCurrent(
					db,
					blueprints,
					{
						key: "another",
					},
				)
			)?.blueprintStringSha,
		).toEqual(sha);
	});
});

describe("vote and collection events", () =>
{
	beforeEach(async () =>
	{
		await saveBlueprint(t1);
	});

	const vote = (eventTime: number, userId: string, favorited: boolean, blueprintKey = key) =>
		apply(
			{
				type: "vote",
				eventTime,
				userId,
				blueprintKey,
				favorited,
			},
		);

	it("phase a favorite in as an up vote and out again", async () =>
	{
		await vote(t2, "alice", true);
		expect(
			withoutSystem(
				await findCurrent(
					db,
					votes,
					{
						userId: "alice",
						blueprintKey: key,
					},
				),
			),
		).toEqual(
			{
				userId: "alice",
				blueprintKey: key,
				direction: "up",
			},
		);

		await vote(t3, "alice", false);
		expect(
			await findCurrent(
				db,
				votes,
				{
					userId: "alice",
					blueprintKey: key,
				},
			),
		).toBeUndefined();
		expect(
			(
				await history(
					db,
					votes,
					{
						userId: "alice",
						blueprintKey: key,
					},
				)
			).length,
		).toEqual(1);
	});

	it("ignore favorites of one's own blueprint and of missing blueprints", async () =>
	{
		expect((await vote(t2, author, true)).status).toEqual("ignored");
		expect((await vote(t2, "alice", true, "missing")).status).toEqual("ignored");
		expect(await count("vote")).toEqual(0);
	});

	it("change nothing when a favorite is replayed", async () =>
	{
		await vote(t2, "alice", true);
		const replay = await vote(t2, "alice", true);

		expect(replay.changes.map((change) => change.outcome)).toEqual(["unchanged"]);
		expect(
			(
				await history(
					db,
					votes,
					{
						userId: "alice",
						blueprintKey: key,
					},
				)
			).length,
		).toEqual(1);
	});

	it("skip an unfavorite older than the favorite", async () =>
	{
		await vote(t3, "alice", true);

		expect((await vote(t2, "alice", false)).status).toEqual("skipped-stale");
		expect(
			await findCurrent(
				db,
				votes,
				{
					userId: "alice",
					blueprintKey: key,
				},
			),
		).not.toBeUndefined();
	});

	it("phase collection entries in and out", async () =>
	{
		const collect = (eventTime: number, collected: boolean) =>
			apply(
				{
					type: "collection",
					eventTime,
					userId: "alice",
					blueprintKey: key,
					collected,
				},
			);

		await collect(t2, true);
		expect(
			await findCurrent(
				db,
				blueprintCollectionEntries,
				{
					userId: "alice",
					blueprintKey: key,
				},
			),
		).not.toBeUndefined();

		await collect(t3, false);
		expect(
			await findCurrent(
				db,
				blueprintCollectionEntries,
				{
					userId: "alice",
					blueprintKey: key,
				},
			),
		).toBeUndefined();
	});
});

describe("comment events", () =>
{
	it("phase a comment and its version in, and out when it is removed", async () =>
	{
		await saveBlueprint(t1);
		const comment = (eventTime: number, content: string | null) =>
			apply(
				{
					type: "comment",
					eventTime,
					blueprintKey: key,
					commentId: "c1",
					comment:
						content === null
							? null
							:
								{
									content,
									createdAt: t1,
									authorId: "alice",
								},
				},
			);

		await comment(t2, "Nice");
		expect(
			withoutSystem(
				await findCurrent(
					db,
					comments,
					{
						id: "c1",
					},
				),
			),
		).toMatchObject(
			{
				id: "c1",
				blueprintKey: key,
				text: "Nice",
				createdById: "alice",
				deleted: false,
			},
		);
		expect(
			(
				await findCurrent(
					db,
					commentVersions,
					{
						id: "c1",
					},
				)
			)?.number,
		).toEqual(1);

		await comment(t3, "Nicer");
		expect(
			(
				await findCurrent(
					db,
					commentVersions,
					{
						id: "c1",
					},
				)
			)?.number,
		).toEqual(2);

		await comment(t3 + 1, null);
		expect(
			await findCurrent(
				db,
				comments,
				{
					id: "c1",
				},
			),
		).toBeUndefined();
		expect(
			await findCurrent(
				db,
				commentVersions,
				{
					id: "c1",
				},
			),
		).toBeUndefined();
	});
});

describe("moderator and tag list events", () =>
{
	it("merge /moderators into administrator entitlements", async () =>
	{
		const moderators = (eventTime: number, value: Record<string, boolean>) =>
			apply(
				{
					type: "moderators",
					eventTime,
					moderators: value,
				},
			);

		await moderators(
			t1,
			{
				alice: true,
				bob: true,
			},
		);
		await moderators(
			t2,
			{
				alice: true,
				carol: true,
				dave: false,
			},
		);

		const current = (
			await history(
				db,
				userEntitlements,
				{
					userRole: "administrator",
				},
			)
		)
			.filter((row) => row.systemTo === SYSTEM_TO_SENTINEL)
			.map((row) => row.userId);
		expect(current).toEqual(["alice", "carol"]);
	});

	it("merge /byTag into tags, keeping existing ordinals", async () =>
	{
		const tagList = (eventTime: number, byTag: Record<string, Record<string, unknown>>) =>
			apply(
				{
					type: "tags",
					eventTime,
					byTag,
				},
			);

		await tagList(
			t1,
			{
				belt:
				{
					balancer: {},
					tap: {},
				},
			},
		);
		await tagList(
			t2,
			{
				belt:
				{
					tap: {},
					prioritizer: {},
				},
			},
		);

		const current = (
			await history(
				db,
				tags,
				{
					category: "belt",
				},
			)
		)
			.filter((row) => row.systemTo === SYSTEM_TO_SENTINEL)
			.map((row) => [row.name, row.ordinal]);
		expect(current).toEqual([
			["prioritizer", 3],
			["tap", 2],
		]);
	});
});
