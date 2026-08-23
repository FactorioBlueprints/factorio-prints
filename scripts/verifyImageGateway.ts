import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const immutableCacheControl = "public, max-age=31536000, immutable";
const fallbackCacheControl = "public, max-age=300";
const missingImageId = "factorioPrintsGatewayMissing0000000000000000";

interface GatewayRequest {
  contentType: string;
  path: string;
}

export interface GatewayVerificationResult {
  bodyBytes: number;
  cacheControl: string;
  contentType: string | null;
  etag: string | null;
  location: string | null;
  path: string;
  status: number;
}

type GatewayFetch = (
  input: string,
  init: { method: "GET"; redirect: "manual" },
) => Promise<Response>;

const knownImageRequests: readonly GatewayRequest[] = [
  {
    contentType: "image/png",
    path: "/legacy-imgur/00ez0nx/original.png",
  },
  {
    contentType: "image/jpeg",
    path: "/legacy-imgur/00ez0nx/thumbnail.jpeg",
  },
  {
    contentType: "image/jpeg",
    path: "/legacy-imgur/00ez0nx/large.jpeg",
  },
];

const parseGatewayOrigin = (value: string): string => {
  const url = new URL(value);
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new TypeError("Image gateway must be an HTTP origin without credentials or a path");
  }
  return url.origin;
};

const expectHeader = (response: Response, name: string, expected: string): void => {
  const actual = response.headers.get(name);
  if (actual !== expected) {
    throw new Error(`${name} was ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}`);
  }
};

const captureResponse = async (
  path: string,
  response: Response,
): Promise<GatewayVerificationResult> => ({
  bodyBytes: (await response.arrayBuffer()).byteLength,
  cacheControl: response.headers.get("cache-control") ?? "",
  contentType: response.headers.get("content-type"),
  etag: response.headers.get("etag"),
  location: response.headers.get("location"),
  path,
  status: response.status,
});

const verifyR2Hit = async (
  origin: string,
  request: GatewayRequest,
  gatewayFetch: GatewayFetch,
): Promise<GatewayVerificationResult> => {
  const response = await gatewayFetch(`${origin}${request.path}`, {
    method: "GET",
    redirect: "manual",
  });
  if (response.status !== 200) {
    throw new Error(`${request.path} returned ${response.status}; expected 200`);
  }
  expectHeader(response, "cache-control", immutableCacheControl);
  expectHeader(response, "content-type", request.contentType);
  expectHeader(response, "x-content-type-options", "nosniff");
  if (!response.headers.get("etag")) throw new Error(`${request.path} did not return an ETag`);

  const result = await captureResponse(request.path, response);
  if (result.bodyBytes === 0) throw new Error(`${request.path} returned an empty body`);
  return result;
};

const verifyFallback = async (
  origin: string,
  gatewayFetch: GatewayFetch,
): Promise<GatewayVerificationResult> => {
  const path = `/legacy-imgur/${missingImageId}/original.png`;
  const response = await gatewayFetch(`${origin}${path}`, {
    method: "GET",
    redirect: "manual",
  });
  if (response.status !== 307) throw new Error(`${path} returned ${response.status}; expected 307`);
  expectHeader(response, "cache-control", fallbackCacheControl);
  expectHeader(response, "location", `https://i.imgur.com/${missingImageId}.png`);
  return captureResponse(path, response);
};

const verifyInvalidPath = async (
  origin: string,
  gatewayFetch: GatewayFetch,
): Promise<GatewayVerificationResult> => {
  const path = "/legacy-imgur/invalid-id/original.png";
  const response = await gatewayFetch(`${origin}${path}`, {
    method: "GET",
    redirect: "manual",
  });
  if (response.status !== 404) throw new Error(`${path} returned ${response.status}; expected 404`);
  expectHeader(response, "cache-control", "no-store");
  expectHeader(response, "content-type", "text/plain; charset=UTF-8");
  const result = await captureResponse(path, response);
  if (result.bodyBytes !== 15) {
    throw new Error(`${path} returned ${result.bodyBytes} bytes; expected the 15-byte error body`);
  }
  return result;
};

export const verifyImageGateway = async (
  gatewayOrigin: string,
  gatewayFetch: GatewayFetch = fetch,
): Promise<GatewayVerificationResult[]> => {
  const origin = parseGatewayOrigin(gatewayOrigin);
  const results: GatewayVerificationResult[] = [];
  for (const request of knownImageRequests) {
    results.push(await verifyR2Hit(origin, request, gatewayFetch));
  }
  results.push(await verifyFallback(origin, gatewayFetch));
  results.push(await verifyInvalidPath(origin, gatewayFetch));
  return results;
};

const main = async (): Promise<void> => {
  if (process.argv.length !== 3) {
    throw new Error("Usage: node scripts/verifyImageGateway.ts <gateway-origin>");
  }
  const results = await verifyImageGateway(process.argv[2]!);
  console.log(
    JSON.stringify({ gatewayOrigin: parseGatewayOrigin(process.argv[2]!), results }, null, 2),
  );
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedModuleUrl) await main();
