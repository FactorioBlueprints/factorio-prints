import {drizzle} from "drizzle-orm/d1";
import {createGooglePublicKeyProvider} from "../../images/src/googlePublicKeys.ts";
import {GOOGLE_OAUTH_KEYS_URL, verifyServiceAccountToken} from "./auth/serviceAccountToken.ts";
import {applyEvent, type EventResult} from "./ingest/applyEvent.ts";
import {parseIngestRequest} from "./ingest/events.ts";

export interface WorkerOptions
{
	/** Epoch seconds, for token checks. */
	now: () => number;
	/** Google's OAuth signing keys by key id. */
	serviceAccountKeys: (keyId: string) => Promise<CryptoKey | null>;
}

const json = (body: unknown, status = 200) =>
	new Response(
		JSON.stringify(body),
		{
			status,
			headers:
			{
				"content-type": "application/json; charset=utf-8",
			},
		},
	);

const bearerToken = (request: Request) =>
{
	const match = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "");
	return match?.[1];
};

const handleIngest = async (request: Request, env: Env, options: WorkerOptions): Promise<Response> =>
{
	const token = bearerToken(request);
	const verification =
		token === undefined
			? undefined
			: await verifyServiceAccountToken(
					token,
					{
						audience: env.INGEST_AUDIENCE,
						allowedEmails: env.INGEST_SERVICE_ACCOUNTS.split(",").map((email) => email.trim()),
						now: options.now,
						publicKey: options.serviceAccountKeys,
					},
				);
	if (!verification?.ok)
	{
		return json(
			{
				error: "unauthorized",
			},
			401,
		);
	}

	let body: unknown;
	try
	{
		body = await request.json();
	}
	catch
	{
		return json(
			{
				error: "body is not JSON",
			},
			400,
		);
	}
	const parsed = parseIngestRequest(body);
	if (!parsed.ok)
	{
		return json(
			{
				error: parsed.error,
			},
			400,
		);
	}

	// In order, one unit of work each: a later event for the same row must see the earlier one's result.
	const dependencies =
	{
		db: drizzle(env.DB),
		strings: env.BLUEPRINT_STRINGS,
	};
	const results: EventResult[] = [];
	for (const event of parsed.events)
	{
		results.push(await applyEvent(dependencies, event));
	}
	return json(
		{
			results,
		},
	);
};

export const createWorker = (options: WorkerOptions) => (
{
	async fetch(request: Request, env: Env): Promise<Response>
	{
		const {pathname} = new URL(request.url);
		if (pathname === "/ingest" && request.method === "POST") return handleIngest(request, env, options);
		return json(
			{
				error: "not found",
			},
			404,
		);
	},
});

const nowSeconds = () => Math.floor(Date.now() / 1000);

export default createWorker(
	{
		now: nowSeconds,
		serviceAccountKeys: createGooglePublicKeyProvider(
			{
				fetch: (url) => fetch(url),
				now: nowSeconds,
				url: GOOGLE_OAUTH_KEYS_URL,
			},
		),
	},
) satisfies ExportedHandler<Env>;
