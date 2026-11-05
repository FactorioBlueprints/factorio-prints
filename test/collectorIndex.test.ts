import {describe, expect, test} from "vite-plus/test";
import {getIndexedCollectorUserIds, getLegacyCollectorUserIds} from "../functions/src/collectorIndex";

const users =
{
	alice:
	{
		collection:
		{
			"blueprint-100": true,
			"blueprint-200": false,
			"deleted-blueprint-100": true,
		},
	},
	bob:
	{
		collection:
		{
			"blueprint-100": true,
			"blueprint-200": true,
		},
	},
	charlie:
	{
		collection: null,
	},
};

describe("collector index", () =>
{
	test("reads only active users from a blueprint collector index", () =>
	{
		expect(
			getIndexedCollectorUserIds(
				{
					alice: true,
					bob: false,
					charlie: true,
				},
			),
		).toStrictEqual(["alice", "charlie"]);
	});

	test("finds active legacy collection entries for one blueprint", () =>
	{
		expect(getLegacyCollectorUserIds(users, "blueprint-100")).toStrictEqual(["alice", "bob"]);
	});
});
