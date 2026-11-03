import {describe, expect, it} from "vite-plus/test";
import {applyProviderUsername, buildUserInformation, getDefaultDisplayName} from "./defaultDisplayName";

const githubProfile =
{
	providerDisplayName: "Alice Realname",
	photoURL: "https://example.com/alice.png",
	email: "alice@example.com",
	emailVerified: true,
	providerId: "github.com",
};

describe("getDefaultDisplayName", () =>
{
	it("uses the provider's real name when one is available", () =>
	{
		expect(getDefaultDisplayName("Alice Realname", "alice-gh")).toBe("Alice Realname");
	});

	it("falls back to the provider username when there is no real name", () =>
	{
		expect([getDefaultDisplayName(null, "alice-gh"), getDefaultDisplayName("   ", "alice-gh")]).toStrictEqual([
			"alice-gh",
			"alice-gh",
		]);
	});

	it("falls back to Anonymous when there is no real name or username", () =>
	{
		expect([
			getDefaultDisplayName(undefined, undefined),
			getDefaultDisplayName(null, null),
			getDefaultDisplayName("   ", "   "),
		]).toStrictEqual(["Anonymous", "Anonymous", "Anonymous"]);
	});
});

describe("buildUserInformation", () =>
{
	it("gives a new user their provider's real name and prompts them to confirm it", () =>
	{
		expect(buildUserInformation(null, githubProfile)).toStrictEqual(
			{
				displayName: "Alice Realname",
				needsDisplayName: true,
				providerDisplayName: "Alice Realname",
				photoURL: "https://example.com/alice.png",
				email: "alice@example.com",
				emailVerified: true,
				providerId: "github.com",
			},
		);
	});

	it("keeps an existing user's display name and does not prompt them", () =>
	{
		expect(
			buildUserInformation(
				{
					displayName: "Alice Realname",
					favorites:
					{
						abc: true,
					},
				},
				githubProfile,
			),
		).toStrictEqual(
			{
				displayName: "Alice Realname",
				favorites:
				{
					abc: true,
				},
				providerDisplayName: "Alice Realname",
				photoURL: "https://example.com/alice.png",
				email: "alice@example.com",
				emailVerified: true,
				providerId: "github.com",
			},
		);
	});

	it("gives an existing record with no display name the real name and a prompt", () =>
	{
		expect(
			buildUserInformation(
				{
					favorites:
					{
						abc: true,
					},
				},
				githubProfile,
			),
		).toStrictEqual(
			{
				displayName: "Alice Realname",
				needsDisplayName: true,
				favorites:
				{
					abc: true,
				},
				providerDisplayName: "Alice Realname",
				photoURL: "https://example.com/alice.png",
				email: "alice@example.com",
				emailVerified: true,
				providerId: "github.com",
			},
		);
	});

	it("falls back to Anonymous when the provider has no real name", () =>
	{
		expect(
			buildUserInformation(
				null,
				{
					...githubProfile,
					providerDisplayName: null,
				},
			),
		).toStrictEqual(
			{
				displayName: "Anonymous",
				needsDisplayName: true,
				providerDisplayName: null,
				photoURL: "https://example.com/alice.png",
				email: "alice@example.com",
				emailVerified: true,
				providerId: "github.com",
			},
		);
	});
});

describe("applyProviderUsername", () =>
{
	it("creates a record with the real name when sign-in wins the race", () =>
	{
		expect(applyProviderUsername(null, "alice-gh", "Alice Realname")).toStrictEqual(
			{
				displayName: "Alice Realname",
				needsDisplayName: true,
			},
		);
	});

	it("creates a record with the username when sign-in wins the race and there is no real name", () =>
	{
		expect(applyProviderUsername(null, "alice-gh", null)).toStrictEqual(
			{
				displayName: "alice-gh",
				needsDisplayName: true,
			},
		);
	});

	it("replaces the neutral default on a record that still needs a display name", () =>
	{
		expect(
			applyProviderUsername(
				{
					displayName: "Anonymous",
					needsDisplayName: true,
					email: "alice@example.com",
				},
				"alice-gh",
				null,
			),
		).toStrictEqual(
			{
				displayName: "alice-gh",
				needsDisplayName: true,
				email: "alice@example.com",
			},
		);
	});

	it("leaves a chosen display name alone", () =>
	{
		expect([
			applyProviderUsername(
				{
					displayName: "Alice",
				},
				"alice-gh",
				"Alice",
			),
			applyProviderUsername(
				{
					displayName: "Alice",
					needsDisplayName: true,
				},
				"alice-gh",
				"Alice",
			),
		]).toStrictEqual([undefined, undefined]);
	});

	it("does nothing without a username", () =>
	{
		expect([
			applyProviderUsername(null, undefined, "Alice Realname"),
			applyProviderUsername(
				{
					displayName: "Anonymous",
					needsDisplayName: true,
				},
				null,
				null,
			),
		]).toStrictEqual([undefined, undefined]);
	});
});
