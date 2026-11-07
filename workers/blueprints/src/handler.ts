import {deleteBlueprint, readBlueprint, upsertBlueprint, type BlueprintStorage} from "./blueprintStore.ts";

export interface HandlerDependencies
{
	storage: BlueprintStorage;
	ingestSecret: string;
	store:
	{
		read: typeof readBlueprint;
		upsert: typeof upsertBlueprint;
		remove: typeof deleteBlueprint;
	};
}

export const defaultStore =
{
	read: readBlueprint,
	upsert: upsertBlueprint,
	remove: deleteBlueprint,
};

const readPathPattern = /^\/blueprints\/([^/]+)\.json$/;
const ingestPathPattern = /^\/ingest\/blueprints\/([^/]+)$/;
const pushKeyPattern = /^[-A-Za-z0-9_]{1,40}$/;

const corsHeaders =
{
	"access-control-allow-origin": "*",
};

const plain = (status: number, message: string): Response =>
	new Response(
		message,
		{
			status,
			headers:
			{
				...corsHeaders,
				"cache-control": "no-store",
			},
		},
	);

const decodeId = (raw: string): string | null =>
{
	try
	{
		const decoded = decodeURIComponent(raw);
		return pushKeyPattern.test(decoded) ? decoded : null;
	}
	catch
	{
		return null;
	}
};

const digest = async (value: string): Promise<Uint8Array> =>
	new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));

const secretMatches = async (header: string | null, secret: string): Promise<boolean> =>
{
	const [expected, actual] = await Promise.all([digest(`Bearer ${secret}`), digest(header ?? "")]);
	let difference = 0;
	for (let index = 0; index < expected.length; index++)
	{
		difference |= expected[index] ^ actual[index];
	}
	return difference === 0;
};

const handleRead = async (
	request: Request,
	blueprintId: string,
	dependencies: HandlerDependencies,
): Promise<Response> =>
{
	try
	{
		const blueprint = await dependencies.store.read(dependencies.storage, blueprintId);
		if (blueprint === null)
		{
			return plain(404, "Blueprint not found");
		}
		return new Response(
			request.method === "HEAD" ? null : JSON.stringify(blueprint),
			{
				headers:
				{
					...corsHeaders,
					"content-type": "application/json; charset=utf-8",
					"cache-control": "public, max-age=60",
				},
			},
		);
	}
	catch
	{
		return plain(502, "Blueprint storage unavailable");
	}
};

const handleIngest = async (
	request: Request,
	blueprintId: string,
	dependencies: HandlerDependencies,
): Promise<Response> =>
{
	if (dependencies.ingestSecret === "")
	{
		return plain(503, "Ingest is not configured");
	}
	if (!(await secretMatches(request.headers.get("authorization"), dependencies.ingestSecret)))
	{
		return plain(401, "Unauthorized");
	}

	if (request.method === "DELETE")
	{
		await dependencies.store.remove(dependencies.storage, blueprintId);
		return new Response(
			null,
			{
				status: 204,
			},
		);
	}

	if (request.method !== "PUT")
	{
		return plain(405, "Method not allowed");
	}

	let body: unknown;
	try
	{
		body = await request.json();
	}
	catch
	{
		return plain(400, "Body must be JSON");
	}
	if (typeof body !== "object" || body === null || Array.isArray(body))
	{
		return plain(400, "Body must be a JSON object");
	}
	if (
		typeof (
			body as
			{
				lastUpdatedDate?: unknown;
			}
		).lastUpdatedDate !== "number"
	)
	{
		return plain(400, "Body must have a numeric lastUpdatedDate");
	}

	const applied = await dependencies.store.upsert(dependencies.storage, blueprintId, body as Record<string, unknown>);
	return Response.json(
		{
			applied,
		},
	);
};

export const handleRequest = async (request: Request, dependencies: HandlerDependencies): Promise<Response> =>
{
	const pathname = new URL(request.url).pathname;

	const ingestMatch = ingestPathPattern.exec(pathname);
	if (ingestMatch)
	{
		const blueprintId = decodeId(ingestMatch[1]);
		return blueprintId === null
			? plain(400, "Invalid blueprint id")
			: handleIngest(request, blueprintId, dependencies);
	}

	const readMatch = readPathPattern.exec(pathname);
	if (!readMatch)
	{
		return plain(404, "Not found");
	}
	if (request.method !== "GET" && request.method !== "HEAD")
	{
		return plain(405, "Method not allowed");
	}
	const blueprintId = decodeId(readMatch[1]);
	return blueprintId === null ? plain(400, "Invalid blueprint id") : handleRead(request, blueprintId, dependencies);
};
