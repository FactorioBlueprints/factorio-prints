import {describe, expect, test} from "vite-plus/test";
import
{
	blueprintSaveTime,
	listedBlueprint,
	blueprintEvent,
	collectionEvent,
	commentEvent,
	eventTimeOf,
	moderatorsEvent,
	profileFieldChanged,
	tagListEvent,
	toAuthUser,
	userEvent,
	voteEvent,
} from "../functions/src/ingestEvents";

const eventTime = Date.UTC(2026, 10, 9, 12);

describe("eventTimeOf", () =>
{
	test("reads a CloudEvent time as epoch milliseconds", () =>
	{
		expect(eventTimeOf("2026-11-09T12:00:00.123Z")).toBe(eventTime + 123);
	});

	test("rejects a missing time rather than inventing one", () =>
	{
		expect(() => eventTimeOf("not a time")).toThrow("Database event has no valid time: not a time");
	});
});

describe("blueprintEvent", () =>
{
	test("carries the blueprint with its private node and thumbnail, and drops the derived favorites", () =>
	{
		expect(
			blueprintEvent(
				"bp1",
				{
					title: "Belt",
					blueprintString: "0eN",
					favorites:
					{
						alice: true,
					},
					numberOfFavorites: 1,
				},
				{
					imageUrl: "url",
				},
				"thumb",
				eventTime,
			),
		).toStrictEqual(
			{
				type: "blueprint",
				eventTime,
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
				thumbnail: "thumb",
			},
		);
	});

	test("sends null for a deleted blueprint", () =>
	{
		expect(blueprintEvent("bp1", null, null, null, eventTime)).toStrictEqual(
			{
				type: "blueprint",
				eventTime,
				key: "bp1",
				blueprint: null,
				blueprintPrivate: null,
				thumbnail: null,
			},
		);
	});
});

describe("vote, collection and comment events", () =>
{
	test("treat only true as favorited or collected", () =>
	{
		expect(voteEvent("alice", "bp1", true, eventTime)).toStrictEqual(
			{
				type: "vote",
				eventTime,
				userId: "alice",
				blueprintKey: "bp1",
				favorited: true,
			},
		);
		expect(voteEvent("alice", "bp1", null, eventTime).favorited).toBe(false);
		expect(collectionEvent("alice", "bp1", false, eventTime)).toStrictEqual(
			{
				type: "collection",
				eventTime,
				userId: "alice",
				blueprintKey: "bp1",
				collected: false,
			},
		);
	});

	test("carry a comment, or null once it is removed", () =>
	{
		expect(
			commentEvent(
				"bp1",
				"c1",
				{
					content: "Hi",
					authorId: "alice",
					createdAt: 1,
				},
				eventTime,
			),
		).toStrictEqual(
			{
				type: "comment",
				eventTime,
				blueprintKey: "bp1",
				commentId: "c1",
				comment:
				{
					content: "Hi",
					authorId: "alice",
					createdAt: 1,
				},
			},
		);
		expect(commentEvent("bp1", "c1", null, eventTime).comment).toBeNull();
	});
});

describe("moderatorsEvent and tagListEvent", () =>
{
	test("carry /moderators whole", () =>
	{
		expect(
			moderatorsEvent(
				{
					alice: true,
				},
				eventTime,
			),
		).toStrictEqual(
			{
				type: "moderators",
				eventTime,
				moderators:
				{
					alice: true,
				},
			},
		);
	});

	test("keep only the category and name keys of /byTag, not the blueprint keys under them", () =>
	{
		expect(
			tagListEvent(
				{
					belt:
					{
						balancer:
						{
							bp1: true,
							bp2: true,
						},
						tap:
						{
							bp3: true,
						},
					},
				},
				eventTime,
			),
		).toStrictEqual(
			{
				type: "tags",
				eventTime,
				byTag:
				{
					belt:
					{
						balancer: {},
						tap: {},
					},
				},
			},
		);
	});
});

describe("user events", () =>
{
	test("convert an Admin SDK user record to the auth export shape", () =>
	{
		expect(
			toAuthUser(
				{
					uid: "alice",
					email: "alice@example.com",
					displayName: "Alice Liddell",
					photoURL: "https://example.com/a.png",
					providerData: [
						{
							providerId: "github.com",
						},
					],
				},
			),
		).toStrictEqual(
			{
				localId: "alice",
				email: "alice@example.com",
				displayName: "Alice Liddell",
				photoUrl: "https://example.com/a.png",
				providerUserInfo: [
					{
						providerId: "github.com",
					},
				],
			},
		);
	});

	test("send only the profile's display fields, with the auth record or null for a deleted account", () =>
	{
		expect(
			userEvent(
				"alice",
				{
					displayName: "Alice",
					email: null,
					favorites:
					{
						bp1: true,
					},
					collection: {},
					needsDisplayName: true,
				},
				null,
				eventTime,
			),
		).toStrictEqual(
			{
				type: "user",
				eventTime,
				userId: "alice",
				profile:
				{
					displayName: "Alice",
					email: null,
				},
				authUser: null,
			},
		);
	});

	test("recognise which /users/<uid> children are profile fields", () =>
	{
		expect(profileFieldChanged("displayName")).toBe(true);
		expect(profileFieldChanged("photoURL")).toBe(true);
		expect(profileFieldChanged("favorites")).toBe(false);
		expect(profileFieldChanged("collection")).toBe(false);
	});
});

describe("blueprintSaveTime", () =>
{
	test("is the lastUpdatedDate the save stamped on the summary, so the stored version carries the same date as the Realtime Database", () =>
	{
		expect(blueprintSaveTime(1_794_000_000_123, "2026-11-12T10:00:00.456Z")).toBe(1_794_000_000_123);
	});

	test("is the time of the write when the summary is gone or carries no date, as for a deletion", () =>
	{
		expect([
			blueprintSaveTime(null, "2026-11-12T10:00:00.456Z"),
			blueprintSaveTime("soon", "2026-11-12T10:00:00.456Z"),
		]).toStrictEqual([Date.parse("2026-11-12T10:00:00.456Z"), Date.parse("2026-11-12T10:00:00.456Z")]);
	});
});

describe("listedBlueprint", () =>
{
	const blueprint =
	{
		title: "Belt",
	};

	test("is the blueprint while its summary exists", () =>
	{
		expect(listedBlueprint(1_794_000_000_123, blueprint)).toBe(blueprint);
	});

	test("is nothing once the summary is gone, even if the blueprint node is still there: a blueprint without a summary is deleted", () =>
	{
		expect([listedBlueprint(null, blueprint), listedBlueprint(null, null)]).toStrictEqual([null, null]);
	});
});
