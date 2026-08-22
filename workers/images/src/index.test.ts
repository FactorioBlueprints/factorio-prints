import { describe, expect, it, vi } from "vitest";
import imageGateway from "./index.ts";

const handleImageRequest = imageGateway.fetch;

interface TestEnvironment {
  environment: Env;
  get: ReturnType<typeof vi.fn>;
  head: ReturnType<typeof vi.fn>;
  writeDataPoint: ReturnType<typeof vi.fn>;
}

const createEnvironment = (storedObject: R2ObjectBody | null): TestEnvironment => {
  const get = vi.fn().mockResolvedValue(storedObject);
  const head = vi.fn().mockResolvedValue(storedObject);
  const writeDataPoint = vi.fn();
  const images = {
    createMultipartUpload: vi.fn(),
    delete: vi.fn(),
    get,
    head,
    list: vi.fn(),
    put: vi.fn(),
    resumeMultipartUpload: vi.fn(),
  } as R2Bucket;
  return {
    environment: {
      IMAGES: images,
      IMAGE_GATEWAY_METRICS: { writeDataPoint },
      LEGACY_R2_READS_ENABLED: "true",
    },
    get,
    head,
    writeDataPoint,
  };
};

const createStoredImage = (): R2ObjectBody => {
  const bytes = new TextEncoder().encode("obviously fake image bytes");
  return {
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
    httpEtag: '"fake-etag"',
    writeHttpMetadata(headers) {
      headers.set("cache-control", "public, max-age=31536000, immutable");
      headers.set("content-language", "en");
      headers.set("content-type", "image/png");
    },
  } as R2ObjectBody;
};

const readResponse = async (response: Response) => ({
  body: response.body ? await response.text() : null,
  headers: Object.fromEntries(response.headers.entries()),
  status: response.status,
});

