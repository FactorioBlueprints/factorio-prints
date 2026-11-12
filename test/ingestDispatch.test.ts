import {describe, expect, test} from "vite-plus/test";
import
{
	dispatchEvent,
	drainBuffer,
	type IngestTransport,
	type BufferStore,
	fetchIdentityToken,
	postEvents,
} from "../functions/src/ingestDispatch";
import type {IngestEvent} from "../functions/src/ingestEvents";

const event = (eventTime: number): IngestEvent => (
{
	type: "moderators",
	eventTime,
	moderators: {},
});

const memoryBuffer = (buffering: boolean, entries: [string, IngestEvent][] = []) =>
{
	const store = new Map(entries);
	let nextId = entries.length;
	const buffer: BufferStore &
	{
		entries: Map<string, IngestEvent>;
	} =
	{
		entries: store,
		isBuffering: async () => buffering,
		append: async (appended) =>
		{
			store.set(`id-${String(nextId++).padStart(3, "0")}`, appended);
		},
		readOldest: async (limit) => [...store.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, limit),
		remove: async (ids) =>
		{
			for (const id of ids) store.delete(id);
		},
	};
	return buffer;
};

const recordingTransport = (failOnCall?: number) =>
{
	const posted: IngestEvent[][] = [];
	const transport: IngestTransport &
	{
		posted: IngestEvent[][];
	} =
	{
		posted,
		post: async (events) =>
		{
			if (posted.length + 1 === failOnCall)
			{
				posted.push([...events]);
				throw new Error("Worker unavailable");
			}
			posted.push([...events]);
		},
	};
	return transport;
};

describe("dispatchEvent", () =>
{
	test("posts the event to the Worker when not buffering", async () =>
	{
		const buffer = memoryBuffer(false);
		const transport = recordingTransport();

		expect(
			await dispatchEvent(
				{
					buffer,
					transport,
				},
				event(1),
			),
		).toBe("posted");
		expect(transport.posted).toStrictEqual([[event(1)]]);
		expect(buffer.entries.size).toBe(0);
	});

	test("appends the event to the buffer while buffering, without posting", async () =>
	{
		const buffer = memoryBuffer(true);
		const transport = recordingTransport();

		expect(
			await dispatchEvent(
				{
					buffer,
					transport,
				},
				event(1),
			),
		).toBe("buffered");
		expect(transport.posted).toStrictEqual([]);
		expect([...buffer.entries.values()]).toStrictEqual([event(1)]);
	});

	test("buffers the event when the Worker cannot take it, so the drain replays it", async () =>
	{
		const buffer = memoryBuffer(false);
		const transport = recordingTransport(1);

		expect(
			await dispatchEvent(
				{
					buffer,
					transport,
				},
				event(1),
			),
		).toBe("buffered-after-failure");
		expect([...buffer.entries.values()]).toStrictEqual([event(1)]);
	});
});

describe("drainBuffer", () =>
{
	test("replays the buffer oldest first in batches and removes what the Worker took", async () =>
	{
		const buffer = memoryBuffer(true, [
			["id-002", event(3)],
			["id-000", event(1)],
			["id-001", event(2)],
		]);
		const transport = recordingTransport();

		expect(
			await drainBuffer(
				{
					buffer,
					transport,
				},
				2,
			),
		).toStrictEqual(
			{
				replayed: 3,
			},
		);
		expect(transport.posted).toStrictEqual([[event(1), event(2)], [event(3)]]);
		expect(buffer.entries.size).toBe(0);
	});

	test("stops at the first failure and keeps the batch that failed, so order is preserved", async () =>
	{
		const buffer = memoryBuffer(true, [
			["id-000", event(1)],
			["id-001", event(2)],
			["id-002", event(3)],
		]);
		const transport = recordingTransport(2);

		await expect(
			drainBuffer(
				{
					buffer,
					transport,
				},
				2,
			),
		).rejects.toThrow("Worker unavailable");
		expect([...buffer.entries.keys()]).toStrictEqual(["id-002"]);
	});
});

describe("postEvents and fetchIdentityToken", () =>
{
	test("mints an ID token for the Worker from the metadata server, with the email claims the Worker checks", async () =>
	{
		const requests: [string, RequestInit | undefined][] = [];
		const token = await fetchIdentityToken("https://blueprints.factorioprints.com/ingest", async (url, init) =>
		{
			requests.push([url, init]);
			return new Response("signed.jwt.token");
		});

		expect(token).toBe("signed.jwt.token");
		expect(requests).toStrictEqual([
			[
				"http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=https%3A%2F%2Fblueprints.factorioprints.com%2Fingest&format=full",
				{
					headers:
					{
						"Metadata-Flavor": "Google",
					},
				},
			],
		]);
	});

	test("posts events with the bearer token and fails on a non-2xx answer", async () =>
	{
		const requests: [string, RequestInit | undefined][] = [];
		const fetchStub = async (url: string, init?: RequestInit) =>
		{
			requests.push([url, init]);
			return url.startsWith("http://metadata")
				? new Response("token")
				: new Response(
						"nope",
						{
							status: 503,
						},
					);
		};

		await expect(postEvents("https://blueprints.factorioprints.com/ingest", [event(1)], fetchStub)).rejects.toThrow(
			"Ingest returned 503: nope",
		);
		expect(requests[1]).toStrictEqual([
			"https://blueprints.factorioprints.com/ingest",
			{
				method: "POST",
				headers:
				{
					authorization: "Bearer token",
					"content-type": "application/json",
				},
				body: JSON.stringify(
					{
						events: [event(1)],
					},
				),
			},
		]);
	});
});
