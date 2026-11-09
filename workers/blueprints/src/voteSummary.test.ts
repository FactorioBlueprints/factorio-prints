import {env} from "cloudflare:workers";
import type {DrizzleD1Database} from "drizzle-orm/d1";
import {beforeEach, describe, expect, it} from "vite-plus/test";
import {emptyDatabase} from "../test/database.ts";
import {SYSTEM_TO_SENTINEL} from "./temporal/columns.ts";
import {commit, createUnitOfWork, mergeList, phaseOut, upsert} from "./temporal/temporal.ts";
import {blueprints, rebuildVoteSummary, votes} from "./voteSummary.ts";

const t0 = Date.UTC(2026, 10, 9, 11, 0, 0, 0);
const t1 = Date.UTC(2026, 10, 9, 12, 0, 0, 0);
const t2 = t1 + 1_000;
const t3 = t1 + 2_000;

let db: DrizzleD1Database;

beforeEach(async () =>
{
	db = await emptyDatabase();
});

const summaries = async () =>
	(await env.DB.prepare("SELECT key, number_of_upvotes FROM blueprint_vote_summary ORDER BY key").all()).results;

const vote = async (now: number, userId: string, blueprintKey: string, direction: "up" | "down") =>
{
	const unitOfWork = createUnitOfWork(db, now);
	await upsert(
		unitOfWork,
		votes,
		{
			userId,
			blueprintKey,
			direction,
		},
	);
	return commit(unitOfWork);
};

const blueprintValues = (key: string, title = "title") => (
{
	key,
	imgurImageId: "img",
	blueprintStringSha: "sha",
	createdById: "user",
	createdOn: t0,
	lastUpdatedById: "user",
	title,
	descriptionMarkdown: "",
});

const publish = async (now: number, key: string, title = "title") =>
{
	const unitOfWork = createUnitOfWork(db, now);
	await upsert(unitOfWork, blueprints, blueprintValues(key, title));
	return commit(unitOfWork);
};

const unpublish = async (now: number, key: string) =>
{
	const unitOfWork = createUnitOfWork(db, now);
	await phaseOut(
		unitOfWork,
		blueprints,
		{
			key,
		},
	);
	return commit(unitOfWork);
};

const unvote = async (now: number, userId: string, blueprintKey: string) =>
{
	const unitOfWork = createUnitOfWork(db, now);
	await phaseOut(
		unitOfWork,
		votes,
		{
			userId,
			blueprintKey,
		},
	);
	return commit(unitOfWork);
};

describe("vote summary maintenance", () =>
{
	beforeEach(async () =>
	{
		await publish(t0, "a");
	});

	it("counts an up vote phased in", async () =>
	{
		await vote(t1, "alice", "a", "up");
		await vote(t1, "bob", "a", "up");

		expect(await summaries()).toEqual([
			{
				key: "a",
				number_of_upvotes: 2,
			},
		]);
	});

	it("uncounts an up vote phased out", async () =>
	{
		await vote(t1, "alice", "a", "up");
		await vote(t1, "bob", "a", "up");
		await unvote(t2, "alice", "a");

		expect(await summaries()).toEqual([
			{
				key: "a",
				number_of_upvotes: 1,
			},
		]);
	});

	it("follows a vote that changes direction, and ignores down votes", async () =>
	{
		await vote(t1, "alice", "a", "up");
		await vote(t1, "bob", "a", "down");
		await vote(t2, "alice", "a", "down");

		expect(await summaries()).toEqual([
			{
				key: "a",
				number_of_upvotes: 0,
			},
		]);

		await vote(t3, "bob", "a", "up");

		expect(await summaries()).toEqual([
			{
				key: "a",
				number_of_upvotes: 1,
			},
		]);
	});

	it("leaves the count alone for an unchanged vote", async () =>
	{
		await vote(t1, "alice", "a", "up");
		await vote(t2, "alice", "a", "up");

		expect(await summaries()).toEqual([
			{
				key: "a",
				number_of_upvotes: 1,
			},
		]);
	});

	it("adjusts every blueprint touched by a merged list of one user's votes", async () =>
	{
		await publish(t0, "b");
		await publish(t0, "c");
		await vote(t1, "alice", "a", "up");
		await vote(t1, "alice", "b", "up");

		const unitOfWork = createUnitOfWork(db, t2);
		await mergeList(
			unitOfWork,
			votes,
			{
				userId: "alice",
			},
			[
				{
					userId: "alice",
					blueprintKey: "b",
					direction: "up",
				},
				{
					userId: "alice",
					blueprintKey: "c",
					direction: "up",
				},
			],
		);
		await commit(unitOfWork);

		expect(await summaries()).toEqual([
			{
				key: "a",
				number_of_upvotes: 0,
			},
			{
				key: "b",
				number_of_upvotes: 1,
			},
			{
				key: "c",
				number_of_upvotes: 1,
			},
		]);
	});

	it("rolls the count back with the vote when the unit of work conflicts", async () =>
	{
		await vote(t1, "alice", "a", "up");

		const slow = createUnitOfWork(db, t3);
		await phaseOut(
			slow,
			votes,
			{
				userId: "alice",
				blueprintKey: "a",
			},
		);

		await vote(t2, "alice", "a", "down");

		expect((await commit(slow)).status).toEqual("conflict");
		expect(await summaries()).toEqual([
			{
				key: "a",
				number_of_upvotes: 0,
			},
		]);
	});
});

