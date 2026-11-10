import {env} from "cloudflare:workers";
import {drizzle} from "drizzle-orm/d1";
import {beforeAll, beforeEach, describe, expect, it} from "vite-plus/test";
import {emptyDatabase} from "../../test/database.ts";
import {generateSigningKeys, publicKeyLookup, signToken} from "../../test/tokens.ts";
import {createWorker} from "../index.ts";
import {applyEvent} from "../ingest/applyEvent.ts";
import type {IngestEvent} from "../ingest/events.ts";
import fixtures from "../ingest/fixtures/blueprints.json";
import type {RealtimeBlueprint} from "../ingest/realtime.ts";

const fixture = fixtures.blueprints[0] as unknown as
{
	key: string;
	blueprint: RealtimeBlueprint;
};
const key = fixture.key;
const author = "maU7je24W6cqfu9R5pdiHbhkmHA3";
const t1 = Date.UTC(2026, 10, 9, 12);
const t2 = t1 + 60_000;
const t3 = t1 + 120_000;
const restoreTime = t1 + 3_600_000;

let keys: CryptoKeyPair;
let worker: ReturnType<typeof createWorker>;

beforeAll(async () =>
{
	keys = await generateSigningKeys();
	worker = createWorker(
		{
			now: () => restoreTime,
			serviceAccountKeys: async () => null,
			firebaseKeys: publicKeyLookup(keys),
		},
	);
});

const apply = (event: IngestEvent) =>
	applyEvent(
		{
			db: drizzle(env.DB),
			strings: env.BLUEPRINT_STRINGS,
		},
		event,
	);

const saveBlueprint = (eventTime: number, blueprintKey = key, overrides: Partial<RealtimeBlueprint> = {}) =>
	apply(
		{
			type: "blueprint",
			eventTime,
			key: blueprintKey,
			blueprint:
			{
				...fixture.blueprint,
				...overrides,
			},
		},
	);

beforeEach(async () =>
{
	await emptyDatabase();
	await saveBlueprint(t1);
	await apply(
		{
			type: "user",
			eventTime: t1,
			userId: author,
			profile:
			{
				displayName: "Sasha",
			},
			authUser:
			{
				localId: author,
			},
		},
	);
	await apply(
		{
			type: "vote",
			eventTime: t2,
			userId: "alice",
			blueprintKey: key,
			favorited: true,
		},
	);
	await apply(
		{
			type: "moderators",
			eventTime: t1,
			moderators:
			{
				moderator: true,
			},
		},
	);
});

const get = (path: string, headers: Record<string, string> = {}) =>
	worker.fetch(
		new Request(
			`https://blueprints.factorioprints.com${path}`,
			{
				headers,
			},
		),
		env,
	);

const firebaseToken = (userId: string) =>
	signToken(
		{
			aud: env.FIREBASE_PROJECT_ID,
			iss: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
			sub: userId,
			iat: restoreTime / 1000 - 10,
			auth_time: restoreTime / 1000 - 10,
			exp: restoreTime / 1000 + 3600,
		},
		keys.privateKey,
	);

const deleteBlueprint = () =>
	apply(
		{
			type: "blueprint",
			eventTime: t3,
			key,
			blueprint: null,
		},
	);

describe("GET /blueprints/:key", () =>
{
	it("serves the legacy /blueprints/<key>.json shape, with the string from R2 and the author's current name", async () =>
	{
		const response = await get(`/blueprints/${key}`);

		expect(response.status).toEqual(200);
		expect(response.headers.get("etag")).toEqual(`"${t1}"`);
		expect(await response.json()).toEqual(
			{
				title: "PU Shuffle",
				blueprintString: fixture.blueprint.blueprintString,
				createdDate: 1764553029476,
				descriptionMarkdown: fixture.blueprint.descriptionMarkdown,
				lastUpdatedDate: t1,
				numberOfFavorites: 1,
				tags: ["/general/tileable/", "/mods/vanilla/", "/version/0,15/", "/version/2,0/"],
				authorId: author,
				author:
				{
					userId: author,
					displayName: "Sasha",
				},
				image:
				{
					id: "Kq7amGs",
					type: "image/png",
					height: 0,
					width: 0,
				},
				favorites:
				{
					alice: true,
				},
			},
		);
	});

	it("answers 304 when the client already has the current version", async () =>
	{
		expect(
			(
				await get(
					`/blueprints/${key}`,
					{
						"if-none-match": `"${t1}"`,
					},
				)
			).status,
		).toEqual(304);
	});

	it("hides a deleted blueprint", async () =>
	{
		await deleteBlueprint();

		expect((await get(`/blueprints/${key}`)).status).toEqual(404);
	});
});

