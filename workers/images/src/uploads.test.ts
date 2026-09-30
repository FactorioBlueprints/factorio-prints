import { describe, expect, it, vi } from "vitest";
import { IdTokenRejection, type IdTokenVerification } from "./firebaseAuth.ts";
import { ImgurFailure, type ImgurDeleteResult, type ImgurUploadResult } from "./imgurClient.ts";
import { maximumImageBytes, maximumImageDimension } from "./imageValidation.ts";
import { handleUploadRequest, type UploadDependencies } from "./uploads.ts";

const ownerId = "firebase-user-id";
const uploadedAt = 1_800_000_000_000;
const fallbackId = "Fallback0123456789Ab";
const siteOrigin = "https://factorioprints.com";

const pngBytes = (width = 320, height = 240): Uint8Array => {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
};

const createEnvironment = (put = vi.fn().mockResolvedValue({})) => {
  const writeDataPoint = vi.fn();
  const environment = {
    IMAGES: { put },
    IMAGE_GATEWAY_METRICS: { writeDataPoint },
    UPLOAD_ALLOWED_ORIGINS: `${siteOrigin}, https://www.factorioprints.com`,
  } as unknown as Env;
  return { environment, put, writeDataPoint };
};

const accepted: IdTokenVerification = { ok: true, identity: { userId: ownerId } };
const imgurUploaded: ImgurUploadResult = { ok: true, id: "AbCdE12", deletehash: "delete-hash" };

interface DependencyOptions {
  readonly imgur?: ImgurUploadResult | Error;
  readonly quotaAllows?: boolean;
  readonly verification?: IdTokenVerification;
}

const createDependencies = (options: DependencyOptions = {}) => {
  const imgur = options.imgur ?? imgurUploaded;
  return {
    deleteFromImgur: vi.fn(async (): Promise<ImgurDeleteResult> => ({ ok: true })),
    consumeUploadQuota: vi.fn(async () => options.quotaAllows ?? true),
    newFallbackId: () => fallbackId,
    now: () => uploadedAt,
    uploadToImgur: vi.fn(async (): Promise<ImgurUploadResult> => {
      if (imgur instanceof Error) throw imgur;
      return imgur;
    }),
    verifyIdToken: vi.fn(async () => options.verification ?? accepted),
  } satisfies UploadDependencies;
};

interface RequestOptions {
  readonly authorization?: string | null;
  readonly body?: Uint8Array;
  readonly contentLength?: string | null;
  readonly method?: string;
  readonly origin?: string | null;
}

const createRequest = (options: RequestOptions = {}): Request => {
  const body = options.body ?? pngBytes();
  const headers = new Headers();
  const authorization =
    options.authorization === undefined ? "Bearer token" : options.authorization;
  if (authorization !== null) headers.set("authorization", authorization);
  const contentLength =
    options.contentLength === undefined ? String(body.length) : options.contentLength;
  if (contentLength !== null) headers.set("content-length", contentLength);
  const origin = options.origin === undefined ? siteOrigin : options.origin;
  if (origin !== null) headers.set("origin", origin);

  const method = options.method ?? "POST";
  return new Request("https://images.factorioprints.com/uploads", {
    method,
    headers,
    ...(method === "POST" ? { body } : {}),
  });
};

describe("upload CORS", () => {
  it("answers a preflight from the site", async () => {
    const { environment } = createEnvironment();

    const response = await handleUploadRequest(
      createRequest({ method: "OPTIONS" }),
      environment,
      createDependencies(),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(siteOrigin);
    expect(response.headers.get("access-control-allow-methods")).toBe("POST");
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "authorization, content-type",
    );
    expect(response.headers.get("vary")).toBe("origin");
  });

  it("refuses a preflight or upload from any other origin", async () => {
    const { environment, put } = createEnvironment();
    const dependencies = createDependencies();

    const preflight = await handleUploadRequest(
      createRequest({ method: "OPTIONS", origin: "https://example.com" }),
      environment,
      dependencies,
    );
    const upload = await handleUploadRequest(
      createRequest({ origin: "https://example.com" }),
      environment,
      dependencies,
    );

    expect(preflight.status).toBe(403);
    expect(preflight.headers.has("access-control-allow-origin")).toBe(false);
    expect(upload.status).toBe(403);
    expect(put).not.toHaveBeenCalled();
    expect(dependencies.verifyIdToken).not.toHaveBeenCalled();
  });

  it("marks every answer to the site as readable by it", async () => {
    const { environment } = createEnvironment();

    const response = await handleUploadRequest(
      createRequest({ authorization: null }),
      environment,
      createDependencies(),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("access-control-allow-origin")).toBe(siteOrigin);
  });
});

