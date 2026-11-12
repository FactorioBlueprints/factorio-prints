import {describe, expect, test} from "vite-plus/test";
import {buildReconcileRequests, mergeReports} from "../scripts/reconcileCore";

const dumpTime = Date.UTC(2026, 10, 8, 15, 42);

const dump =
{
	blueprints:
	{
		bp1:
		{
			title: "Belt",
			blueprintString: "0eN",
			favorites:
			{
				alice: true,
			},
		},
		bp2:
		{
			title: "Train",
			blueprintString: "0eM",
		},
	},
	blueprintsPrivate:
	{
		bp1:
		{
			imageUrl: "url",
		},
	},
	thumbnails:
	{
		bp2: "thumb",
	},
	users:
	{
		alice:
		{
			displayName: "Alice",
			favorites:
			{
				bp2: true,
			},
			collection:
			{
				bp1: true,
			},
		},
	},
	comments:
	{
		bp1:
		{
			c1:
			{
				content: "Hi",
				authorId: "alice",
				createdAt: 1,
			},
		},
	},
	moderators:
	{
		alice: true,
	},
	byTag:
	{
		belt:
		{
			balancer:
			{
				bp1: true,
			},
		},
	},
};

describe("buildReconcileRequests", () =>
{
	test("turns every dump entity into an event at the dump time, in chunks, with the blueprint keys last", () =>
	{
		const requests = buildReconcileRequests(
			dump,
			{
				dumpTime,
				mode: "shadow",
				chunkSize: 4,
			},
		);

		expect(requests).toStrictEqual([
			{
				mode: "shadow",
				events: [
					{
						type: "moderators",
						eventTime: dumpTime,
						moderators:
						{
							alice: true,
						},
					},
					{
						type: "tags",
						eventTime: dumpTime,
						byTag:
						{
							belt:
							{
								balancer: {},
							},
						},
					},
					{
						type: "blueprint",
						eventTime: dumpTime,
						key: "bp1",
						blueprint:
						{
							title: "Belt",
							blueprintString: "0eN",
						},
						blueprintPrivate:
						{
							imageUrl: "url",
						},
						thumbnail: null,
					},
					{
						type: "blueprint",
						eventTime: dumpTime,
						key: "bp2",
						blueprint:
						{
							title: "Train",
							blueprintString: "0eM",
						},
						blueprintPrivate: null,
						thumbnail: "thumb",
					},
				],
			},
			{
				mode: "shadow",
				events: [
					{
						type: "favoriteList",
						eventTime: dumpTime,
						userId: "alice",
						favorites:
						{
							bp2: true,
						},
					},
					{
						type: "collectionList",
						eventTime: dumpTime,
						userId: "alice",
						collection:
						{
							bp1: true,
						},
					},
					{
						type: "comment",
						eventTime: dumpTime,
						blueprintKey: "bp1",
						commentId: "c1",
						comment:
						{
							content: "Hi",
							authorId: "alice",
							createdAt: 1,
						},
					},
				],
			},
			{
				mode: "shadow",
				events: [],
				expectedBlueprintKeys: ["bp1", "bp2"],
				dumpTime,
			},
		]);
	});

	test("adds user events when an auth export is given, a user missing from it being a deleted account", () =>
	{
		const requests = buildReconcileRequests(
			{
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
			{
				dumpTime,
				mode: "repair",
				chunkSize: 10,
				authUsers: [
					{
						localId: "alice",
						email: "a@example.com",
						providerUserInfo: [
							{
								providerId: "google.com",
							},
						],
					},
				],
			},
		);

		expect(requests[0].events.filter((event) => event.type === "user")).toStrictEqual([
			{
				type: "user",
				eventTime: dumpTime,
				userId: "alice",
				profile:
				{
					displayName: "Alice",
				},
				authUser:
				{
					localId: "alice",
					email: "a@example.com",
					providerUserInfo: [
						{
							providerId: "google.com",
						},
					],
				},
			},
			{
				type: "user",
				eventTime: dumpTime,
				userId: "bob",
				profile:
				{
					displayName: "Bob",
				},
				authUser: null,
			},
		]);
		expect(requests[0].mode).toBe("repair");
	});
});

describe("mergeReports", () =>
{
	test("concatenates drift and adds up the counts", () =>
	{
		const change =
		{
			table: "blueprint",
			key:
			{
				key: "bp1",
			},
			outcome: "updated",
		};
		expect(
			mergeReports([
				{
					drift: [
						{
							event:
							{
								type: "blueprint",
								key: "bp1",
							},
							changes: [change],
						},
					],
					stale: 1,
					ignored: 0,
				},
				{
					drift: [],
					stale: 2,
					ignored: 3,
				},
			]),
		).toStrictEqual(
			{
				drift: [
					{
						event:
						{
							type: "blueprint",
							key: "bp1",
						},
						changes: [change],
					},
				],
				stale: 3,
				ignored: 3,
			},
		);
	});
});
