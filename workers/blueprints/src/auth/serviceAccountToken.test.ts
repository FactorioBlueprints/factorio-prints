import {beforeAll, describe, expect, it} from "vite-plus/test";
import {generateSigningKeys, publicKeyLookup, signToken} from "../../test/tokens.ts";
import {verifyServiceAccountToken} from "./serviceAccountToken.ts";

const audience = "https://blueprints.factorioprints.com/ingest";
const serviceAccount = "ingest@facorio-blueprints.iam.gserviceaccount.com";
const nowSeconds = 1_800_000_000;

let keys: CryptoKeyPair;
let impostor: CryptoKeyPair;

beforeAll(async () =>
{
	[keys, impostor] = await Promise.all([generateSigningKeys(), generateSigningKeys()]);
});

const claims = (overrides: Record<string, unknown> = {}) => (
{
	aud: audience,
	iss: "https://accounts.google.com",
	sub: "1234567890",
	email: serviceAccount,
	email_verified: true,
	iat: nowSeconds - 10,
	exp: nowSeconds + 3600,
	...overrides,
});

const verify = (token: string) =>
	verifyServiceAccountToken(
		token,
		{
			audience,
			allowedEmails: [serviceAccount],
			now: () => nowSeconds,
			publicKey: publicKeyLookup(keys),
		},
	);

describe("verifyServiceAccountToken", () =>
{
	it("accepts a Google-signed ID token for the Worker from an allowed service account", async () =>
	{
		expect(await verify(await signToken(claims(), keys.privateKey))).toEqual(
			{
				ok: true,
				email: serviceAccount,
			},
		);
	});

	it("accepts the issuer without a scheme, which Google also uses", async () =>
	{
		expect(
			await verify(
				await signToken(
					claims(
						{
							iss: "accounts.google.com",
						},
					),
					keys.privateKey,
				),
			),
		).toEqual(
			{
				ok: true,
				email: serviceAccount,
			},
		);
	});

	it.each([
		["a token signed by another key", {}, "invalid-signature"],
		[
			"another audience",
			{
				aud: "https://elsewhere.example",
			},
			"invalid-audience",
		],
		[
			"another issuer",
			{
				iss: "https://securetoken.google.com/facorio-blueprints",
			},
			"invalid-issuer",
		],
		[
			"an expired token",
			{
				exp: nowSeconds,
			},
			"expired",
		],
		[
			"a token issued in the future",
			{
				iat: nowSeconds + 3600,
			},
			"not-yet-valid",
		],
		[
			"any other Google account",
			{
				email: "someone@gmail.com",
			},
			"invalid-subject",
		],
		[
			"an unverified email",
			{
				email_verified: false,
			},
			"invalid-subject",
		],
	])("rejects %s", async (description, overrides, reason) =>
	{
		const signWith = description === "a token signed by another key" ? impostor.privateKey : keys.privateKey;

		expect(await verify(await signToken(claims(overrides), signWith))).toEqual(
			{
				ok: false,
				reason,
			},
		);
	});

	it("rejects a malformed token", async () =>
	{
		expect(await verify("not-a-jwt")).toEqual(
			{
				ok: false,
				reason: "malformed",
			},
		);
	});
});
