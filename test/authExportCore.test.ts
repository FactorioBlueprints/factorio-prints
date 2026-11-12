import {describe, expect, it} from "vite-plus/test";
import {authListUrl, toAccountRecord, toAuthExportUser} from "../scripts/authExportCore";

describe("authListUrl", () =>
{
	it("asks only for the fields that are kept, so password hashes and salts are never requested", () =>
	{
		const url = new URL(authListUrl("my-project", "page two"));

		expect(
			{
				endpoint: `${url.origin}${url.pathname}`,
				parameters: Object.fromEntries(url.searchParams),
			},
		).toStrictEqual(
			{
				endpoint: "https://identitytoolkit.googleapis.com/v1/projects/my-project/accounts:batchGet",
				parameters:
				{
					maxResults: "1000",
					nextPageToken: "page two",
					fields: "nextPageToken,users(localId,email,photoUrl,disabled,providerUserInfo(providerId))",
				},
			},
		);
		expect(new URL(authListUrl("my-project")).searchParams.has("nextPageToken")).toBe(false);
	});
});

describe("toAuthExportUser", () =>
{
	it("keeps the uid, email, photo, provider ids and disabled flag, and drops anything else the service sends", () =>
	{
		expect([
			toAuthExportUser(
				{
					localId: "alice",
					email: "alice@example.com",
					photoUrl: "https://example.com/a.png",
					disabled: true,
					providerUserInfo: [
						{
							providerId: "google.com",
							rawId: "123",
							email: "alice@example.com",
						},
						{
							providerId: "github.com",
						},
					],
					passwordHash: "must never be kept",
					salt: "nor this",
					displayName: "Alice",
				},
			),
			toAuthExportUser(
				{
					localId: "bob",
				},
			),
		]).toStrictEqual([
			{
				uid: "alice",
				email: "alice@example.com",
				photoURL: "https://example.com/a.png",
				providerIds: ["google.com", "github.com"],
				disabled: true,
			},
			{
				uid: "bob",
				email: null,
				photoURL: null,
				providerIds: [],
				disabled: false,
			},
		]);
	});
});

describe("toAccountRecord", () =>
{
	it("gives a listed account the shape the ingest events carry", () =>
	{
		expect(
			toAccountRecord(
				{
					uid: "alice",
					email: "alice@example.com",
					photoURL: null,
					providerIds: ["github.com", "google.com"],
					disabled: false,
				},
			),
		).toStrictEqual(
			{
				localId: "alice",
				email: "alice@example.com",
				photoUrl: null,
				providerUserInfo: [
					{
						providerId: "github.com",
					},
					{
						providerId: "google.com",
					},
				],
			},
		);
	});
});