describe("upload validation", () => {
  it("allows only POST besides the preflight", async () => {
    const { environment } = createEnvironment();

    const response = await handleUploadRequest(
      createRequest({ method: "GET" }),
      environment,
      createDependencies(),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST, OPTIONS");
  });

  it("requires a verified Firebase ID token", async () => {
    const { environment } = createEnvironment();
    const dependencies = createDependencies({
      verification: { ok: false, reason: IdTokenRejection.Expired },
    });

    const missing = await handleUploadRequest(
      createRequest({ authorization: null }),
      environment,
      dependencies,
    );
    const rejected = await handleUploadRequest(createRequest(), environment, dependencies);

    expect(missing.status).toBe(401);
    expect(rejected.status).toBe(401);
    expect(dependencies.uploadToImgur).not.toHaveBeenCalled();
  });

  it("requires a Content-Length within the limit before reading the body", async () => {
    const { environment } = createEnvironment();
    const dependencies = createDependencies();

    const missing = await handleUploadRequest(
      createRequest({ contentLength: null }),
      environment,
      dependencies,
    );
    const tooLarge = await handleUploadRequest(
      createRequest({ contentLength: String(maximumImageBytes + 1) }),
      environment,
      dependencies,
    );

    expect(missing.status).toBe(411);
    expect(tooLarge.status).toBe(413);
  });

  it("rejects bytes that are not an acceptable image", async () => {
    const { environment } = createEnvironment();
    const dependencies = createDependencies();

    const notImage = await handleUploadRequest(
      createRequest({ body: new TextEncoder().encode("not an image at all") }),
      environment,
      dependencies,
    );
    const tooWide = await handleUploadRequest(
      createRequest({ body: pngBytes(maximumImageDimension + 1, 10) }),
      environment,
      dependencies,
    );

    expect(notImage.status).toBe(415);
    expect(tooWide.status).toBe(422);
    expect(dependencies.uploadToImgur).not.toHaveBeenCalled();
  });
});

describe("upload hourly limit", () => {
  it("answers 429 once the user reaches the hourly limit, before calling Imgur", async () => {
    const { environment, put } = createEnvironment();
    const dependencies = createDependencies({ quotaAllows: false });

    const response = await handleUploadRequest(createRequest(), environment, dependencies);

    expect(response.status).toBe(429);
    expect(dependencies.consumeUploadQuota).toHaveBeenCalledWith(ownerId);
    expect(dependencies.uploadToImgur).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("answers a readable 503 when the quota cannot be checked", async () => {
    const { environment } = createEnvironment();
    const dependencies = createDependencies();
    dependencies.consumeUploadQuota.mockRejectedValue(new Error("Durable Object reset"));

    const response = await handleUploadRequest(createRequest(), environment, dependencies);

    expect(response.status).toBe(503);
    expect(response.headers.get("access-control-allow-origin")).toBe(siteOrigin);
    expect(dependencies.uploadToImgur).not.toHaveBeenCalled();
  });

  it("does not count an upload that fails validation", async () => {
    const { environment } = createEnvironment();
    const dependencies = createDependencies();

    await handleUploadRequest(
      createRequest({ body: new TextEncoder().encode("not an image at all") }),
      environment,
      dependencies,
    );

    expect(dependencies.consumeUploadQuota).not.toHaveBeenCalled();
  });
});

describe("upload storage", () => {
  it("stores the image in R2 under the id Imgur assigned", async () => {
    const { environment, put, writeDataPoint } = createEnvironment();
    const dependencies = createDependencies();
    const bytes = pngBytes();

    const response = await handleUploadRequest(
      createRequest({ body: bytes }),
      environment,
      dependencies,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "AbCdE12", type: "image/png" });
    expect(dependencies.uploadToImgur).toHaveBeenCalledWith(bytes, "image/png");
    expect(put).toHaveBeenCalledWith("legacy-imgur/AbCdE12/original", bytes, {
      httpMetadata: {
        cacheControl: "public, max-age=31536000, immutable",
        contentType: "image/png",
      },
      customMetadata: expect.objectContaining({
        height: "240",
        imgurDeletehash: "delete-hash",
        origin: "upload",
        ownerId,
        uploadedAt: new Date(uploadedAt).toISOString(),
        width: "320",
      }),
      sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({ blobs: ["accepted", "imgur", "png", ownerId] }),
    );
  });

  it("falls back to an R2-only id when Imgur fails", async () => {
    const { environment, put, writeDataPoint } = createEnvironment();
    const dependencies = createDependencies({
      imgur: { ok: false, reason: ImgurFailure.Unauthorized, detail: "token refresh returned 400" },
    });

    const response = await handleUploadRequest(createRequest(), environment, dependencies);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: fallbackId, type: "image/png" });
    const [key, , options] = put.mock.calls[0] as [string, Uint8Array, R2PutOptions];
    expect(key).toBe(`legacy-imgur/${fallbackId}/original`);
    expect(options.customMetadata).toMatchObject({
      imgurFailure: "unauthorized",
      origin: "upload",
    });
    expect(options.customMetadata).not.toHaveProperty("imgurDeletehash");
    expect(writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({ blobs: ["accepted", "fallback:unauthorized", "png", ownerId] }),
    );
  });

  it("falls back when the Imgur uploader cannot be reached at all", async () => {
    const { environment } = createEnvironment();
    const dependencies = createDependencies({ imgur: new Error("Durable Object unavailable") });

    const response = await handleUploadRequest(createRequest(), environment, dependencies);

    expect(await response.json()).toEqual({ id: fallbackId, type: "image/png" });
  });

  it("deletes the Imgur copy when the R2 write fails, so the two never disagree", async () => {
    const { environment } = createEnvironment(vi.fn().mockRejectedValue(new Error("R2 down")));
    const dependencies = createDependencies();

    const response = await handleUploadRequest(createRequest(), environment, dependencies);

    expect(response.status).toBe(503);
    expect(dependencies.deleteFromImgur).toHaveBeenCalledWith("delete-hash");
  });

  it("answers 503 when R2 fails after an Imgur failure too", async () => {
    const { environment } = createEnvironment(vi.fn().mockRejectedValue(new Error("R2 down")));
    const dependencies = createDependencies({
      imgur: { ok: false, reason: ImgurFailure.Unavailable, detail: "upload returned 503" },
    });

    const response = await handleUploadRequest(createRequest(), environment, dependencies);

    expect(response.status).toBe(503);
    expect(dependencies.deleteFromImgur).not.toHaveBeenCalled();
  });
});