describe("handleImageRequest", () => {
  it("streams an R2 object using the extensionless key and stored metadata", async () => {
    const { environment, get, writeDataPoint } = createEnvironment(createStoredImage());

    const response = await handleImageRequest(
      new Request("https://images.example.com/legacy-imgur/alice100/original.png"),
      environment,
    );

    expect(await readResponse(response)).toStrictEqual({
      body: "obviously fake image bytes",
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-language": "en",
        "content-type": "image/png",
        etag: '"fake-etag"',
        "x-content-type-options": "nosniff",
      },
      status: 200,
    });
    expect(get.mock.calls).toStrictEqual([["legacy-imgur/alice100/original"]]);
    expect(writeDataPoint.mock.calls).toStrictEqual([
      [
        {
          blobs: ["hit", "original", "legacy-imgur", "r2"],
          doubles: [1],
          indexes: ["factorio-prints-image-gateway"],
        },
      ],
    ]);
  });

  it("uses the default immutable cache policy when stored metadata omits it", async () => {
    const storedImage = createStoredImage();
    storedImage.writeHttpMetadata = (headers) => headers.set("content-type", "image/png");
    const { environment } = createEnvironment(storedImage);

    const response = await handleImageRequest(
      new Request("https://images.example.com/legacy-imgur/alice100/thumbnail.png"),
      environment,
    );

    expect(await readResponse(response)).toStrictEqual({
      body: "obviously fake image bytes",
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": "image/png",
        etag: '"fake-etag"',
        "x-content-type-options": "nosniff",
      },
      status: 200,
    });
  });

  it.each([
    ["original", "png", ""],
    ["thumbnail", "jpeg", "b"],
    ["large", "gif", "l"],
  ])(
    "redirects a missing %s variant to its fixed Imgur mapping",
    async (variant, extension, suffix) => {
      const { environment, get, writeDataPoint } = createEnvironment(null);

      const response = await handleImageRequest(
        new Request(`https://images.example.com/legacy-imgur/alice100/${variant}.${extension}`),
        environment,
      );

      expect(await readResponse(response)).toStrictEqual({
        body: null,
        headers: {
          "cache-control": "public, max-age=300",
          location: `https://i.imgur.com/alice100${suffix}.${extension}`,
        },
        status: 307,
      });
      expect(get.mock.calls).toStrictEqual([[`legacy-imgur/alice100/${variant}`]]);
      expect(writeDataPoint.mock.calls).toStrictEqual([
        [
          {
            blobs: ["fallback", variant, "legacy-imgur", "r2-miss"],
            doubles: [1],
            indexes: ["factorio-prints-image-gateway"],
          },
        ],
      ]);
    },
  );

  it("bypasses R2 and records a rollback fallback when legacy reads are disabled", async () => {
    const { environment, get, head, writeDataPoint } = createEnvironment(createStoredImage());
    const rollbackEnvironment = {
      ...environment,
      LEGACY_R2_READS_ENABLED: "false",
    } as unknown as Env;

    const response = await handleImageRequest(
      new Request("https://images.example.com/legacy-imgur/alice100/original.png"),
      rollbackEnvironment,
    );

    expect(await readResponse(response)).toStrictEqual({
      body: null,
      headers: {
        "cache-control": "public, max-age=300",
        location: "https://i.imgur.com/alice100.png",
      },
      status: 307,
    });
    expect(get.mock.calls).toStrictEqual([]);
    expect(head.mock.calls).toStrictEqual([]);
    expect(writeDataPoint.mock.calls).toStrictEqual([
      [
        {
          blobs: ["fallback", "original", "legacy-imgur", "rollback"],
          doubles: [1],
          indexes: ["factorio-prints-image-gateway"],
        },
      ],
    ]);
  });

  it.each([
    "/legacy-imgur/alice-100/original.png",
    "/legacy-imgur/alice100/medium.png",
    "/legacy-imgur/alice100/original.webp",
    "/legacy-imgur/alice100/original.png/extra",
    "/legacy-imgur/example.com/original.png",
    "/unrelated/alice100/original.png",
  ])("rejects an invalid path without reading R2 or redirecting: %s", async (pathname) => {
    const { environment, get, head, writeDataPoint } = createEnvironment(null);

    const response = await handleImageRequest(
      new Request(`https://images.example.com${pathname}`),
      environment,
    );

    expect(await readResponse(response)).toStrictEqual({
      body: "Image not found",
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=UTF-8",
      },
      status: 404,
    });
    expect(get.mock.calls).toStrictEqual([]);
    expect(head.mock.calls).toStrictEqual([]);
    expect(writeDataPoint.mock.calls).toStrictEqual([
      [
        {
          blobs: ["invalid", "none", "unknown", "validation"],
          doubles: [1],
          indexes: ["factorio-prints-image-gateway"],
        },
      ],
    ]);
  });

  it("rejects unsupported methods without reading R2", async () => {
    const { environment, get, head, writeDataPoint } = createEnvironment(null);

    const response = await handleImageRequest(
      new Request("https://images.example.com/legacy-imgur/alice100/original.png", {
        method: "POST",
      }),
      environment,
    );

    expect(await readResponse(response)).toStrictEqual({
      body: "Method not allowed",
      headers: {
        allow: "GET, HEAD",
        "cache-control": "no-store",
        "content-type": "text/plain; charset=UTF-8",
      },
      status: 405,
    });
    expect(get.mock.calls).toStrictEqual([]);
    expect(head.mock.calls).toStrictEqual([]);
    expect(writeDataPoint.mock.calls).toStrictEqual([
      [
        {
          blobs: ["invalid", "none", "unknown", "validation"],
          doubles: [1],
          indexes: ["factorio-prints-image-gateway"],
        },
      ],
    ]);
  });

  it("returns an empty successful response for HEAD requests", async () => {
    const { environment, get, head, writeDataPoint } = createEnvironment(createStoredImage());

    const response = await handleImageRequest(
      new Request("https://images.example.com/legacy-imgur/alice100/large.png", {
        method: "HEAD",
      }),
      environment,
    );

    expect(await readResponse(response)).toStrictEqual({
      body: null,
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-language": "en",
        "content-type": "image/png",
        etag: '"fake-etag"',
        "x-content-type-options": "nosniff",
      },
      status: 200,
    });
    expect(get.mock.calls).toStrictEqual([]);
    expect(head.mock.calls).toStrictEqual([["legacy-imgur/alice100/large"]]);
    expect(writeDataPoint.mock.calls).toStrictEqual([
      [
        {
          blobs: ["hit", "large", "legacy-imgur", "r2"],
          doubles: [1],
          indexes: ["factorio-prints-image-gateway"],
        },
      ],
    ]);
  });

  it("returns a retryable error without falling back when R2 fails", async () => {
    const { environment, get, writeDataPoint } = createEnvironment(null);
    get.mockRejectedValue(new Error("fake R2 outage"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await handleImageRequest(
      new Request("https://images.example.com/legacy-imgur/alice100/thumbnail.jpg"),
      environment,
    );

    expect(await readResponse(response)).toStrictEqual({
      body: "Image storage is temporarily unavailable",
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=UTF-8",
        "retry-after": "60",
      },
      status: 503,
    });
    expect(get.mock.calls).toStrictEqual([["legacy-imgur/alice100/thumbnail"]]);
    expect(writeDataPoint.mock.calls).toStrictEqual([
      [
        {
          blobs: ["error", "thumbnail", "legacy-imgur", "r2-error"],
          doubles: [1],
          indexes: ["factorio-prints-image-gateway"],
        },
      ],
    ]);
    expect(errorLog.mock.calls).toStrictEqual([
      [
        {
          event: "image_gateway_r2_error",
          imgurId: "alice100",
          message: "fake R2 outage",
          variant: "thumbnail",
        },
      ],
    ]);
    errorLog.mockRestore();
  });
});