describe("blueprint writes", () =>
{
	it("give a new blueprint a zero count", async () =>
	{
		await publish(t1, "a");

		expect(await summaries()).toEqual([
			{
				key: "a",
				number_of_upvotes: 0,
			},
		]);
	});

	it("leave the count alone when a blueprint is edited", async () =>
	{
		await publish(t0, "a");
		await vote(t1, "alice", "a", "up");
		await publish(t2, "a", "edited");

		expect(await summaries()).toEqual([
			{
				key: "a",
				number_of_upvotes: 1,
			},
		]);
	});

	it("delete the cached count in the same batch that phases the blueprint out", async () =>
	{
		await publish(t0, "a");
		await publish(t0, "b");
		await vote(t1, "alice", "a", "up");

		await unpublish(t2, "a");

		expect(await summaries()).toEqual([
			{
				key: "b",
				number_of_upvotes: 0,
			},
		]);
	});

	it("keep votes on a phased-out blueprint out of the cache, and recount them when it is restored", async () =>
	{
		await publish(t0, "a");
		await vote(t1, "alice", "a", "up");
		await unpublish(t2, "a");
		await vote(t2, "bob", "a", "up");
		await unvote(t2, "alice", "a");
		await vote(t2, "carol", "a", "up");

		expect(await summaries()).toEqual([]);

		await publish(t3, "a");

		expect(await summaries()).toEqual([
			{
				key: "a",
				number_of_upvotes: 2,
			},
		]);
	});

	it("ignore votes on a blueprint that does not exist", async () =>
	{
		await vote(t1, "alice", "missing", "up");

		expect(await summaries()).toEqual([]);
	});
});

describe("rebuildVoteSummary", () =>
{
	const insertBlueprint = (key: string, systemTo = SYSTEM_TO_SENTINEL) =>
		env.DB.prepare(
			`INSERT INTO blueprint (key, imgur_image_id, blueprint_string_sha, system_from, system_to, created_by_id,
				created_on, last_updated_by_id, title, description_markdown)
			VALUES (?, 'img', 'sha', ?, ?, 'user', ?, 'user', 'title', '')`,
		).bind(key, t1, systemTo, t1);

	const insertVote = (userId: string, blueprintKey: string, direction: string, systemTo = SYSTEM_TO_SENTINEL) =>
		env.DB.prepare(
			"INSERT INTO vote (user_id, blueprint_key, system_from, system_to, direction) VALUES (?, ?, ?, ?, ?)",
		).bind(userId, blueprintKey, t1, systemTo, direction);

	it("counts current up votes for every current blueprint and replaces what was cached", async () =>
	{
		await env.DB.batch([
			insertBlueprint("a"),
			insertBlueprint("b"),
			insertBlueprint("deleted", t2),
			insertVote("alice", "a", "up"),
			insertVote("bob", "a", "up"),
			insertVote("carol", "a", "down"),
			insertVote("dave", "a", "up", t2),
			insertVote("alice", "deleted", "up"),
			insertVote("alice", "missing", "up"),
			env.DB.prepare("INSERT INTO blueprint_vote_summary (key, number_of_upvotes) VALUES ('a', 99), ('gone', 5)"),
		]);

		await rebuildVoteSummary(env.DB);

		expect(await summaries()).toEqual([
			{
				key: "a",
				number_of_upvotes: 2,
			},
			{
				key: "b",
				number_of_upvotes: 0,
			},
		]);
	});
});
