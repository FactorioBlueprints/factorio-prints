/*
 * Sends change events to the blueprints Worker, or holds them in a Realtime Database buffer while the initial load
 * from a backup is being handed off to live ingest. The Worker applies each event at its own event time with a stale-event guard, so replaying the buffer later, or an
 * event twice, is safe. I/O is injected so the logic is tested without emulators.
 */
import type {IngestEvent} from "./ingestEvents";

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface BufferStore
{
	/** True while `/ingest/buffering` says to hold events instead of posting them. */
	isBuffering(): Promise<boolean>;
	append(event: IngestEvent): Promise<void>;
	/** The oldest buffered events with their ids, in buffering order. */
	readOldest(limit: number): Promise<[string, IngestEvent][]>;
	remove(ids: readonly string[]): Promise<void>;
}

export interface IngestTransport
{
	/** Posts events to the Worker, throwing when it does not accept them. */
	post(events: readonly IngestEvent[]): Promise<void>;
}

export interface DispatchDependencies
{
	buffer: BufferStore;
	transport: IngestTransport;
}

export type DispatchOutcome = "posted" | "buffered" | "buffered-after-failure";

const METADATA_IDENTITY_URL =
	"http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity";

/**
 * Mints a Google-signed ID token for `audience` as the function's service account. `format=full` adds the email
 * claims the Worker checks against its allowlist.
 */
export const fetchIdentityToken = async (audience: string, fetchImpl: Fetch = fetch): Promise<string> =>
{
	const query = new URLSearchParams(
		{
			audience,
			format: "full",
		},
	);
	const response = await fetchImpl(
		`${METADATA_IDENTITY_URL}?${query}`,
		{
			headers:
			{
				"Metadata-Flavor": "Google",
			},
		},
	);
	if (!response.ok)
	{
		throw new Error(`Metadata server returned ${response.status}`);
	}
	return (await response.text()).trim();
};

/** POSTs events to the Worker's ingest URL, which is also the token audience. */
export const postEvents = async (ingestUrl: string, events: readonly IngestEvent[], fetchImpl: Fetch = fetch) =>
{
	const token = await fetchIdentityToken(ingestUrl, fetchImpl);
	const response = await fetchImpl(
		ingestUrl,
		{
			method: "POST",
			headers:
			{
				authorization: `Bearer ${token}`,
				"content-type": "application/json",
			},
			body: JSON.stringify(
				{
					events,
				},
			),
		},
	);
	if (!response.ok)
	{
		throw new Error(`Ingest returned ${response.status}: ${await response.text()}`);
	}
};

/**
 * Posts one event, or buffers it while buffering is on. An event the Worker cannot take is buffered too, so a
 * Worker outage loses nothing: the drain replays it.
 */
export const dispatchEvent = async (
	dependencies: DispatchDependencies,
	event: IngestEvent,
): Promise<DispatchOutcome> =>
{
	if (await dependencies.buffer.isBuffering())
	{
		await dependencies.buffer.append(event);
		return "buffered";
	}
	try
	{
		await dependencies.transport.post([event]);
		return "posted";
	}
	catch
	{
		await dependencies.buffer.append(event);
		return "buffered-after-failure";
	}
};

/**
 * Replays the buffer oldest first, `batchSize` events per request, removing each batch once the Worker takes it.
 * It stops at the first failure, keeping that batch and everything after it in place.
 */
export const drainBuffer = async (
	dependencies: DispatchDependencies,
	batchSize = 100,
): Promise<
{
	replayed: number;
}> =>
{
	let replayed = 0;
	for (;;)
	{
		const batch = await dependencies.buffer.readOldest(batchSize);
		if (batch.length === 0)
		{
			return {
				replayed,
			};
		}
		await dependencies.transport.post(batch.map(([, event]) => event));
		await dependencies.buffer.remove(batch.map(([id]) => id));
		replayed += batch.length;
	}
};
