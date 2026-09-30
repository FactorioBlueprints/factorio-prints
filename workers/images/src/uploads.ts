import type { IdTokenVerification } from "./firebaseAuth.ts";
import { type ImgurDeleteResult, ImgurFailure, type ImgurUploadResult } from "./imgurClient.ts";
import { ImageRejection, inspectImageBytes, maximumImageBytes } from "./imageValidation.ts";

// Takes an image from a signed-in user and stores it twice: on Imgur under the FactorioBlueprints
// account, which assigns the id, and in R2 under that same id, where the gateway serves it. When
// Imgur fails, the image gets an id of our own and lives in R2 only. See the design doc,
// "R2 image uploads: design".

export const uploadPathname = "/uploads";

const legacyImgurPrefix = "legacy-imgur";
const immutableCacheControl = "public, max-age=31536000, immutable";
const bearerPrefix = "Bearer ";

enum UploadOutcome {
  Accepted = "accepted",
  Error = "error",
  Forbidden = "forbidden",
  Rejected = "rejected",
  Unauthorized = "unauthorized",
}

export interface UploadDependencies {
  readonly deleteFromImgur: (deletehash: string) => Promise<ImgurDeleteResult>;
  readonly newFallbackId: () => string;
  readonly now: () => number;
  readonly uploadToImgur: (bytes: Uint8Array, contentType: string) => Promise<ImgurUploadResult>;
  readonly verifyIdToken: (token: string) => Promise<IdTokenVerification>;
}

const rejectionStatuses: Record<ImageRejection, number> = {
  [ImageRejection.DimensionsTooLarge]: 422,
  [ImageRejection.Empty]: 400,
  [ImageRejection.Malformed]: 422,
  [ImageRejection.TooLarge]: 413,
  [ImageRejection.UnsupportedFormat]: 415,
};

const recordUpload = (
  environment: Env,
  outcome: UploadOutcome,
  detail: string,
  format: string,
  ownerId: string,
  byteLength: number,
) => {
  environment.IMAGE_GATEWAY_METRICS.writeDataPoint({
    indexes: ["factorio-prints-image-upload"],
    blobs: [outcome, detail, format, ownerId],
    doubles: [byteLength],
  });
};

const allowedOrigins = (environment: Env): string[] =>
  String(environment.UPLOAD_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsHeaders = (origin: string | null): Record<string, string> =>
  origin ? { "access-control-allow-origin": origin, vary: "origin" } : {};

const textResponse = (
  status: number,
  message: string,
  origin: string | null,
  headers: Record<string, string> = {},
): Response =>
  new Response(message, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=UTF-8",
      ...corsHeaders(origin),
      ...headers,
    },
  });

const toHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const readBearerToken = (request: Request): string | null => {
  const header = request.headers.get("authorization");
  if (!header?.startsWith(bearerPrefix)) return null;

  const token = header.slice(bearerPrefix.length).trim();
  return token === "" ? null : token;
};

// An Imgur call that throws (the uploader unreachable) is one more way Imgur can fail.
const tryImgur = async (
  dependencies: UploadDependencies,
  bytes: Uint8Array,
  contentType: string,
): Promise<ImgurUploadResult> => {
  try {
    return await dependencies.uploadToImgur(bytes, contentType);
  } catch (error) {
    return {
      ok: false,
      reason: ImgurFailure.Unavailable,
      detail: `uploader unreachable: ${String(error)}`,
    };
  }
};

