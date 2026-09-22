import type { IdTokenVerification } from "./firebaseAuth.ts";
import { ImageRejection, inspectImageBytes, maximumImageBytes } from "./imageValidation.ts";

export const uploadPathname = "/uploads";
const publishedUploadPrefix = "uploads/published";

const immutableCacheControl = "public, max-age=31536000, immutable";
const bearerPrefix = "Bearer ";

enum UploadOutcome {
  Accepted = "accepted",
  Error = "error",
  Rejected = "rejected",
  Unauthorized = "unauthorized",
}

export interface UploadDependencies {
  readonly newImageId: () => string;
  readonly now: () => number;
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

const textResponse = (status: number, message: string, headers: HeadersInit = {}): Response =>
  new Response(message, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=UTF-8",
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

export const handleUploadRequest = async (
  request: Request,
  environment: Env,
  dependencies: UploadDependencies,
): Promise<Response> => {
  if (String(environment.UPLOADS_ENABLED) !== "true") {
    return textResponse(404, "Not found");
  }
  if (request.method !== "POST") {
    return textResponse(405, "Method not allowed", { allow: "POST" });
  }

  const token = readBearerToken(request);
  if (!token) {
    recordUpload(environment, UploadOutcome.Unauthorized, "missing-token", "none", "none", 0);
    return textResponse(401, "Authentication required");
  }

  const verification = await dependencies.verifyIdToken(token);
  if (!verification.ok) {
    recordUpload(environment, UploadOutcome.Unauthorized, verification.reason, "none", "none", 0);
    return textResponse(401, "Authentication required");
  }
  const ownerId = verification.identity.userId;

  const declaredLength = Number(request.headers.get("content-length"));
  if (!request.headers.has("content-length") || !Number.isInteger(declaredLength)) {
    recordUpload(environment, UploadOutcome.Rejected, "missing-length", "none", ownerId, 0);
    return textResponse(411, "Content-Length is required");
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
    return textResponse(413, "Image is larger than the upload limit");
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
    return textResponse(rejectionStatuses[inspection.reason], "Image was rejected");
  }

  const sha256 = toHex(await crypto.subtle.digest("SHA-256", bytes));
  const imageId = dependencies.newImageId();

  try {
    await environment.IMAGES.put(`${publishedUploadPrefix}/${imageId}/original`, bytes, {
      httpMetadata: { cacheControl: immutableCacheControl, contentType: inspection.contentType },
      customMetadata: {
        height: String(inspection.height),
        ownerId,
        sha256,
        uploadedAt: new Date(dependencies.now()).toISOString(),
        width: String(inspection.width),
      },
      sha256,
    });
  } catch (error) {
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
    return textResponse(503, "Image storage is temporarily unavailable", { "retry-after": "60" });
  }

  recordUpload(
    environment,
    UploadOutcome.Accepted,
    "stored",
    inspection.format,
    ownerId,
    bytes.length,
  );
  return new Response(JSON.stringify({ source: "r2", id: imageId, type: inspection.contentType }), {
    status: 201,
    headers: { "cache-control": "no-store", "content-type": "application/json; charset=UTF-8" },
  });
};
