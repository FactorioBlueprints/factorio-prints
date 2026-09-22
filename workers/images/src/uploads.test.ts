import { describe, expect, it, vi } from "vitest";
import { IdTokenRejection, type IdTokenVerification } from "./firebaseAuth.ts";
import { maximumImageBytes, maximumImageDimension } from "./imageValidation.ts";
import { handleUploadRequest } from "./uploads.ts";

const imageId = "0123456789abcdef0123456789abcdef";
const ownerId = "firebase-user-id";
const uploadedAt = 1_800_000_000_000;

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

interface EnvironmentOptions {
  readonly put?: ReturnType<typeof vi.fn>;
  readonly uploadsEnabled?: boolean;
}

interface TestEnvironment {
  environment: Env;
  put: ReturnType<typeof vi.fn>;
  writeDataPoint: ReturnType<typeof vi.fn>;
}

const createEnvironment = (options: EnvironmentOptions = {}): TestEnvironment => {
  const put = options.put ?? vi.fn().mockResolvedValue({});
  const writeDataPoint = vi.fn();
  const environment = {
    FIREBASE_PROJECT_ID: "facorio-blueprints",
    IMAGES: { put },
    IMAGE_GATEWAY_METRICS: { writeDataPoint },
    LEGACY_R2_READS_ENABLED: "true",
    UPLOADS_ENABLED: options.uploadsEnabled === false ? "false" : "true",
  } as unknown as Env;
  return { environment, put, writeDataPoint };
};

const accepted: IdTokenVerification = { ok: true, identity: { userId: ownerId } };

const createDependencies = (verification: IdTokenVerification = accepted) => ({
  newImageId: () => imageId,
  now: () => uploadedAt,
  verifyIdToken: vi.fn().mockResolvedValue(verification),
});

interface RequestOptions {
  readonly authorization?: string | null;
  readonly body?: Uint8Array;
  readonly contentLength?: string | null;
  readonly method?: string;
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

  const method = options.method ?? "POST";
  return new Request("https://images.factorioprints.com/uploads", {
    method,
    headers,
    ...(method === "GET" || method === "HEAD" ? {} : { body }),
  });
};

const upload = (
  options: RequestOptions = {},
  environment?: TestEnvironment,
  verification?: IdTokenVerification,
) => {
  const testEnvironment = environment ?? createEnvironment();
  return handleUploadRequest(
    createRequest(options),
    testEnvironment.environment,
    createDependencies(verification),
  );
};

describe("handleUploadRequest", () => {
  it("stores the original bytes and returns an opaque image reference", async () => {
    const testEnvironment = createEnvironment();
    const bytes = pngBytes(1920, 1080);

    const response = await upload({ body: bytes }, testEnvironment);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ source: "r2", id: imageId, type: "image/png" });
  });

  it("writes the original to a server-generated key with provenance metadata", async () => {
    const testEnvironment = createEnvironment();
    const bytes = pngBytes(640, 480);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    await upload({ body: bytes }, testEnvironment);

    expect(testEnvironment.put).toHaveBeenCalledOnce();
    const [key, storedBody, putOptions] = testEnvironment.put.mock.calls[0];
    expect(key).toBe(`uploads/published/${imageId}/original`);
    expect(new Uint8Array(storedBody)).toEqual(bytes);
    expect(putOptions).toEqual({
      httpMetadata: {
        cacheControl: "public, max-age=31536000, immutable",
        contentType: "image/png",
      },
      customMetadata: {
        height: "480",
        ownerId,
        sha256,
        uploadedAt: new Date(uploadedAt).toISOString(),
        width: "640",
      },
      sha256,
    });
  });

  it("records an accepted upload metric", async () => {
    const testEnvironment = createEnvironment();

    await upload({}, testEnvironment);

    expect(testEnvironment.writeDataPoint).toHaveBeenCalledWith({
      indexes: ["factorio-prints-image-upload"],
      blobs: ["accepted", "stored", "png", ownerId],
      doubles: [24],
    });
  });

  it("responds 404 while uploads are disabled", async () => {
    const testEnvironment = createEnvironment({ uploadsEnabled: false });

    const response = await upload({}, testEnvironment);

    expect(response.status).toBe(404);
    expect(testEnvironment.put).not.toHaveBeenCalled();
  });

  it.each([["GET"], ["PUT"], ["DELETE"]])("rejects the %s method", async (method) => {
    const response = await upload({ method });

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it.each([
    ["a missing authorization header", null],
    ["a non-bearer authorization header", "Basic abc123"],
    ["an empty bearer token", "Bearer "],
  ])("responds 401 to %s", async (_description, authorization) => {
    const testEnvironment = createEnvironment();

    const response = await upload({ authorization }, testEnvironment);

    expect(response.status).toBe(401);
    expect(testEnvironment.put).not.toHaveBeenCalled();
  });

  it("responds 401 when the identity token does not verify", async () => {
    const testEnvironment = createEnvironment();

    const response = await upload({}, testEnvironment, {
      ok: false,
      reason: IdTokenRejection.Expired,
    });

    expect(response.status).toBe(401);
    expect(testEnvironment.put).not.toHaveBeenCalled();
  });

  it("responds 411 when the content length is missing", async () => {
    const response = await upload({ contentLength: null });

    expect(response.status).toBe(411);
  });

  it("responds 413 when the declared content length exceeds the limit", async () => {
    const testEnvironment = createEnvironment();

    const response = await upload(
      { contentLength: String(maximumImageBytes + 1) },
      testEnvironment,
    );

    expect(response.status).toBe(413);
    expect(testEnvironment.put).not.toHaveBeenCalled();
  });

  it("responds 415 to a body that is not a supported image", async () => {
    const response = await upload({ body: new TextEncoder().encode("<!doctype html>") });

    expect(response.status).toBe(415);
  });

  it("responds 422 to an image beyond the dimension limit", async () => {
    const response = await upload({ body: pngBytes(maximumImageDimension + 1, 10) });

    expect(response.status).toBe(422);
  });

  it("responds 400 to an empty body", async () => {
    const response = await upload({ body: new Uint8Array(0), contentLength: "0" });

    expect(response.status).toBe(400);
  });

  it("responds 503 when the object store write fails", async () => {
    const put = vi.fn().mockRejectedValue(new Error("R2 is unavailable"));
    const testEnvironment = createEnvironment({ put });

    const response = await upload({}, testEnvironment);

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
  });
});
