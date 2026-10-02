import {
  deleteImgurImage,
  type ImgurCredentials,
  type ImgurDeleteResult,
  type ImgurDependencies,
  ImgurFailure,
  type ImgurTokenState,
  type ImgurUploadResult,
  uploadToImgur,
} from "./imgurClient.ts";

// Every Imgur call runs in this Durable Object. It is created in the `us` jurisdiction because
// Imgur has refused UK traffic since September 2025, and a Worker otherwise runs near its user.
// It also owns the account's token, so a refresh token Imgur rotates is never lost.

const tokenStorageKey = "imgur-token";

export interface StoredImgurToken {
  readonly seedHash: string;
  readonly state: ImgurTokenState;
}

export interface ImgurTokenStore {
  readonly load: () => Promise<ImgurTokenState>;
  readonly save: (state: ImgurTokenState) => Promise<void>;
}

interface ImgurSecrets {
  readonly IMGUR_CLIENT_ID?: string;
  readonly IMGUR_CLIENT_SECRET?: string;
  readonly IMGUR_REFRESH_TOKEN?: string;
}

// The seed is the refresh token from the last consent, set as a secret. A stored token wins while
// the seed is unchanged, because Imgur may have rotated it; a new seed means a new consent.
export const resolveStoredToken = async (
  stored: StoredImgurToken | undefined,
  seedRefreshToken: string,
  hash: (value: string) => Promise<string>,
): Promise<StoredImgurToken> => {
  const seedHash = await hash(seedRefreshToken);
  if (stored?.seedHash === seedHash) return stored;
  return {
    seedHash,
    state: { accessToken: null, accessTokenExpiresAt: 0, refreshToken: seedRefreshToken },
  };
};

const jsonResponse = (body: ImgurUploadResult | ImgurDeleteResult, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8" },
  });

export const handleImgurUploaderRequest = async (
  request: Request,
  store: ImgurTokenStore,
  credentials: ImgurCredentials | null,
  dependencies: ImgurDependencies,
): Promise<Response> => {
  const { pathname } = new URL(request.url);
  if (request.method !== "POST" || (pathname !== "/upload" && pathname !== "/delete")) {
    return new Response("Not found", { status: 404 });
  }
  if (!credentials) {
    return jsonResponse({
      ok: false,
      reason: ImgurFailure.Unauthorized,
      detail: "Imgur credentials are not configured",
    });
  }

  const state = await store.load();
  const outcome =
    pathname === "/upload"
      ? await uploadToImgur(
          new Uint8Array(await request.arrayBuffer()),
          request.headers.get("content-type") ?? "application/octet-stream",
          state,
          credentials,
          dependencies,
        )
      : await deleteImgurImage(
          ((await request.json()) as { deletehash: string }).deletehash,
          state,
          credentials,
          dependencies,
        );
  if (outcome.state !== state) await store.save(outcome.state);
  return jsonResponse(outcome.result);
};

const sha256 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export class ImgurUploader implements DurableObject {
  // Imgur calls run one at a time, so two requests never renew the token at once and race to
  // store different rotated refresh tokens.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly state: DurableObjectState,
    private readonly environment: Env,
  ) {}

  fetch(request: Request): Promise<Response> {
    const run = this.queue.then(() => this.handle(request));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async handle(request: Request): Promise<Response> {
    const secrets = this.environment as Env & ImgurSecrets;
    const seed = secrets.IMGUR_REFRESH_TOKEN;
    const credentials =
      secrets.IMGUR_CLIENT_ID && secrets.IMGUR_CLIENT_SECRET && seed
        ? { clientId: secrets.IMGUR_CLIENT_ID, clientSecret: secrets.IMGUR_CLIENT_SECRET }
        : null;

    const storage = this.state.storage;
    const store: ImgurTokenStore = {
      load: async () => {
        const resolved = await resolveStoredToken(
          await storage.get<StoredImgurToken>(tokenStorageKey),
          seed ?? "",
          sha256,
        );
        await storage.put(tokenStorageKey, resolved);
        return resolved.state;
      },
      save: async (next) => {
        const current = await storage.get<StoredImgurToken>(tokenStorageKey);
        await storage.put(tokenStorageKey, { seedHash: current?.seedHash ?? "", state: next });
      },
    };

    return handleImgurUploaderRequest(request, store, credentials, {
      fetch: (input, init) => fetch(input, init),
      now: () => Date.now(),
      sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    });
  }
}

const accountObjectName = "factorio-blueprints-account";

const uploaderStub = (namespace: DurableObjectNamespace): DurableObjectStub => {
  const us = namespace.jurisdiction("us");
  return us.get(us.idFromName(accountObjectName));
};

export const uploadThroughImgurUploader = async (
  namespace: DurableObjectNamespace,
  bytes: Uint8Array,
  contentType: string,
): Promise<ImgurUploadResult> => {
  const response = await uploaderStub(namespace).fetch("https://imgur-uploader/upload", {
    method: "POST",
    headers: { "content-type": contentType },
    body: bytes,
  });
  return (await response.json()) as ImgurUploadResult;
};

export const deleteThroughImgurUploader = async (
  namespace: DurableObjectNamespace,
  deletehash: string,
): Promise<ImgurDeleteResult> => {
  const response = await uploaderStub(namespace).fetch("https://imgur-uploader/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deletehash }),
  });
  return (await response.json()) as ImgurDeleteResult;
};
