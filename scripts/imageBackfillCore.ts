import { createHash } from "node:crypto";
import { z } from "zod";

export const imageVariants = ["original", "thumbnail", "large"] as const;

export type ImageVariant = (typeof imageVariants)[number];

const imgurIdSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9]+$/);
const supportedMediaTypeSchema = z.enum(["image/gif", "image/jpeg", "image/png"]);
const blueprintSummarySchema = z.object({
  imgurId: imgurIdSchema,
  imgurType: supportedMediaTypeSchema,
});
const rawBlueprintImageSchema = z.object({
  id: imgurIdSchema,
  type: supportedMediaTypeSchema,
});

export interface BackfillImage {
  imgurId: string;
  blueprintIds: string[];
  mediaTypes: Array<z.infer<typeof supportedMediaTypeSchema>>;
}

export interface InvalidBlueprintImage {
  blueprintId: string;
  reason: string;
  source: "blueprint" | "blueprintSummary";
}

export interface ImageInventory {
  images: BackfillImage[];
  invalidBlueprintImages: InvalidBlueprintImage[];
  rawBlueprintCount: number;
  rawOnlyBlueprintCount: number;
  summaryCount: number;
}

interface MutableBackfillImage {
  blueprintIds: Set<string>;
  mediaTypes: Set<z.infer<typeof supportedMediaTypeSchema>>;
}

const formatSchemaIssues = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`).join("; ");

const addImage = (
  images: Map<string, MutableBackfillImage>,
  blueprintId: string,
  imgurId: string,
  mediaType: z.infer<typeof supportedMediaTypeSchema>,
) => {
  const image = images.get(imgurId) ?? {
    blueprintIds: new Set<string>(),
    mediaTypes: new Set<z.infer<typeof supportedMediaTypeSchema>>(),
  };
  image.blueprintIds.add(blueprintId);
  image.mediaTypes.add(mediaType);
  images.set(imgurId, image);
};

export const buildImageInventory = (
  blueprintSummaries: Record<string, unknown>,
  rawBlueprintImages: Record<string, unknown>,
  rawBlueprintCount: number,
): ImageInventory => {
  const images = new Map<string, MutableBackfillImage>();
  const invalidBlueprintImages: InvalidBlueprintImage[] = [];

  for (const [blueprintId, value] of Object.entries(blueprintSummaries)) {
    const result = blueprintSummarySchema.safeParse(value);
    if (!result.success) {
      invalidBlueprintImages.push({
        blueprintId,
        reason: formatSchemaIssues(result.error),
        source: "blueprintSummary",
      });
      continue;
    }
    addImage(images, blueprintId, result.data.imgurId, result.data.imgurType);
  }

  for (const [blueprintId, value] of Object.entries(rawBlueprintImages)) {
    const result = rawBlueprintImageSchema.safeParse(value);
    if (!result.success) {
      invalidBlueprintImages.push({
        blueprintId,
        reason: formatSchemaIssues(result.error),
        source: "blueprint",
      });
      continue;
    }
    addImage(images, blueprintId, result.data.id, result.data.type);
  }

  return {
    images: [...images.entries()]
      .map(([imgurId, image]) => ({
        imgurId,
        blueprintIds: [...image.blueprintIds].sort(),
        mediaTypes: [...image.mediaTypes].sort(),
      }))
      .sort((left, right) => left.imgurId.localeCompare(right.imgurId)),
    invalidBlueprintImages: invalidBlueprintImages.sort((left, right) =>
      left.blueprintId.localeCompare(right.blueprintId),
    ),
    rawBlueprintCount,
    rawOnlyBlueprintCount: Object.keys(rawBlueprintImages).length,
    summaryCount: Object.keys(blueprintSummaries).length,
  };
};

const variantSuffixes: Record<ImageVariant, string> = {
  original: "",
  thumbnail: "b",
  large: "l",
};

const mediaTypeExtensions: Record<z.infer<typeof supportedMediaTypeSchema>, string[]> = {
  "image/gif": ["gif"],
  "image/jpeg": ["jpeg", "jpg"],
  "image/png": ["png"],
};

export const buildImgurSourceUrls = (image: BackfillImage, variant: ImageVariant): string[] => {
  const extensions = [
    ...new Set(image.mediaTypes.flatMap((mediaType) => mediaTypeExtensions[mediaType])),
  ];
  const suffix = variantSuffixes[variant];
  return extensions.map(
    (extension) => `https://i.imgur.com/${image.imgurId}${suffix}.${extension}`,
  );
};

