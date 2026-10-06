import { isFallbackImageId } from "./imageIds.ts";
import { inspectImageBytes } from "./imageValidation.ts";

// Blueprints saved with a pasted Imgur link never pass through this Worker, so their images reach
// R2 only when something copies them. A Cron Trigger runs this every few minutes over the most
// recently saved blueprints, so a new image is served from R2 within minutes instead of waiting for
// the full GitHub Actions sweep. Ordering by lastUpdatedDate also catches edits that swap an image.

const legacyImgurPrefix = "legacy-imgur";
const variants = ["original", "thumbnail", "large"] as const;
const variantSuffixes: Record<(typeof variants)[number], string> = {
  original: "",
  thumbnail: "b",
  large: "l",
};
const mediaTypeExtensions: Record<string, readonly string[]> = {
  "image/gif": ["gif"],
  "image/jpeg": ["jpeg", "jpg"],
  "image/png": ["png"],
};
const imgurIdPattern = /^[A-Za-z0-9]+$/;

export interface RecentImage {
  readonly id: string;
  readonly type: string;
}

export interface RecentImageCopyDependencies {
  readonly recentImages: () => Promise<RecentImage[]>;
  readonly exists: (key: string) => Promise<boolean>;
  readonly fetchImgur: (url: string) => Promise<Response>;
  readonly put: (
    key: string,
    bytes: Uint8Array,
    contentType: string,
    metadata: Record<string, string>,
  ) => Promise<void>;
  readonly now: () => number;
}

export interface RecentImageCopySummary {
  readonly checked: number;
  readonly copied: string[];
  readonly failed: string[];
  readonly missing: string[];
}

type VariantOutcome = "copied" | "failed" | "missing";

const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const copyVariant = async (
  image: RecentImage,
  key: string,
  sourceUrls: string[],
  dependencies: RecentImageCopyDependencies,
): Promise<VariantOutcome> => {
  for (const sourceUrl of sourceUrls) {
    const response = await dependencies.fetchImgur(sourceUrl);
    // Imgur answers a removed image with a redirect to its placeholder, or a 404.
    if (response.status === 404 || (response.status >= 300 && response.status < 400)) {
      await response.body?.cancel();
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      return "failed";
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const inspection = inspectImageBytes(bytes);
    const declaredType = response.headers.get("content-type")?.split(";", 1)[0]?.trim();
    if (!inspection.ok || inspection.contentType !== declaredType) return "failed";

    await dependencies.put(key, bytes, inspection.contentType, {
      "fetched-at": new Date(dependencies.now()).toISOString(),
      sha256: await sha256Hex(bytes),
      "source-id": image.id,
      "source-provider": "imgur",
      "source-url": sourceUrl,
    });
    return "copied";
  }
  return "missing";
};

export const copyRecentImages = async (
  dependencies: RecentImageCopyDependencies,
): Promise<RecentImageCopySummary> => {
  const summary = {
    checked: 0,
    copied: [] as string[],
    failed: [] as string[],
    missing: [] as string[],
  };

  for (const image of await dependencies.recentImages()) {
    if (isFallbackImageId(image.id)) continue;
    summary.checked += 1;

    for (const variant of variants) {
      const key = `${legacyImgurPrefix}/${image.id}/${variant}`;
      if (await dependencies.exists(key)) continue;

      const sourceUrls = (mediaTypeExtensions[image.type] ?? []).map(
        (extension) => `https://i.imgur.com/${image.id}${variantSuffixes[variant]}.${extension}`,
      );
      const outcome = await copyVariant(image, key, sourceUrls, dependencies).catch(
        (): VariantOutcome => "failed",
      );
      summary[outcome].push(key);
    }
  }
  return summary;
};

export const createRecentImagesQuery =
  (fetch: (url: string) => Promise<Response>, databaseUrl: string, limit: number) =>
  async (): Promise<RecentImage[]> => {
    const url = new URL(`${databaseUrl}/blueprintSummaries.json`);
    url.searchParams.set("orderBy", JSON.stringify("lastUpdatedDate"));
    url.searchParams.set("limitToLast", String(limit));
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Firebase returned ${response.status}`);

    const summaries = ((await response.json()) ?? {}) as Record<
      string,
      { imgurId?: unknown; imgurType?: unknown }
    >;
    const images = new Map<string, RecentImage>();
    for (const { imgurId, imgurType } of Object.values(summaries)) {
      if (typeof imgurId !== "string" || !imgurIdPattern.test(imgurId)) continue;
      if (typeof imgurType !== "string" || !(imgurType in mediaTypeExtensions)) continue;
      if (!images.has(imgurId)) images.set(imgurId, { id: imgurId, type: imgurType });
    }
    return [...images.values()];
  };

const recentBlueprintLimit = 50;

// Imgur refuses requests from some countries, and a Cron Trigger may run in any data center, so the
// copy runs in a Durable Object pinned to the US. One object also keeps two runs from overlapping.
export class RecentImageCopier implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly environment: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/run") {
      return new Response("Not found", { status: 404 });
    }
    const images = this.environment.IMAGES;
    try {
      const summary = await this.state.blockConcurrencyWhile(() =>
        copyRecentImages({
          recentImages: createRecentImagesQuery(
            (url) => fetch(url),
            this.environment.FIREBASE_DATABASE_URL,
            recentBlueprintLimit,
          ),
          exists: async (key) => (await images.head(key)) !== null,
          fetchImgur: (url) => fetch(url, { redirect: "manual" }),
          put: async (key, bytes, contentType, metadata) => {
            await images.put(key, bytes, {
              customMetadata: metadata,
              httpMetadata: { contentType },
              sha256: metadata.sha256,
            });
          },
          now: () => Date.now(),
        }),
      );
      console.log({
        event: "recent_image_copy",
        checked: summary.checked,
        copied: summary.copied.length,
        failed: summary.failed,
        missing: summary.missing,
      });
      return Response.json(summary);
    } catch (error) {
      console.error({ event: "recent_image_copy_error", message: String(error) });
      return new Response(String(error instanceof Error ? error.message : error), { status: 500 });
    }
  }
}

export const runThroughRecentImageCopier = async (
  namespace: DurableObjectNamespace,
): Promise<RecentImageCopySummary> => {
  const us = namespace.jurisdiction("us");
  const response = await us
    .get(us.idFromName("recent-images"))
    .fetch("https://recent-image-copier/run", { method: "POST" });
  if (!response.ok) {
    throw new Error(`Recent image copy failed with ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as RecentImageCopySummary;
};
