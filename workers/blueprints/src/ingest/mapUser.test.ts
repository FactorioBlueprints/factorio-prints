import {describe, expect, it} from "vite-plus/test";
import fixtures from "./fixtures/realtime.json";
import {applyAuth, mapCollections, mapFavorites, mapModerators, mapUser} from "./mapUser.ts";
import type {AuthUser, RealtimeUser} from "./realtime.ts";
import type {FirebaseUserRow, VoteRow} from "./rows.ts";

interface UserFixture
{
	case: string;
	userId: string;
	user: RealtimeUser;
	authUser?: AuthUser;
	blueprintAuthors: Record<string, string>;
	expected:
	{
		firebaseUser: FirebaseUserRow;
		votes: VoteRow[];
	};
}

const byBlueprintKey = (votes: VoteRow[]) => [...votes].sort((a, b) => a.blueprintKey.localeCompare(b.blueprintKey));

describe("mapUser and mapFavorites", () =>
{
	it.each(fixtures.users as unknown as UserFixture[])("$case: $userId", (fixture) =>
	{
		const user = applyAuth(fixture.user, fixture.authUser);

		expect(
			{
				firebaseUser: mapUser(fixture.userId, user),
				votes: byBlueprintKey(
					mapFavorites(
						fixture.userId,
						user,
						{
							blueprintAuthors: new Map(Object.entries(fixture.blueprintAuthors)),
						},
					),
				),
			},
		).toStrictEqual(
			{
				firebaseUser: fixture.expected.firebaseUser,
				votes: byBlueprintKey(fixture.expected.votes),
			},
		);
	});

	it("truncates a long display name and skips false and orphaned favorites", () =>
	{
		const user: RealtimeUser =
		{
			displayName: "n".repeat(300),
			favorites:
			{
				"-kept": true,
				"-false": false,
				"-missing": true,
				"-own": true,
			},
		};
		const blueprintAuthors = new Map([
			["-kept", "someone"],
			["-false", "someone"],
			["-own", "uid"],
		]);

		expect(
			{
				displayName: mapUser("uid", user).displayName.length,
				votes: mapFavorites(
					"uid",
					user,
					{
						blueprintAuthors,
					},
				),
			},
		).toStrictEqual(
			{
				displayName: 256,
				votes: [
					{
						userId: "uid",
						blueprintKey: "-kept",
						direction: "up",
					},
				],
			},
		);
	});
});

describe("mapCollections", () =>
{
	it("keeps true entries for existing blueprints", () =>
	{
		const user: RealtimeUser =
		{
			collection:
			{
				"-kept": true,
				"-false": false,
				"-missing": true,
			},
		};

		expect(
			mapCollections(
				"uid",
				user,
				{
					blueprintKeys: new Set(["-kept", "-false"]),
				},
			),
		).toStrictEqual([
			{
				userId: "uid",
				blueprintKey: "-kept",
			},
		]);
	});

	it("drops the collection of a deleted account", () =>
	{
		const user = applyAuth(
			{
				collection:
				{
					"-kept": true,
				},
			},
			undefined,
		);

		expect(
			mapCollections(
				"uid",
				user,
				{
					blueprintKeys: new Set(["-kept"]),
				},
			),
		).toStrictEqual([]);
	});
});

describe("mapModerators", () =>
{
	it("maps /moderators to administrator entitlements", () =>
	{
		expect(mapModerators(fixtures.moderators.moderators)).toStrictEqual(fixtures.moderators.expected);
	});
});
