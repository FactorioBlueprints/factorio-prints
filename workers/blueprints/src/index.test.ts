import {env} from "cloudflare:workers";
import {beforeAll, beforeEach, describe, expect, it} from "vite-plus/test";
import {emptyDatabase} from "../test/database.ts";
import {generateSigningKeys, publicKeyLookup, signToken} from "../test/tokens.ts";
import {createWorker} from "./index.ts";

const nowSeconds = 1_800_000_000;
let keys: CryptoKeyPair;
let worker: ReturnType<typeof createWorker>;

beforeAll(async () =>
{
	keys = await generateSigningKeys();
	worker = createWorker(
		{
			now: () => nowSeconds,
			serviceAccountKeys: publicKeyLookup(keys),
		},
	);
});

beforeEach(async () =>
{
	await emptyDatabase();
});

const serviceAccountToken = (email = env.INGEST_SERVICE_ACCOUNTS.split(",")[0]) =>
	signToken(
		{
			aud: env.INGEST_AUDIENCE,
			iss: "https://accounts.google.com",
			sub: "1",
			email,
			email_verified: true,
			iat: nowSeconds,
			exp: nowSeconds + 3600,
		},
		keys.privateKey,
	);

const ingest = async (body: unknown, token?: string) =>
	worker.fetch(
		new Request(
			"https://blueprints.factorioprints.com/ingest",
			{
				method: "POST",
				headers:
				{
					"content-type": "application/json",
					...(token === undefined
						? {}
						:
							{
								authorization: `Bearer ${token}`,
							}),
				},
				body: JSON.stringify(body),
			},
		),
		env,
	);

const moderatorsEvent =
{
	type: "moderators",
	eventTime: Date.UTC(2026, 10, 9),
	moderators:
	{
		alice: true,
	},
};

describe("POST /ingest", () =>
{
	it("rejects a request without a token", async () =>
	{
		expect(
			(
				await ingest(
					{
						events: [moderatorsEvent],
					},
				)
			).status,
		).toEqual(401);
	});

	it("rejects a token from an account that is not allowed", async () =>
	{
		expect(
			(
				await ingest(
					{
						events: [moderatorsEvent],
					},
					await serviceAccountToken("someone@gmail.com"),
				)
			).status,
		).toEqual(401);
	});

	it("rejects a malformed body", async () =>
	{
		const response = await ingest(
			{
				events: [
					{
						type: "vote",
						eventTime: 1,
					},
				],
			},
			await serviceAccountToken(),
		);

		expect(response.status).toEqual(400);
		expect(await response.json()).toEqual(
			{
				error: "event 0 has no userId",
			},
		);
	});

	it("applies the events in order and reports each one", async () =>
	{
		const response = await ingest(
			{
				events: [
					moderatorsEvent,
					{
						...moderatorsEvent,
						eventTime: moderatorsEvent.eventTime - 1,
					},
				],
			},
			await serviceAccountToken(),
		);

		expect(response.status).toEqual(200);
		expect(await response.json()).toEqual(
			{
				results: [
					{
						status: "applied",
						changes: [
							{
								table: "user_entitlement",
								key:
								{
									userId: "alice",
									userRole: "administrator",
								},
								outcome: "inserted",
							},
						],
					},
					{
						status: "skipped-stale",
						changes: [
							{
								table: "user_entitlement",
								key:
								{
									userId: "alice",
									userRole: "administrator",
								},
								outcome: "skipped-stale",
							},
						],
					},
				],
			},
		);
	});
});

describe("unknown routes", () =>
{
	it("answer 404", async () =>
	{
		expect((await worker.fetch(new Request("https://blueprints.factorioprints.com/nope"), env)).status).toEqual(
			404,
		);
	});
});
