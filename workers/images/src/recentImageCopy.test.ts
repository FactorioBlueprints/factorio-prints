import { describe, expect, it, vi } from "vitest";
import {
  copyRecentImages,
  createRecentImagesQuery,
  type RecentImageCopyDependencies,
  runThroughRecentImageCopier,
} from "./recentImageCopy.ts";

// 1x1 PNG and JPEG headers are enough for inspectImageBytes to read a format and dimensions.
const pngBytes = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
]);
const jpegBytes = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01, 0x03, 0x01, 0x22, 0x00, 0x02,
  0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
]);

const imageResponse = (bytes: Uint8Array, contentType: string) =>
  new Response(bytes, { status: 200, headers: { "content-type": contentType } });

interface StoredObject {
  key: string;
  contentType: string;
  metadata: Record<string, string>;
}

const createDependencies = (options: {
  images: Array<{ id: string; type: string }>;
  existing?: string[];
  imgur?: Record<string, Response>;
}) => {
  const stored: StoredObject[] = [];
  const fetched: string[] = [];
  const dependencies = {
    recentImages: vi.fn(async () => options.images),
    exists: vi.fn(async (key: string) => (options.existing ?? []).includes(key)),
    fetchImgur: vi.fn(async (url: string) => {
      fetched.push(url);
      return options.imgur?.[url] ?? new Response(null, { status: 404 });
    }),
    put: vi.fn(async (key, _bytes, contentType, metadata) => {
      stored.push({ key, contentType, metadata });
    }),
    now: () => Date.parse("2026-10-06T17:00:00.000Z"),
  } satisfies RecentImageCopyDependencies;
  return { dependencies, fetched, stored };
};

describe("copyRecentImages", () => {
  it("copies every missing variant of a recent image from Imgur into R2", async () => {
    const { dependencies, stored } = createDependencies({
      images: [{ id: "qBG1NJ9", type: "image/png" }],
      imgur: {
        "https://i.imgur.com/qBG1NJ9.png": imageResponse(pngBytes, "image/png"),
        "https://i.imgur.com/qBG1NJ9b.png": imageResponse(jpegBytes, "image/jpeg"),
        "https://i.imgur.com/qBG1NJ9l.png": imageResponse(jpegBytes, "image/jpeg"),
      },
    });

    const summary = await copyRecentImages(dependencies);

    expect(summary).toStrictEqual({
      checked: 1,
      copied: [
        "legacy-imgur/qBG1NJ9/original",
        "legacy-imgur/qBG1NJ9/thumbnail",
        "legacy-imgur/qBG1NJ9/large",
      ],
      failed: [],
      missing: [],
    });
    const pngSha256 = "a930c2bb4e61c0682068f71c4ef427eefbb07098ecea9390e445e7af4b66a384";
    expect(stored[0]).toStrictEqual({
      key: "legacy-imgur/qBG1NJ9/original",
      contentType: "image/png",
      metadata: {
        "fetched-at": "2026-10-06T17:00:00.000Z",
        sha256: pngSha256,
        "source-id": "qBG1NJ9",
        "source-provider": "imgur",
        "source-url": "https://i.imgur.com/qBG1NJ9.png",
      },
    });
    expect(stored.map((object) => object.contentType)).toStrictEqual([
      "image/png",
      "image/jpeg",
      "image/jpeg",
    ]);
  });

  it("leaves variants already in R2 alone without asking Imgur", async () => {
    const { dependencies, fetched } = createDependencies({
      images: [{ id: "iYQE8yx", type: "image/png" }],
      existing: [
        "legacy-imgur/iYQE8yx/original",
        "legacy-imgur/iYQE8yx/thumbnail",
        "legacy-imgur/iYQE8yx/large",
      ],
    });

    const summary = await copyRecentImages(dependencies);

    expect(summary).toStrictEqual({ checked: 1, copied: [], failed: [], missing: [] });
    expect(fetched).toStrictEqual([]);
  });

  it("tries both JPEG extensions and reports a variant Imgur no longer has", async () => {
    const { dependencies, fetched } = createDependencies({
      images: [{ id: "gone123", type: "image/jpeg" }],
      existing: ["legacy-imgur/gone123/thumbnail", "legacy-imgur/gone123/large"],
      imgur: {
        "https://i.imgur.com/gone123.jpeg": new Response(null, {
          status: 302,
          headers: { location: "https://i.imgur.com/removed.png" },
        }),
      },
    });

    const summary = await copyRecentImages(dependencies);

    expect(summary).toStrictEqual({
      checked: 1,
      copied: [],
      failed: [],
      missing: ["legacy-imgur/gone123/original"],
    });
    expect(fetched).toStrictEqual([
      "https://i.imgur.com/gone123.jpeg",
      "https://i.imgur.com/gone123.jpg",
    ]);
  });

  it("refuses a response whose bytes are not the image type Imgur declared", async () => {
    const { dependencies, stored } = createDependencies({
      images: [{ id: "mixed12", type: "image/png" }],
      existing: ["legacy-imgur/mixed12/thumbnail", "legacy-imgur/mixed12/large"],
      imgur: {
        "https://i.imgur.com/mixed12.png": imageResponse(jpegBytes, "image/png"),
      },
    });

    const summary = await copyRecentImages(dependencies);

    expect(summary).toStrictEqual({
      checked: 1,
      copied: [],
      failed: ["legacy-imgur/mixed12/original"],
      missing: [],
    });
    expect(stored).toStrictEqual([]);
  });

  it("skips R2-only fallback ids, which Imgur has never seen", async () => {
    const { dependencies, fetched } = createDependencies({
      images: [{ id: "AbCdEfGhIjKlMnOpQrSt", type: "image/png" }],
    });

    const summary = await copyRecentImages(dependencies);

    expect(summary).toStrictEqual({ checked: 0, copied: [], failed: [], missing: [] });
    expect(fetched).toStrictEqual([]);
  });

  it("keeps copying other images when one variant fails", async () => {
    const { dependencies } = createDependencies({
      images: [
        { id: "broken1", type: "image/png" },
        { id: "fine123", type: "image/png" },
      ],
      existing: [
        "legacy-imgur/broken1/thumbnail",
        "legacy-imgur/broken1/large",
        "legacy-imgur/fine123/thumbnail",
        "legacy-imgur/fine123/large",
      ],
      imgur: {
        "https://i.imgur.com/broken1.png": new Response(null, { status: 500 }),
        "https://i.imgur.com/fine123.png": imageResponse(pngBytes, "image/png"),
      },
    });

    const summary = await copyRecentImages(dependencies);

    expect(summary).toStrictEqual({
      checked: 2,
      copied: ["legacy-imgur/fine123/original"],
      failed: ["legacy-imgur/broken1/original"],
      missing: [],
    });
  });
});

