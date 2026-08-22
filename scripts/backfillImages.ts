import {
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import {
  type BackfillImage,
  buildImageInventory,
  buildImgurSourceUrls,
  buildR2ObjectKey,
  downloadImageVariant,
  imageVariants,
  mapWithConcurrency,
  SourceImageMissingError,
} from "./imageBackfillCore.ts";

const DEFAULT_DATABASE_URL = "https://facorio-blueprints.firebaseio.com";
const DEFAULT_OBJECT_PREFIX = "legacy-imgur";
const DEFAULT_REPORT_PATH = ".llm/image-backfill-report.json";

const unknownRecordSchema = z.record(z.string(), z.unknown());
const shallowRecordSchema = z.record(z.string(), z.boolean());
export const imageR2EnvironmentSchema = z.object({
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
});

interface CommandOptions {
  concurrency: number;
  databaseUrl: string;
  execute: boolean;
  limit?: number;
  maximumBytes: number;
  objectPrefix: string;
  reportPath: string;
}

interface ExistingVariantReport {
  key: string;
  status: "existing";
  variant: (typeof imageVariants)[number];
}

interface MigratedVariantReport {
  bytes: number;
  key: string;
  mediaType: string;
  sha256: string;
  sourceUrl: string;
  status: "migrated";
  variant: (typeof imageVariants)[number];
}

interface MissingVariantReport {
  error: string;
  key: string;
  status: "sourceMissing";
  variant: (typeof imageVariants)[number];
}

interface FailedVariantReport {
  error: string;
  key: string;
  status: "failed";
  variant: (typeof imageVariants)[number];
}

type VariantReport =
  | ExistingVariantReport
  | FailedVariantReport
  | MigratedVariantReport
  | MissingVariantReport;

interface ImageReport {
  blueprintIds: string[];
  imgurId: string;
  variants: VariantReport[];
}

const parsePositiveInteger = (value: string, optionName: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${optionName} must be a positive integer`);
  }
  return parsed;
};

const parseCommandOptions = (): CommandOptions => {
  const { values } = parseArgs({
    options: {
      concurrency: { type: "string", default: "8" },
      "database-url": { type: "string", default: DEFAULT_DATABASE_URL },
      execute: { type: "boolean", default: false },
      limit: { type: "string" },
      "maximum-megabytes": { type: "string", default: "20" },
      prefix: { type: "string", default: DEFAULT_OBJECT_PREFIX },
      report: { type: "string", default: DEFAULT_REPORT_PATH },
    },
    strict: true,
  });

  return {
    concurrency: parsePositiveInteger(values.concurrency, "--concurrency"),
    databaseUrl: values["database-url"].replace(/\/+$/, ""),
    execute: values.execute,
    limit: values.limit ? parsePositiveInteger(values.limit, "--limit") : undefined,
    maximumBytes:
      parsePositiveInteger(values["maximum-megabytes"], "--maximum-megabytes") * 1_000_000,
    objectPrefix: values.prefix.replace(/^\/+|\/+$/g, ""),
    reportPath: resolve(values.report),
  };
};

const getJson = async (requestUrl: string): Promise<unknown> => {
  const response = await fetch(requestUrl);
  if (!response.ok) {
    throw new Error(`Firebase request failed with HTTP ${response.status}: ${requestUrl}`);
  }
  return response.json();
};

export const loadImageInventory = async (databaseUrl: string, concurrency: number) => {
  const [blueprintSummariesValue, rawBlueprintKeysValue] = await Promise.all([
    getJson(`${databaseUrl}/blueprintSummaries.json`),
    getJson(`${databaseUrl}/blueprints.json?shallow=true`),
  ]);
  const blueprintSummaries = unknownRecordSchema.parse(blueprintSummariesValue);
  const rawBlueprintKeys = shallowRecordSchema.parse(rawBlueprintKeysValue);
  const rawOnlyBlueprintIds = Object.keys(rawBlueprintKeys).filter(
    (blueprintId) => !(blueprintId in blueprintSummaries),
  );
  const rawOnlyImageEntries = await mapWithConcurrency(
    rawOnlyBlueprintIds,
    concurrency,
    async (blueprintId) => [
      blueprintId,
      await getJson(`${databaseUrl}/blueprints/${encodeURIComponent(blueprintId)}/image.json`),
    ],
  );

  return buildImageInventory(
    blueprintSummaries,
    Object.fromEntries(rawOnlyImageEntries),
    Object.keys(rawBlueprintKeys).length,
  );
};

export const listExistingImageObjectKeys = async (
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<Set<string>> => {
  const keys = new Set<string>();
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        Prefix: `${prefix}/`,
      }),
    );
    for (const object of response.Contents ?? []) {
      if (object.Key) keys.add(object.Key);
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
};

export const putAndVerifyImageObject = async (
  client: S3Client,
  bucket: string,
  key: string,
  image: BackfillImage,
  downloadedImage: Awaited<ReturnType<typeof downloadImageVariant>>,
) => {
  const fetchedAt = new Date().toISOString();
  await client.send(
    new PutObjectCommand({
      Body: downloadedImage.bytes,
      Bucket: bucket,
      CacheControl: "public, max-age=31536000, immutable",
      ContentLength: downloadedImage.bytes.length,
      ContentType: downloadedImage.mediaType,
      Key: key,
      Metadata: {
        "fetched-at": fetchedAt,
        sha256: downloadedImage.sha256,
        "source-id": image.imgurId,
        "source-provider": "imgur",
        "source-url": downloadedImage.sourceUrl,
      },
    }),
  );

  const storedObject = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (
    storedObject.ContentLength !== downloadedImage.bytes.length ||
    storedObject.ContentType !== downloadedImage.mediaType ||
    storedObject.Metadata?.sha256 !== downloadedImage.sha256
  ) {
    throw new Error(`R2 verification failed for ${key}`);
  }
};

const migrateImage = async (
  client: S3Client,
  bucket: string,
  existingObjectKeys: Set<string>,
  image: BackfillImage,
  options: CommandOptions,
): Promise<ImageReport> => {
  const variants: VariantReport[] = [];

  for (const variant of imageVariants) {
    const key = buildR2ObjectKey(options.objectPrefix, image.imgurId, variant);
    if (existingObjectKeys.has(key)) {
      variants.push({ key, status: "existing", variant });
      continue;
    }

    try {
      const downloadedImage = await downloadImageVariant(buildImgurSourceUrls(image, variant), {
        delay: async (milliseconds) =>
          new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds)),
        fetcher: fetch,
        maximumAttempts: 3,
        maximumBytes: options.maximumBytes,
        requestTimeoutMilliseconds: 20_000,
      });
      await putAndVerifyImageObject(client, bucket, key, image, downloadedImage);
      existingObjectKeys.add(key);
      variants.push({
        bytes: downloadedImage.bytes.length,
        key,
        mediaType: downloadedImage.mediaType,
        sha256: downloadedImage.sha256,
        sourceUrl: downloadedImage.sourceUrl,
        status: "migrated",
        variant,
      });
    } catch (error) {
      if (error instanceof SourceImageMissingError) {
        variants.push({ error: error.message, key, status: "sourceMissing", variant });
      } else {
        variants.push({
          error: error instanceof Error ? error.message : String(error),
          key,
          status: "failed",
          variant,
        });
      }
    }
  }

  return { blueprintIds: image.blueprintIds, imgurId: image.imgurId, variants };
};

const countVariantStatuses = (images: ImageReport[]) => {
  const counts = { existing: 0, failed: 0, migrated: 0, sourceMissing: 0 };
  for (const image of images) {
    for (const variant of image.variants) counts[variant.status] += 1;
  }
  return counts;
};

const main = async () => {
  const options = parseCommandOptions();
  const startedAt = new Date().toISOString();
  const inventory = await loadImageInventory(options.databaseUrl, options.concurrency);
  const selectedImages = options.limit
    ? inventory.images.slice(0, options.limit)
    : inventory.images;

  console.log(
    JSON.stringify(
      {
        execute: options.execute,
        invalidBlueprintImages: inventory.invalidBlueprintImages.length,
        rawBlueprints: inventory.rawBlueprintCount,
        rawOnlyBlueprints: inventory.rawOnlyBlueprintCount,
        selectedImages: selectedImages.length,
        summaries: inventory.summaryCount,
        uniqueImages: inventory.images.length,
      },
      null,
      2,
    ),
  );

  let images: ImageReport[] = [];
  if (options.execute) {
    const environment = imageR2EnvironmentSchema.parse(process.env);
    const client = new S3Client({
      credentials: {
        accessKeyId: environment.R2_ACCESS_KEY_ID,
        secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
      },
      endpoint: `https://${environment.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: "auto",
    });
    const existingObjectKeys = await listExistingImageObjectKeys(
      client,
      environment.R2_BUCKET,
      options.objectPrefix,
    );
    images = await mapWithConcurrency(selectedImages, options.concurrency, async (image, index) => {
      const report = await migrateImage(
        client,
        environment.R2_BUCKET,
        existingObjectKeys,
        image,
        options,
      );
      console.log(`${index + 1}/${selectedImages.length} ${image.imgurId}`);
      return report;
    });
  }

  const report = {
    dryRun: !options.execute,
    finishedAt: new Date().toISOString(),
    images,
    inventory,
    options: {
      concurrency: options.concurrency,
      databaseUrl: options.databaseUrl,
      limit: options.limit,
      maximumBytes: options.maximumBytes,
      objectPrefix: options.objectPrefix,
    },
    startedAt,
    variantStatuses: countVariantStatuses(images),
  };
  await mkdir(dirname(options.reportPath), { recursive: true });
  await writeFile(options.reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Report written to ${options.reportPath}`);

  if (report.variantStatuses.failed > 0) process.exitCode = 1;
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedModuleUrl) {
  await main();
}