export const handleUploadRequest = async (
  request: Request,
  environment: Env,
  dependencies: UploadDependencies,
): Promise<Response> => {
  // Browsers send Origin; a request without one is not from a web page, and still needs a token.
  const requestOrigin = request.headers.get("origin");
  const origin =
    requestOrigin && allowedOrigins(environment).includes(requestOrigin) ? requestOrigin : null;
  if (requestOrigin && !origin) {
    recordUpload(environment, UploadOutcome.Forbidden, "origin", "none", "none", 0);
    return textResponse(403, "Origin not allowed", null);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(origin),
        "access-control-allow-headers": "authorization, content-type",
        "access-control-allow-methods": "POST",
        "access-control-max-age": "86400",
      },
    });
  }
  if (request.method !== "POST") {
    return textResponse(405, "Method not allowed", origin, { allow: "POST, OPTIONS" });
  }

  const token = readBearerToken(request);
  if (!token) {
    recordUpload(environment, UploadOutcome.Unauthorized, "missing-token", "none", "none", 0);
    return textResponse(401, "Authentication required", origin);
  }
  const verification = await dependencies.verifyIdToken(token);
  if (!verification.ok) {
    recordUpload(environment, UploadOutcome.Unauthorized, verification.reason, "none", "none", 0);
    return textResponse(401, "Authentication required", origin);
  }
  const ownerId = verification.identity.userId;

  const declaredLength = Number(request.headers.get("content-length"));
  if (!request.headers.has("content-length") || !Number.isInteger(declaredLength)) {
    recordUpload(environment, UploadOutcome.Rejected, "missing-length", "none", ownerId, 0);
    return textResponse(411, "Content-Length is required", origin);
  }
  if (declaredLength > maximumImageBytes) {
    recordUpload(
      environment,
      UploadOutcome.Rejected,
      "declared-too-large",
      "none",
      ownerId,
      declaredLength,
    );
    return textResponse(413, "Image is larger than the upload limit", origin);
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  const inspection = inspectImageBytes(bytes);
  if (!inspection.ok) {
    recordUpload(
      environment,
      UploadOutcome.Rejected,
      inspection.reason,
      "none",
      ownerId,
      bytes.length,
    );
    return textResponse(rejectionStatuses[inspection.reason], "Image was rejected", origin);
  }

  const imgur = await tryImgur(dependencies, bytes, inspection.contentType);
  const imageId = imgur.ok ? imgur.id : dependencies.newFallbackId();
  const detail = imgur.ok ? "imgur" : `fallback:${imgur.reason}`;
  if (!imgur.ok) {
    console.warn({
      event: "image_upload_imgur_fallback",
      ownerId,
      reason: imgur.reason,
      detail: imgur.detail,
    });
  }

  const sha256 = toHex(await crypto.subtle.digest("SHA-256", bytes));
  try {
    await environment.IMAGES.put(`${legacyImgurPrefix}/${imageId}/original`, bytes, {
      httpMetadata: { cacheControl: immutableCacheControl, contentType: inspection.contentType },
      customMetadata: {
        height: String(inspection.height),
        ...(imgur.ok ? { imgurDeletehash: imgur.deletehash } : { imgurFailure: imgur.reason }),
        origin: "upload",
        ownerId,
        sha256,
        uploadedAt: new Date(dependencies.now()).toISOString(),
        width: String(inspection.width),
      },
      sha256,
    });
  } catch (error) {
    // Without the R2 copy the image would exist only on Imgur; remove it so the two agree.
    if (imgur.ok) await dependencies.deleteFromImgur(imgur.deletehash).catch(() => undefined);
    recordUpload(
      environment,
      UploadOutcome.Error,
      "r2-error",
      inspection.format,
      ownerId,
      bytes.length,
    );
    console.error({
      event: "image_upload_r2_error",
      ownerId,
      message: error instanceof Error ? error.message : String(error),
    });
    return textResponse(503, "Image storage is temporarily unavailable", origin, {
      "retry-after": "60",
    });
  }

  recordUpload(
    environment,
    UploadOutcome.Accepted,
    detail,
    inspection.format,
    ownerId,
    bytes.length,
  );
  return new Response(JSON.stringify({ id: imageId, type: inspection.contentType }), {
    status: 201,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=UTF-8",
      ...corsHeaders(origin),
    },
  });
};