export const buildR2ObjectKey = (prefix: string, imgurId: string, variant: ImageVariant): string =>
  `${prefix.replace(/\/+$/, "")}/${imgurId}/${variant}`;

export const detectImageMediaType = (bytes: Uint8Array): string => {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 6) {
    const signature = new TextDecoder().decode(bytes.subarray(0, 6));
    if (signature === "GIF87a" || signature === "GIF89a") {
      return "image/gif";
    }
  }
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  throw new Error("Downloaded content is not a supported image format");
};

const normalizeResponseMediaType = (contentType: string | null): string | null => {
  if (!contentType) return null;
  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase();
  return mediaType === "image/jpg" ? "image/jpeg" : (mediaType ?? null);
};

export interface DownloadedImage {
  bytes: Uint8Array;
  mediaType: string;
  sha256: string;
  sourceUrl: string;
}

export interface DownloadOptions {
  delay: (milliseconds: number) => Promise<void>;
  fetcher: typeof fetch;
  maximumAttempts: number;
  maximumBytes: number;
  requestTimeoutMilliseconds: number;
}

const shouldRetryStatus = (status: number): boolean => status === 429 || status >= 500;
const isMissingStatus = (status: number): boolean =>
  status === 301 ||
  status === 302 ||
  status === 303 ||
  status === 307 ||
  status === 308 ||
  status === 422 ||
  status === 404;

const fetchWithRetry = async (sourceUrl: string, options: DownloadOptions): Promise<Response> => {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= options.maximumAttempts; attempt += 1) {
    try {
      const response = await options.fetcher(sourceUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(options.requestTimeoutMilliseconds),
      });
      if (!shouldRetryStatus(response.status) || attempt === options.maximumAttempts) {
        return response;
      }
      await response.body?.cancel();
      await options.delay(250 * 2 ** (attempt - 1));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === options.maximumAttempts) throw lastError;
      await options.delay(250 * 2 ** (attempt - 1));
    }
  }
  throw lastError ?? new Error(`Failed to download ${sourceUrl}`);
};

export class SourceImageMissingError extends Error {
  public readonly sourceUrls: string[];

  constructor(sourceUrls: string[]) {
    super(`Imgur returned no image for ${sourceUrls.join(", ")}`);
    this.name = "SourceImageMissingError";
    this.sourceUrls = sourceUrls;
  }
}

export const downloadImageVariant = async (
  sourceUrls: string[],
  options: DownloadOptions,
): Promise<DownloadedImage> => {
  const failures: string[] = [];

  for (const sourceUrl of sourceUrls) {
    const response = await fetchWithRetry(sourceUrl, options);
    if (isMissingStatus(response.status)) {
      await response.body?.cancel();
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      failures.push(`${sourceUrl}: HTTP ${response.status}`);
      continue;
    }

    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > options.maximumBytes) {
      await response.body?.cancel();
      failures.push(`${sourceUrl}: content length ${declaredLength} exceeds the configured limit`);
      continue;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > options.maximumBytes) {
      failures.push(
        `${sourceUrl}: downloaded ${bytes.length} bytes, exceeding the configured limit`,
      );
      continue;
    }

    const detectedMediaType = detectImageMediaType(bytes);
    const responseMediaType = normalizeResponseMediaType(response.headers.get("content-type"));
    if (responseMediaType !== detectedMediaType) {
      failures.push(
        `${sourceUrl}: response type ${responseMediaType ?? "missing"} does not match ${detectedMediaType}`,
      );
      continue;
    }

    return {
      bytes,
      mediaType: detectedMediaType,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sourceUrl,
    };
  }

  if (failures.length > 0) {
    throw new Error(failures.join("; "));
  }
  throw new SourceImageMissingError(sourceUrls);
};

export const mapWithConcurrency = async <Input, Output>(
  inputs: Input[],
  concurrency: number,
  operation: (input: Input, index: number) => Promise<Output>,
): Promise<Output[]> => {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Concurrency must be a positive integer");
  }
  const outputs: Output[] = [];
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < inputs.length) {
      const index = nextIndex;
      nextIndex += 1;
      outputs[index] = await operation(inputs[index]!, index);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, inputs.length) }, async () => worker()),
  );
  return outputs;
};
