import {drizzle} from "drizzle-orm/d1";
import {verifyFirebaseIdToken} from "../../images/src/firebaseAuth.ts";
import {createGooglePublicKeyProvider} from "../../images/src/googlePublicKeys.ts";
import {GOOGLE_OAUTH_KEYS_URL, verifyServiceAccountToken} from "./auth/serviceAccountToken.ts";
import {applyEvent, type EventResult, type IngestDependencies} from "./ingest/applyEvent.ts";
import {parseIngestRequest} from "./ingest/events.ts";
import {readBlueprint, readSummaries, type SummaryQuery} from "./read/blueprintReads.ts";
import {blueprintHistory, isModerator, restoreBlueprint} from "./read/moderation.ts";
import {reconcile} from "./reconcile/reconcile.ts";

export interface WorkerOptions
{
	/** Epoch milliseconds: token checks, and the timestamp of a moderator's restore. */
	now: () => number;
	/** Google's OAuth signing keys by key id. */
	serviceAccountKeys: (keyId: string) => Promise<CryptoKey | null>;
	/** Firebase Auth's securetoken signing keys by key id, for moderators' ID tokens. */
	firebaseKeys: (keyId: string) => Promise<CryptoKey | null>;
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
			now: () => Math.floor(options.now() / 1000),
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
		amendAudit?: unknown;
	};
	const mode = body.mode ?? "shadow";
	if (mode !== "shadow" && mode !== "repair") return error("mode must be shadow or repair", 400);
	const parsed = parseIngestRequest(read.body);
	if (!parsed.ok) return error(parsed.error, 400);
	const {expectedBlueprintKeys, dumpTime, amendAudit} = body;
	if (amendAudit !== undefined && typeof amendAudit !== "boolean")
	{
		return error("amendAudit must be a boolean", 400);
	}
	if (
		expectedBlueprintKeys !== undefined &&
		(!Array.isArray(expectedBlueprintKeys) || !expectedBlueprintKeys.every((key) => typeof key === "string"))
	)
	{
		return error("expectedBlueprintKeys must be an array of strings", 400);
	}
	if (dumpTime !== undefined && typeof dumpTime !== "number")
	{
		return error("dumpTime must be epoch milliseconds", 400);
	}

	return json(
		await reconcile(
			ingestDependencies(env),
			{
				mode,
				events: parsed.events,
				expectedBlueprintKeys: expectedBlueprintKeys as string[] | undefined,
				dumpTime,
				amendAudit,
			},
		),
	);
};

const handleBlueprint = async (request: Request, env: Env, key: string): Promise<Response> =>
{
	const found = await readBlueprint(drizzle(env.DB), env.BLUEPRINT_STRINGS, key);
	if (found === undefined) return error("not found", 404);
	const etag = `"${found.lastUpdated}"`;
	if (request.headers.get("if-none-match") === etag)
	{
		return new Response(
			null,
			{
				status: 304,
				headers:
				{
					etag,
				},
			},
		);
	}
	const response = json(found.blueprint);
	response.headers.set("etag", etag);
	return response;
};

const MAX_PAGE_SIZE = 1000;

const handleSummaries = async (url: URL, env: Env): Promise<Response> =>
{
	const parameters = url.searchParams;
	const orderBy = parameters.get("orderBy") ?? "lastUpdatedDate";
	if (orderBy !== "lastUpdatedDate" && orderBy !== "numberOfFavorites")
	{
		return error("orderBy must be lastUpdatedDate or numberOfFavorites", 400);
	}
	const limit = Number(parameters.get("limit") ?? 60);
	if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE)
	{
		return error(`limit must be between 1 and ${MAX_PAGE_SIZE}`, 400);
	}
	const query: SummaryQuery =
	{
		orderBy,
		limit,
	};
	const endBeforeValue = parameters.get("endBeforeValue");
	const endBeforeKey = parameters.get("endBeforeKey");
	if (endBeforeValue !== null && endBeforeKey !== null)
	{
		query.endBefore =
		{
			value: Number(endBeforeValue),
			key: endBeforeKey,
		};
	}
	const since = parameters.get("since");
	if (since !== null) query.since = Number(since);
	return json(await readSummaries(env.DB, query));
};

/** The moderator's user id, or the error response to send. */
const authenticateModerator = async (
	request: Request,
	env: Env,
	options: WorkerOptions,
): Promise<
	|
	  {
			userId: string;
	  }
	|
	  {
			response: Response;
	  }
