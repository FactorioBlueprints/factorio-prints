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
			now: () => nowSeconds * 1000,
			serviceAccountKeys: publicKeyLookup(keys),
			firebaseKeys: async () => null,
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

	it("accepts the runtime account of both generations of Cloud Functions, since the account-deletion trigger is first generation, and the account the backup merge workflow runs as", async () =>
	{
		const statuses: number[] = [];
		for (const email of [
			"329845993350-compute@developer.gserviceaccount.com",
			"facorio-blueprints@appspot.gserviceaccount.com",
			"firebase-adminsdk-70chk@facorio-blueprints.iam.gserviceaccount.com",
		])
		{
			const response = await ingest(
				{
					events: [],
				},
				await serviceAccountToken(email),
			);
			statuses.push(response.status);
		}

		expect(statuses).toStrictEqual([200, 200, 200]);
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

	it("rejects a user event whose Admin SDK record is not an object", async () =>
	{
		const response = await ingest(
			{
				events: [
					{
						type: "user",
						eventTime: 1,
						userId: "alice",
						profile: null,
						authUser: "alice",
					},
				],
			},
			await serviceAccountToken(),
		);

		expect(await response.json()).toEqual(
			{
				error: "event 0 has no authUser object or null",
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

describe("POST /reconcile", () =>
{
	const reconcileRequest = async (body: unknown, token?: string) =>
		worker.fetch(
			new Request(
				"https://blueprints.factorioprints.com/reconcile",
				{
					method: "POST",
					headers:
						token === undefined
							? {}
							:
								{
									authorization: `Bearer ${token}`,
								},
					body: JSON.stringify(body),
				},
			),
			env,
		);

	it("rejects a request without a service-account token", async () =>
	{
		expect(
			(
				await reconcileRequest(
					{
						events: [],
					},
				)
			).status,
		).toEqual(401);
	});

	it("reports drift in shadow mode unless repair is asked for", async () =>
	{
		const response = await reconcileRequest(
			{
				events: [moderatorsEvent],
			},
			await serviceAccountToken(),
		);

		expect(await response.json()).toEqual(
			{
				drift: [
					{
						event:
						{
							type: "moderators",
						},
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
				],
				stale: 0,
				ignored: 0,
				amended: 0,
			},
		);
		expect(await env.DB.prepare("SELECT count(*) AS count FROM user_entitlement").first("count")).toEqual(0);
	});

	it("applies the events in repair mode", async () =>
	{
		await reconcileRequest(
			{
				mode: "repair",
				events: [moderatorsEvent],
			},
			await serviceAccountToken(),
		);

		expect(await env.DB.prepare("SELECT count(*) AS count FROM user_entitlement").first("count")).toEqual(1);
	});

	it("checks a page of stored strings against the parser when asked to re-derive, and validates the page", async () =>
	{
		const page = await reconcileRequest(
			{
				mode: "shadow",
				rederive:
				{
					after: "",
					limit: 5,
				},
			},
			await serviceAccountToken(),
		);
		const invalid = await reconcileRequest(
			{
				mode: "shadow",
				rederive:
				{
					after: "",
					limit: 0,
				},
			},
			await serviceAccountToken(),
		);

		expect([page.status, await page.json(), invalid.status]).toEqual([
			200,
			{
				rederive:
				{
					checked: 0,
					next: null,
					missing: [],
					changed: [],
				},
			},
			400,
		]);
	});

	it("rejects an unknown mode", async () =>
	{
		const response = await reconcileRequest(
			{
				mode: "fix",
				events: [],
			},
			await serviceAccountToken(),
		);

		expect(response.status).toEqual(400);
		expect(await response.json()).toEqual(
			{
				error: "mode must be shadow or repair",
			},
		);
	});
});

describe("a failing database", () =>
{
	it("answers 503 in JSON and logs the database's own error, not only the query that failed", async () =>
	{
		const failing =
		{
			...env,
			DB:
			{
				prepare: () =>
				{
					throw new Error(
						"D1_ERROR: storage operation exceeded timeout",
						{
							cause: new Error("the object was reset"),
						},
					);
				},
			} as unknown as D1Database,
		};
		const logged: string[] = [];
		const original = console.error;
		console.error = (...parts: unknown[]) =>
		{
			logged.push(parts.join(" "));
		};
		let responses: Response[];
		try
		{
			responses = [
				await worker.fetch(new Request("https://blueprints.factorioprints.com/blueprints/any"), failing),
				await worker.fetch(new Request("https://blueprints.factorioprints.com/blueprintSummaries"), failing),
			];
		}
		finally
		{
			console.error = original;
		}

		expect(
			{
				statuses: responses.map((response) => response.status),
				bodies: await Promise.all(responses.map((response) => response.json())),
				logsTheCause: logged.map(
					(line) =>
						line.includes("D1_ERROR: storage operation exceeded timeout") &&
						line.includes("the object was reset"),
				),
			},
		).toEqual(
			{
				statuses: [503, 503],
				bodies: [
					{
						error: "the blueprint store is unavailable",
					},
					{
						error: "the blueprint store is unavailable",
					},
				],
				logsTheCause: [true, true],
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