describe("createRecentImagesQuery", () => {
  it("asks Firebase for the most recently saved summaries and returns each image once", async () => {
    const fetch = vi.fn(
      async (_url: string) =>
        new Response(
          JSON.stringify({
            "-P3Ftic7pY-Ztb9J9Cnu": { imgurId: "qBG1NJ9", imgurType: "image/png" },
            "-P3Fother": { imgurId: "qBG1NJ9", imgurType: "image/png" },
            "-P3Fjpeg": { imgurId: "jpg1234", imgurType: "image/jpeg" },
            "-P3Fnoimage": { title: "No image" },
            "-P3Fbadtype": { imgurId: "webp123", imgurType: "image/webp" },
            "-P3Fbadid": { imgurId: "../etc", imgurType: "image/png" },
          }),
        ),
    );

    const images = await createRecentImagesQuery(
      fetch,
      "https://facorio-blueprints.firebaseio.com",
      50,
    )();

    expect(fetch).toHaveBeenCalledWith(
      "https://facorio-blueprints.firebaseio.com/blueprintSummaries.json?orderBy=%22lastUpdatedDate%22&limitToLast=50",
    );
    expect(images).toStrictEqual([
      { id: "qBG1NJ9", type: "image/png" },
      { id: "jpg1234", type: "image/jpeg" },
    ]);
  });

  it("fails loudly when Firebase refuses the query", async () => {
    const fetch = vi.fn(async (_url: string) => new Response("Index not defined", { status: 400 }));

    await expect(
      createRecentImagesQuery(fetch, "https://facorio-blueprints.firebaseio.com", 50)(),
    ).rejects.toThrow(new Error("Firebase returned 400"));
  });
});

describe("runThroughRecentImageCopier", () => {
  it("runs the copy in the one US-pinned copier object, so Imgur is never fetched from a blocked country", async () => {
    const stubFetch = vi.fn(async () =>
      Response.json({ checked: 0, copied: [], failed: [], missing: [] }),
    );
    const usNamespace = {
      idFromName: vi.fn((name: string) => `id:${name}`),
      get: vi.fn(() => ({ fetch: stubFetch })),
    };
    const namespace = { jurisdiction: vi.fn(() => usNamespace) };

    await runThroughRecentImageCopier(namespace as unknown as DurableObjectNamespace);

    expect(namespace.jurisdiction).toHaveBeenCalledWith("us");
    expect(usNamespace.idFromName).toHaveBeenCalledWith("recent-images");
    expect(usNamespace.get).toHaveBeenCalledWith("id:recent-images");
    expect(stubFetch).toHaveBeenCalledWith("https://recent-image-copier/run", { method: "POST" });
  });

  it("surfaces a failed run", async () => {
    const usNamespace = {
      idFromName: () => "id",
      get: () => ({ fetch: async () => new Response("Firebase returned 500", { status: 500 }) }),
    };
    const namespace = { jurisdiction: () => usNamespace };

    await expect(
      runThroughRecentImageCopier(namespace as unknown as DurableObjectNamespace),
    ).rejects.toThrow(new Error("Recent image copy failed with 500: Firebase returned 500"));
  });
});
