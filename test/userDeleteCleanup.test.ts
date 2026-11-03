import {describe, expect, test} from "vite-plus/test";
import {buildUserDeleteCleanupUpdates} from "../functions/src/userDeleteCleanup.ts";

describe("buildUserDeleteCleanupUpdates", () =>
{
	test("removes favorites and collectors, clears the name on remaining blueprints, and deletes the user record", () =>
	{
		const userData =
		{
			displayName: "Alice",
			favorites:
			{
				"fav-1": true,
			},
			collection:
			{
				"col-1": true,
			},
			blueprints:
			{
				"bp-1": true,
				"bp-2": true,
			},
		};

		expect(buildUserDeleteCleanupUpdates("alice", userData)).toStrictEqual(
			{
				"/blueprints/fav-1/favorites/alice": null,
				"/blueprintCollectors/col-1/alice": null,
				"/blueprints/bp-1/author/displayName": null,
				"/blueprints/bp-2/author/displayName": null,
				"/users/alice": null,
			},
		);
	});

	test("deletes only the user record for a user with no data", () =>
	{
		expect(buildUserDeleteCleanupUpdates("bob", {})).toStrictEqual(
			{
				"/users/bob": null,
			},
		);
	});
});