describe("GET /blueprintSummaries", () =>
{
	beforeEach(async () =>
	{
		await saveBlueprint(
			t2,
			"second",
			{
				title: "Second",
			},
		);
		await saveBlueprint(
			t3,
			"third",
			{
				title: "Third",
			},
		);
	});

	const summary = (title: string, lastUpdatedDate: number, numberOfFavorites = 0) => (
	{
		title,
		imgurId: "Kq7amGs",
		imgurType: "image/png",
		numberOfFavorites,
		lastUpdatedDate,
		height: 0,
		width: 0,
	});

	it("pages the most recently updated first, in the legacy page shape", async () =>
	{
		const first = await (await get("/blueprintSummaries?limit=2")).json();
		expect(first).toEqual(
			{
				data:
				{
					third: summary("Third", t3),
					second: summary("Second", t2),
				},
				lastKey: "second",
				lastValue: t2,
				hasMore: true,
			},
		);

		const second = await (await get(`/blueprintSummaries?limit=2&endBeforeValue=${t2}&endBeforeKey=second`)).json();
		expect(second).toEqual(
			{
				data:
				{
					[key]: summary("PU Shuffle", t1, 1),
				},
				lastKey: key,
				lastValue: t1,
				hasMore: false,
			},
		);
	});

	it("sorts by favorites, with a missing count reading as zero", async () =>
	{
		await env.DB.prepare("DELETE FROM blueprint_vote_summary WHERE key = 'third'").run();

		const page = (await (await get("/blueprintSummaries?orderBy=numberOfFavorites")).json()) as
		{
			data: Record<
				string,
				{
					numberOfFavorites: number;
				}
			>;
		};
		expect(Object.entries(page.data).map(([summaryKey, row]) => [summaryKey, row.numberOfFavorites])).toEqual([
			[key, 1],
			["third", 0],
			["second", 0],
		]);
	});

	it("returns only blueprints changed since an instant, for incremental sync", async () =>
	{
		const page = (await (await get(`/blueprintSummaries?since=${t2}`)).json()) as
		{
			data: object;
		};

		expect(Object.keys(page.data)).toEqual(["third"]);
	});

	it("leaves out deleted blueprints", async () =>
	{
		await deleteBlueprint();

		const page = (await (await get("/blueprintSummaries")).json()) as
		{
			data: object;
		};
		expect(Object.keys(page.data)).toEqual(["third", "second"]);
	});

	it("rejects an unknown sort", async () =>
	{
		expect((await get("/blueprintSummaries?orderBy=title")).status).toEqual(400);
	});
});

describe("moderator routes", () =>
{
	const history = (token?: string) =>
		get(
			`/moderator/blueprints/${key}/history`,
			token === undefined
				? {}
				:
					{
						authorization: `Bearer ${token}`,
					},
		);

	const restore = (token: string) =>
		worker.fetch(
			new Request(
				`https://blueprints.factorioprints.com/moderator/blueprints/${key}/restore`,
				{
					method: "POST",
					headers:
					{
						authorization: `Bearer ${token}`,
					},
				},
			),
			env,
		);

	it("require a Firebase ID token of a user with the administrator entitlement", async () =>
	{
		expect((await history()).status).toEqual(401);
		expect((await history(await firebaseToken("alice"))).status).toEqual(403);
		expect((await history(await firebaseToken("moderator"))).status).toEqual(200);
	});

	it("list a blueprint's versions, oldest first, including deleted ones", async () =>
	{
		await saveBlueprint(
			t2,
			key,
			{
				title: "Renamed",
			},
		);
		await deleteBlueprint();

		const body = (await (await history(await firebaseToken("moderator"))).json()) as
		{
			versions: unknown[];
		};
		expect(body.versions).toMatchObject([
			{
				number: 1,
				title: "PU Shuffle",
				systemFrom: t1,
				systemTo: t2,
			},
			{
				number: 2,
				title: "Renamed",
				systemFrom: t2,
				systemTo: t3,
			},
		]);
	});

	it("restore a deleted blueprint by phasing its last version back in, under the next version number", async () =>
	{
		await deleteBlueprint();

		const response = await restore(await firebaseToken("moderator"));

		expect(await response.json()).toEqual(
			{
				restored: key,
				version: 2,
			},
		);
		const restored = (await (await get(`/blueprints/${key}`)).json()) as Record<string, unknown>;
		expect(restored.title).toEqual("PU Shuffle");
		expect(restored.lastUpdatedDate).toEqual(restoreTime);
		expect(restored.tags).toEqual(["/general/tileable/", "/mods/vanilla/", "/version/0,15/", "/version/2,0/"]);
	});

	it("refuse to restore a blueprint that is not deleted", async () =>
	{
		expect((await restore(await firebaseToken("moderator"))).status).toEqual(409);
	});
});
