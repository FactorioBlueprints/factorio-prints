const imagePathPattern =
  /^\/legacy-imgur\/([A-Za-z0-9]+)\/(original|thumbnail|large)\.(png|jpe?g|gif)$/;
const r2ObjectPrefix = "legacy-imgur";
const immutableCacheControl = "public, max-age=31536000, immutable";
const fallbackCacheControl = "public, max-age=300";

enum ImageVariant {
  Large = "large",
  Original = "original",
  Thumbnail = "thumbnail",
}

enum GatewayMetric {
  Error = "error",
  Fallback = "fallback",
  Hit = "hit",
  Invalid = "invalid",
}

enum GatewaySource {
  LegacyImgur = "legacy-imgur",
  Unknown = "unknown",
}

enum GatewayDetail {
  R2 = "r2",
  R2Error = "r2-error",
  R2Miss = "r2-miss",
  Rollback = "rollback",
  Validation = "validation",
}

interface ImageRequestPath {
  extension: string;
  imgurId: string;
  variant: ImageVariant;
}

const imgurVariantSuffixes: Record<ImageVariant, string> = {
  [ImageVariant.Large]: "l",
  [ImageVariant.Original]: "",
  [ImageVariant.Thumbnail]: "b",
};

const parseImageRequestPath = (pathname: string): ImageRequestPath | null => {
  const match = imagePathPattern.exec(pathname);
  if (!match) return null;

  return {
    imgurId: match[1]!,
    variant: match[2]! as ImageVariant,
    extension: match[3]!,
  };
};

const recordMetric = (
  metrics: AnalyticsEngineDataset,
  metric: GatewayMetric,
  variant: ImageVariant | "none",
  source: GatewaySource,
  detail: GatewayDetail,
) => {
  metrics.writeDataPoint({
    indexes: ["factorio-prints-image-gateway"],
    blobs: [metric, variant, source, detail],
    doubles: [1],
  });
};

const invalidResponse = (environment: Env, status: number, message: string): Response => {
  recordMetric(
    environment.IMAGE_GATEWAY_METRICS,
    GatewayMetric.Invalid,
    "none",
    GatewaySource.Unknown,
    GatewayDetail.Validation,
  );
  return new Response(message, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=UTF-8",
    },
  });
};

const fallbackResponse = (
  environment: Env,
  path: ImageRequestPath,
  detail: GatewayDetail,
): Response => {
  recordMetric(
    environment.IMAGE_GATEWAY_METRICS,
    GatewayMetric.Fallback,
    path.variant,
    GatewaySource.LegacyImgur,
    detail,
  );
  const suffix = imgurVariantSuffixes[path.variant];
  const location = `https://i.imgur.com/${path.imgurId}${suffix}.${path.extension}`;
  return new Response(null, {
    status: 307,
    headers: {
      "cache-control": fallbackCacheControl,
      location,
    },
  });
};

const hitResponse = (
  environment: Env,
  object: R2Object,
  path: ImageRequestPath,
  body: ReadableStream | null,
  source: GatewaySource,
): Response => {
  recordMetric(
    environment.IMAGE_GATEWAY_METRICS,
    GatewayMetric.Hit,
    path.variant,
    source,
    GatewayDetail.R2,
  );
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", headers.get("cache-control") ?? immutableCacheControl);
  headers.set("x-content-type-options", "nosniff");
  return new Response(body, { headers });
};

const r2ErrorResponse = (environment: Env, path: ImageRequestPath, error: unknown): Response => {
  recordMetric(
    environment.IMAGE_GATEWAY_METRICS,
    GatewayMetric.Error,
    path.variant,
    GatewaySource.LegacyImgur,
    GatewayDetail.R2Error,
  );
  console.error({
    event: "image_gateway_r2_error",
    imgurId: path.imgurId,
    variant: path.variant,
    message: error instanceof Error ? error.message : String(error),
  });
  return new Response("Image storage is temporarily unavailable", {
    status: 503,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=UTF-8",
      "retry-after": "60",
    },
  });
};

const handleImageRequest = async (request: Request, environment: Env): Promise<Response> => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const response = invalidResponse(environment, 405, "Method not allowed");
    response.headers.set("allow", "GET, HEAD");
    return response;
  }

  const path = parseImageRequestPath(new URL(request.url).pathname);
  if (!path) return invalidResponse(environment, 404, "Image not found");
  if (String(environment.LEGACY_R2_READS_ENABLED) !== "true") {
    return fallbackResponse(environment, path, GatewayDetail.Rollback);
  }

  const objectKey = `${r2ObjectPrefix}/${path.imgurId}/${path.variant}`;
  try {
    if (request.method === "HEAD") {
      const object = await environment.IMAGES.head(objectKey);
      if (!object) return fallbackResponse(environment, path, GatewayDetail.R2Miss);
      return hitResponse(environment, object, path, null, GatewaySource.LegacyImgur);
    }

    const object = await environment.IMAGES.get(objectKey);
    if (!object) return fallbackResponse(environment, path, GatewayDetail.R2Miss);
    return hitResponse(environment, object, path, object.body, GatewaySource.LegacyImgur);
  } catch (error) {
    return r2ErrorResponse(environment, path, error);
  }
};

export default {
  fetch: handleImageRequest,
} satisfies ExportedHandler<Env>;
