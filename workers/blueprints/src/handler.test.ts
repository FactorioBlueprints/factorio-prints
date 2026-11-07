import {describe, expect, it, vi} from "vite-plus/test";
import {handleRequest, type HandlerDependencies} from "./handler.ts";
import type {BlueprintStorage} from "./blueprintStore.ts";

const secret = "ingest-secret";
const blueprintId = "-KnQ865j-qQ21WoUPbd3";
const body =
{
	title: "Smelter",
	lastUpdatedDate: 1000,
	blueprintString: "abc",
};

const createDependencies = (overrides: Partial<HandlerDependencies> = {}) =>
{
	const store =
	{
		read: vi.fn().mockResolvedValue(body),
		upsert: vi.fn().mockResolvedValue(true),
		remove: vi.fn().mockResolvedValue(undefined),
	};
	const dependencies: HandlerDependencies =
	{
		storage: {} as BlueprintStorage,
		ingestSecret: secret,
		store,
		...overrides,
	};
	return {
		dependencies,
		store,
	};
};

const send = (path: string, init: RequestInit = {}) => new Request(`https://blueprints.example.com${path}`, init);

const authorized =
{
	authorization: `Bearer ${secret}`,
	"content-type": "application/json",
};

describe("reads", () =>
{
	it("serves a blueprint as JSON with CORS and a short cache lifetime", async () =>
	{
		const {dependencies, store} = createDependencies();

		const response = await handleRequest(send(`/blueprints/${blueprintId}.json`), dependencies);

		expect(response.status).toBe(200);
		expect(await response.json()).toStrictEqual(body);
		expect(response.headers.get("access-control-allow-origin")).toBe("*");
		expect(response.headers.get("cache-control")).toBe("public, max-age=60");
		expect(store.read).toHaveBeenCalledWith(dependencies.storage, blueprintId);
	});

	it("returns 404 for an unknown blueprint", async () =>
	{
		const {dependencies} = createDependencies();
		vi.mocked(dependencies.store.read).mockResolvedValue(null);

		const response = await handleRequest(send(`/blueprints/${blueprintId}.json`), dependencies);

		expect(response.status).toBe(404);
	});

	it("rejects ids that are not push keys before touching storage", async () =>
	{
		const {dependencies, store} = createDependencies();

		const response = await handleRequest(send("/blueprints/..%2Fusers.json"), dependencies);

		expect(response.status).toBe(400);
		expect(store.read).not.toHaveBeenCalled();
	});

	it("returns 502 when storage fails", async () =>
	{
		const {dependencies} = createDependencies();
		vi.mocked(dependencies.store.read).mockRejectedValue(new Error("missing string"));

		const response = await handleRequest(send(`/blueprints/${blueprintId}.json`), dependencies);

		expect(response.status).toBe(502);
	});

	it("rejects unsupported methods and unknown paths", async () =>
	{
		const {dependencies} = createDependencies();

		expect(
			(
				await handleRequest(
					send(
						`/blueprints/${blueprintId}.json`,
						{
							method: "POST",
						},
					),
					dependencies,
				)
			).status,
		).toBe(405);
		expect((await handleRequest(send("/users.json"), dependencies)).status).toBe(404);
	});
});

describe("ingest", () =>
{
	it("upserts a blueprint for an authorized caller", async () =>
	{
		const {dependencies, store} = createDependencies();

		const response = await handleRequest(
			send(
				`/ingest/blueprints/${blueprintId}`,
				{
					method: "PUT",
					headers: authorized,
					body: JSON.stringify(body),
				},
			),
			dependencies,
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toStrictEqual(
			{
				applied: true,
			},
		);
		expect(store.upsert).toHaveBeenCalledWith(dependencies.storage, blueprintId, body);
	});

	it("deletes a blueprint for an authorized caller", async () =>
	{
		const {dependencies, store} = createDependencies();

		const response = await handleRequest(
			send(
				`/ingest/blueprints/${blueprintId}`,
				{
					method: "DELETE",
					headers: authorized,
				},
			),
			dependencies,
		);

		expect(response.status).toBe(204);
		expect(store.remove).toHaveBeenCalledWith(dependencies.storage, blueprintId);
	});

	it("rejects a wrong or missing secret without touching storage", async () =>
	{
		const {dependencies, store} = createDependencies();

		const wrong = await handleRequest(
			send(
				`/ingest/blueprints/${blueprintId}`,
				{
					method: "PUT",
					headers:
					{
						authorization: "Bearer nope",
					},
					body: "{}",
				},
			),
			dependencies,
		);
		const missing = await handleRequest(
			send(
				`/ingest/blueprints/${blueprintId}`,
				{
					method: "PUT",
					body: "{}",
				},
			),
			dependencies,
		);

		expect(wrong.status).toBe(401);
		expect(missing.status).toBe(401);
		expect(store.upsert).not.toHaveBeenCalled();
	});

	it("fails closed when no secret is configured", async () =>
	{
		const {dependencies, store} = createDependencies(
			{
				ingestSecret: "",
			},
		);

		const response = await handleRequest(
			send(
				`/ingest/blueprints/${blueprintId}`,
				{
					method: "PUT",
					headers:
					{
						authorization: "Bearer ",
					},
					body: "{}",
				},
			),
			dependencies,
		);

		expect(response.status).toBe(503);
		expect(store.upsert).not.toHaveBeenCalled();
	});

	it("rejects a body that is not a JSON object", async () =>
	{
		const {dependencies} = createDependencies();

		const response = await handleRequest(
			send(
				`/ingest/blueprints/${blueprintId}`,
				{
					method: "PUT",
					headers: authorized,
					body: "[1]",
				},
			),
			dependencies,
		);

		expect(response.status).toBe(400);
	});

	it("reports a rejected write as a 400 when the body has no lastUpdatedDate", async () =>
	{
		const {dependencies} = createDependencies();
		vi.mocked(dependencies.store.upsert).mockRejectedValue(
			new Error("Blueprint body must have a numeric lastUpdatedDate"),
		);

		const response = await handleRequest(
			send(
				`/ingest/blueprints/${blueprintId}`,
				{
					method: "PUT",
					headers: authorized,
					body: JSON.stringify(
						{
							title: "x",
						},
					),
				},
			),
			dependencies,
		);

		expect(response.status).toBe(400);
	});
});
