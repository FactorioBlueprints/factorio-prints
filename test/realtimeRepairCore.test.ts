import {describe, expect, it} from "vite-plus/test";
import {chunkUpdates, planCounterRepairs, planDateRepairs, planFavoriteRemovals} from "../scripts/realtimeRepairCore";

describe("planDateRepairs", () =>
{
	it("sets both dates back to the store's version start where a save that changed nothing moved them forward, and leaves the rest", () =>
	{
		expect(
			planDateRepairs([
				{
					id: "resaved",
					title: "Resaved",
					realtimeDate: 300,
					storeDate: 100,
				},
				{
					id: "equal",
					title: "Equal",
					realtimeDate: 100,
					storeDate: 100,
				},
				{
					id: "storeNewer",
					title: "Changed without a save",
					realtimeDate: 100,
					storeDate: 200,
				},
			]),
		).toStrictEqual(
			{
				updates:
				{
					"/blueprints/resaved/lastUpdatedDate": 100,
					"/blueprintSummaries/resaved/lastUpdatedDate": 100,
				},
				repaired: [
					{
						id: "resaved",
						title: "Resaved",
						realtimeDate: 300,
						newDate: 100,
					},
				],
				storeNewer: ["storeNewer"],
			},
		);
	});
});

describe("planFavoriteRemovals and planCounterRepairs", () =>
{
	const blueprints = [
		{
			id: "bp",
			authorId: "author",
			favorites: ["alice", "author", "ghost"],
			blueprintCounter: 1,
			summaryCounter: 3,
		},
		{
			id: "fine",
			authorId: "author",
			favorites: ["alice"],
			blueprintCounter: 1,
			summaryCounter: 1,
		},
	];

	it("removes an author's favorite of their own blueprint and the favorites of accounts that no longer exist, on both sides", () =>
	{
		expect(planFavoriteRemovals(blueprints, new Set(["alice", "author"]))).toStrictEqual(
			{
				updates:
				{
					"/users/author/favorites/bp": null,
					"/blueprints/bp/favorites/author": null,
					"/users/ghost/favorites/bp": null,
					"/blueprints/bp/favorites/ghost": null,
				},
				removed: [
					{
						id: "bp",
						userId: "author",
						why: "own blueprint",
					},
					{
						id: "bp",
						userId: "ghost",
						why: "account no longer exists",
					},
				],
			},
		);
	});

	it("sets each counter that differs to the number of favorites that remain", () =>
	{
		expect(planCounterRepairs(blueprints, new Set(["alice", "author"]))).toStrictEqual(
			{
				updates:
				{
					"/blueprintSummaries/bp/numberOfFavorites": 1,
				},
				repaired: [
					{
						id: "bp",
						blueprintCounter: 1,
						summaryCounter: 3,
						favorites: 3,
						newValue: 1,
					},
				],
			},
		);
	});
});

describe("chunkUpdates", () =>
{
	it("keeps every path of one blueprint or user in the same update, a limited number per update", () =>
	{
		expect(
			chunkUpdates(
				{
					"/blueprints/a/lastUpdatedDate": 1,
					"/blueprintSummaries/a/lastUpdatedDate": 1,
					"/blueprints/b/lastUpdatedDate": 2,
					"/blueprintSummaries/b/lastUpdatedDate": 2,
					"/blueprints/c/lastUpdatedDate": 3,
				},
				2,
			),
		).toStrictEqual([
			{
				"/blueprints/a/lastUpdatedDate": 1,
				"/blueprintSummaries/a/lastUpdatedDate": 1,
				"/blueprints/b/lastUpdatedDate": 2,
				"/blueprintSummaries/b/lastUpdatedDate": 2,
			},
			{
				"/blueprints/c/lastUpdatedDate": 3,
			},
		]);
	});
});
