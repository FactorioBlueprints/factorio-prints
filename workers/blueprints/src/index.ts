import {drizzle} from "drizzle-orm/d1";
import {createGooglePublicKeyProvider} from "../../images/src/googlePublicKeys.ts";
import {GOOGLE_OAUTH_KEYS_URL, verifyServiceAccountToken} from "./auth/serviceAccountToken.ts";
import {applyEvent, type EventResult, type IngestDependencies} from "./ingest/applyEvent.ts";
import {parseIngestRequest} from "./ingest/events.ts";
import {reconcile} from "./reconcile/reconcile.ts";

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

const error = (message: string, status: number) =>
	json(
		{
			error: message,
		},
		status,
	);

const bearerToken = (request: Request) => /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];

/** True when the request carries an ID token minted for this Worker by an allowed service account. */
const isServiceAccount = async (request: Request, env: Env, options: WorkerOptions): Promise<boolean> =>
{
	const token = bearerToken(request);
	if (token === undefined) return false;
	const verification = await verifyServiceAccountToken(
		token,
		{
			audience: env.INGEST_AUDIENCE,
			allowedEmails: env.INGEST_SERVICE_ACCOUNTS.split(",").map((email) => email.trim()),
			now: options.now,
			publicKey: options.serviceAccountKeys,
		},
	);
	return verification.ok;
};

const readJson = async (
	request: Request,
): Promise<
	|
	  {
			ok: true;
			body: unknown;
	  }
	|
	  {
			ok: false;
	  }
> =>
{
	try
	{
		return {
			ok: true,
			body: await request.json(),
		};
	}
	catch
	{
		return {
			ok: false,
		};
	}
};

const ingestDependencies = (env: Env): IngestDependencies => (
{
	db: drizzle(env.DB),
	strings: env.BLUEPRINT_STRINGS,
});

const handleIngest = async (request: Request, env: Env): Promise<Response> =>
{
	const read = await readJson(request);
	if (!read.ok) return error("body is not JSON", 400);
	const parsed = parseIngestRequest(read.body);
	if (!parsed.ok) return error(parsed.error, 400);

	// In order, one unit of work each: a later event for the same row must see the earlier one's result.
	const dependencies = ingestDependencies(env);
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

const handleReconcile = async (request: Request, env: Env): Promise<Response> =>
{
	const read = await readJson(request);
	if (!read.ok) return error("body is not JSON", 400);
	const body = read.body as
	{
		mode?: unknown;
		expectedBlueprintKeys?: unknown;
		dumpTime?: unknown;
	};
	const mode = body.mode ?? "shadow";
	if (mode !== "shadow" && mode !== "repair") return error("mode must be shadow or repair", 400);
	const parsed = parseIngestRequest(read.body);
	if (!parsed.ok) return error(parsed.error, 400);
	const {expectedBlueprintKeys, dumpTime} = body;
	if (
		expectedBlueprintKeys !== undefined &&
		(!Array.isArray(expectedBlueprintKeys) || !expectedBlueprintKeys.every((key) => typeof key === "string"))
	)
	{
		return error("expectedBlueprintKeys must be an array of strings", 400);
	}
	if (dumpTime !== undefined && typeof dumpTime !== "number")
		return error("dumpTime must be epoch milliseconds", 400);

	return json(
		await reconcile(
			ingestDependencies(env),
			{
				mode,
				events: parsed.events,
				expectedBlueprintKeys: expectedBlueprintKeys as string[] | undefined,
				dumpTime,
			},
		),
	);
};

export const createWorker = (options: WorkerOptions) => (
{
	async fetch(request: Request, env: Env): Promise<Response>
	{
		const {pathname} = new URL(request.url);
		if (request.method === "POST" && (pathname === "/ingest" || pathname === "/reconcile"))
		{
			if (!(await isServiceAccount(request, env, options))) return error("unauthorized", 401);
			return pathname === "/ingest" ? handleIngest(request, env) : handleReconcile(request, env);
		}
		return error("not found", 404);
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