> =>
{
	const token = bearerToken(request);
	if (token === undefined)
	{
		return {
			response: error("unauthorized", 401),
		};
	}
	const verification = await verifyFirebaseIdToken(
		token,
		{
			projectId: env.FIREBASE_PROJECT_ID,
			now: () => Math.floor(options.now() / 1000),
			publicKey: options.firebaseKeys,
		},
	);
	if (!verification.ok)
	{
		return {
			response: error("unauthorized", 401),
		};
	}
	const {userId} = verification.identity;
	if (!(await isModerator(drizzle(env.DB), userId)))
	{
		return {
			response: error("moderator access is required", 403),
		};
	}
	return {
		userId,
	};
};

const handleModerator = async (
	request: Request,
	env: Env,
	options: WorkerOptions,
	key: string,
	action: string,
): Promise<Response> =>
{
	const moderator = await authenticateModerator(request, env, options);
	if ("response" in moderator) return moderator.response;
	const db = drizzle(env.DB);
	if (action === "history" && request.method === "GET")
	{
		return json(
			{
				versions: await blueprintHistory(db, key),
			},
		);
	}
	if (action === "restore" && request.method === "POST")
	{
		const result = await restoreBlueprint(db, key, moderator.userId, options.now());
		switch (result.status)
		{
			case "restored":
				return json(
					{
						restored: key,
						version: result.version,
					},
				);
			case "not-found":
				return error("not found", 404);
			case "not-deleted":
				return error("blueprint is not deleted", 409);
			case "conflict":
				return error("blueprint changed during the restore; try again", 409);
		}
	}
	return error("not found", 404);
};

const BLUEPRINT_PATH = /^\/blueprints\/([^/]+)$/;
const MODERATOR_PATH = /^\/moderator\/blueprints\/([^/]+)\/(history|restore)$/;

/** The public read routes, which answer GET and HEAD. */
const handleRead = async (request: Request, url: URL, env: Env): Promise<Response> =>
{
	if (url.pathname === "/blueprintSummaries") return handleSummaries(url, env);
	const blueprintMatch = BLUEPRINT_PATH.exec(url.pathname);
	if (blueprintMatch !== null) return handleBlueprint(request, env, decodeURIComponent(blueprintMatch[1]));
	return error("not found", 404);
};

/** Every message in an error's chain of causes: a query builder wraps the database's own error, which says why. */
const causeChain = (thrown: unknown): string =>
{
	const messages: string[] = [];
	for (let current = thrown; current !== undefined && current !== null && messages.length < 10;)
	{
		messages.push(current instanceof Error ? `${current.name}: ${current.message}` : String(current));
		current = current instanceof Error ? current.cause : undefined;
	}
	return messages.join(" <- ");
};

const createRoutes = (options: WorkerOptions) => (
{
	async fetch(request: Request, env: Env): Promise<Response>
	{
		const url = new URL(request.url);
		const {pathname} = url;
		if (request.method === "POST" && (pathname === "/ingest" || pathname === "/reconcile"))
		{
			if (!(await isServiceAccount(request, env, options))) return error("unauthorized", 401);
			return pathname === "/ingest" ? handleIngest(request, env) : handleReconcile(request, env);
		}
		const moderatorMatch = MODERATOR_PATH.exec(pathname);
		if (moderatorMatch !== null)
		{
			return handleModerator(request, env, options, decodeURIComponent(moderatorMatch[1]), moderatorMatch[2]);
		}
		if (request.method === "GET") return handleRead(request, url, env);
		if (request.method === "HEAD")
		{
			// The status and headers of the same GET, without its body.
			const response = await handleRead(request, url, env);
			return new Response(null, response);
		}
		return error("not found", 404);
	},
});

/**
 * The Worker: its routes, with a failure of the store (the database is briefly unavailable after a long query, for
 * one) logged with its full cause and answered as a JSON 503 rather than an opaque platform error page.
 */
export const createWorker = (options: WorkerOptions) =>
{
	const routes = createRoutes(options);
	return {
		async fetch(request: Request, env: Env): Promise<Response>
		{
			try
			{
				return await routes.fetch(request, env);
			}
			catch (thrown)
			{
				console.error(`${request.method} ${new URL(request.url).pathname} failed: ${causeChain(thrown)}`);
				return error("the blueprint store is unavailable", 503);
			}
		},
	};
};

const nowSeconds = () => Math.floor(Date.now() / 1000);

export default createWorker(
	{
		now: Date.now,
		serviceAccountKeys: createGooglePublicKeyProvider(
			{
				fetch: (url) => fetch(url),
				now: nowSeconds,
				url: GOOGLE_OAUTH_KEYS_URL,
			},
		),
		firebaseKeys: createGooglePublicKeyProvider(
			{
				fetch: (url) => fetch(url),
				now: nowSeconds,
			},
		),
	},
) satisfies ExportedHandler<Env>;
