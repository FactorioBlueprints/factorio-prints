import {
  buildImageInventory,
  buildImgurSourceUrls,
  buildR2ObjectKey,
  detectImageMediaType,
  downloadImageVariant,
  mapWithConcurrency,
  SourceImageMissingError,
} from "../scripts/imageBackfillCore";

const noDelay = async () => {};

describe("image backfill inventory", () => {
  test("deduplicates shared images and records conflicting media types", () => {
    const inventory = buildImageInventory(
      {
        "blueprint-alice": { imgurId: "imageShared", imgurType: "image/jpeg" },
        "blueprint-bob": { imgurId: "imageShared", imgurType: "image/png" },
        "blueprint-charlie": { imgurId: "imageUnique", imgurType: "image/gif" },
        "blueprint-invalid": { imgurId: "invalid-id", imgurType: "image/png" },
      },
      {
        "blueprint-raw": { id: "imageRaw", type: "image/jpeg" },
        "blueprint-raw-invalid": null,
      },
      6,
    );

    expect(inventory).toStrictEqual({
      images: [
        {
          imgurId: "imageRaw",
          blueprintIds: ["blueprint-raw"],
          mediaTypes: ["image/jpeg"],
        },
        {
          imgurId: "imageShared",
          blueprintIds: ["blueprint-alice", "blueprint-bob"],
          mediaTypes: ["image/jpeg", "image/png"],
        },
        {
          imgurId: "imageUnique",
          blueprintIds: ["blueprint-charlie"],
          mediaTypes: ["image/gif"],
        },
      ],
      invalidBlueprintImages: [
        {
          blueprintId: "blueprint-invalid",
          reason: "imgurId: Invalid string: must match pattern /^[A-Za-z0-9]+$/",
          source: "blueprintSummary",
        },
        {
          blueprintId: "blueprint-raw-invalid",
          reason: "value: Invalid input: expected object, received null",
          source: "blueprint",
        },
      ],
      rawBlueprintCount: 6,
      rawOnlyBlueprintCount: 2,
      summaryCount: 4,
    });
  });
});

describe("image backfill addressing", () => {
  test("builds extensionless immutable keys", () => {
    expect(buildR2ObjectKey("legacy-imgur/", "imageAlice", "thumbnail")).toBe(
      "legacy-imgur/imageAlice/thumbnail",
    );
  });

  test("builds each distinct Imgur extension candidate", () => {
    expect(
      buildImgurSourceUrls(
        {
          imgurId: "imageAlice",
          blueprintIds: ["blueprint-alice"],
          mediaTypes: ["image/jpeg", "image/png"],
        },
        "large",
      ),
    ).toStrictEqual([
      "https://i.imgur.com/imageAlicel.jpeg",
      "https://i.imgur.com/imageAlicel.jpg",
      "https://i.imgur.com/imageAlicel.png",
    ]);
  });
});

describe("image validation", () => {
  test.each([
    { bytes: new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), mediaType: "image/gif" },
    { bytes: new Uint8Array([0xff, 0xd8, 0xff]), mediaType: "image/jpeg" },
    {
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      mediaType: "image/png",
    },
    {
      bytes: new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]),
      mediaType: "image/webp",
    },
  ])("detects $mediaType bytes", ({ bytes, mediaType }) => {
    expect(detectImageMediaType(bytes)).toBe(mediaType);
  });

  test("rejects bytes without an image signature", () => {
    expect(() => detectImageMediaType(new TextEncoder().encode("not an image"))).toThrow(
      new Error("Downloaded content is not a supported image format"),
    );
  });
});

describe("image downloading", () => {
  test("returns validated bytes and their checksum", async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(bytes, {
        headers: { "content-length": "4", "content-type": "image/jpeg" },
        status: 200,
      }),
    );

    const result = await downloadImageVariant(["https://example.com/image.jpeg"], {
      delay: noDelay,
      fetcher,
      maximumAttempts: 3,
      maximumBytes: 100,
      requestTimeoutMilliseconds: 1_000,
    });

    expect(result).toStrictEqual({
      bytes,
      mediaType: "image/jpeg",
      sha256: "374ffede23adbc8bc625205f4bf86750807ffb6ce71fc7d10cac8bded0872bf5",
      sourceUrl: "https://example.com/image.jpeg",
    });
    expect(fetcher.mock.calls).toStrictEqual([
      [
        "https://example.com/image.jpeg",
        {
          redirect: "manual",
          signal: expect.any(AbortSignal),
        },
      ],
    ]);
  });

  test("classifies redirects and unprocessable variants as missing source images", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 302 }))
      .mockResolvedValueOnce(new Response(null, { status: 422 }));

    const result = downloadImageVariant(
      ["https://example.com/image.jpeg", "https://example.com/image.jpg"],
      {
        delay: noDelay,
        fetcher,
        maximumAttempts: 3,
        maximumBytes: 100,
        requestTimeoutMilliseconds: 1_000,
      },
    );

    await expect(result).rejects.toStrictEqual(
      new SourceImageMissingError([
        "https://example.com/image.jpeg",
        "https://example.com/image.jpg",
      ]),
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test("retries server errors before returning valid bytes", async () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        new Response(bytes, { headers: { "content-type": "image/gif" }, status: 200 }),
      );

    const result = await downloadImageVariant(["https://example.com/image.gif"], {
      delay: noDelay,
      fetcher,
      maximumAttempts: 3,
      maximumBytes: 100,
      requestTimeoutMilliseconds: 1_000,
    });

    expect(result).toStrictEqual({
      bytes,
      mediaType: "image/gif",
      sha256: "610f5ae4d76e332636a17bd357fd6ce99029316a99d320280d4d77a746bf29e8",
      sourceUrl: "https://example.com/image.gif",
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("bounded concurrency", () => {
  test("preserves input ordering", async () => {
    const result = await mapWithConcurrency([3, 1, 2], 2, async (value) => value * 10);

    expect(result).toStrictEqual([30, 10, 20]);
  });

  test("rejects invalid concurrency", async () => {
    await expect(mapWithConcurrency([1], 0, async (value) => value)).rejects.toThrow(
      new Error("Concurrency must be a positive integer"),
    );
  });
});
