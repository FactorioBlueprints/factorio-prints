import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  imageR2EnvironmentSchema,
  listExistingImageObjectKeys,
  loadImageInventory,
  putAndVerifyImageObject,
} from "./backfillImages.ts";
import {
  buildImgurSourceUrls,
  downloadImageVariant,
  mapWithConcurrency,
  SourceImageMissingError,
} from "./imageBackfillCore.ts";
import {
  buildReconciliationActions,
  buildReconciliationAlertInputs,
  countReconciliationStatuses,
  emptyReconciliationCheckpoint,
  pruneReconciledCheckpointEntries,
  type ReconciliationAction,
  type ReconciliationCheckpoint,
  reconciliationCheckpointSchema,
  ReconciliationStatus,
  recordReconciliationFailure,
  RetryFailureKind,
} from "./imageReconciliationCore.ts";

const defaultDatabaseUrl = "https://facorio-blueprints.firebaseio.com";
const defaultObjectPrefix = "legacy-imgur";
const defaultReportPath = ".llm/image-reconciliation-report.json";
const defaultCheckpointPath = ".llm/image-reconciliation-checkpoint.json";

interface CommandOptions {
  checkpointObjectKey?: string;
  checkpointPath: string;
  concurrency: number;
  databaseUrl: string;
  execute: boolean;
  limit?: number;
  maximumAttempts: number;
  maximumBytes: number;
  objectPrefix: string;
  reportPath: string;
  reportObjectKey?: string;
  retryDelayMilliseconds: number;
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
      checkpoint: { default: defaultCheckpointPath, type: "string" },
      "checkpoint-object-key": { type: "string" },
      concurrency: { default: "8", type: "string" },
      "database-url": { default: defaultDatabaseUrl, type: "string" },
      execute: { default: false, type: "boolean" },
      limit: { type: "string" },
      "maximum-attempts": { default: "3", type: "string" },
      "maximum-megabytes": { default: "20", type: "string" },
      prefix: { default: defaultObjectPrefix, type: "string" },
      report: { default: defaultReportPath, type: "string" },
      "report-object-key": { type: "string" },
      "retry-delay-hours": { default: "168", type: "string" },
    },
    strict: true,
  });

  return {
    checkpointObjectKey: values["checkpoint-object-key"],
    checkpointPath: resolve(values.checkpoint),
    concurrency: parsePositiveInteger(values.concurrency, "--concurrency"),
    databaseUrl: values["database-url"].replace(/\/+$/, ""),
    execute: values.execute,
    limit: values.limit ? parsePositiveInteger(values.limit, "--limit") : undefined,
    maximumAttempts: parsePositiveInteger(values["maximum-attempts"], "--maximum-attempts"),
    maximumBytes:
      parsePositiveInteger(values["maximum-megabytes"], "--maximum-megabytes") * 1_000_000,
    objectPrefix: values.prefix.replace(/^\/+|\/+$/g, ""),
    reportPath: resolve(values.report),
    reportObjectKey: values["report-object-key"],
    retryDelayMilliseconds:
      parsePositiveInteger(values["retry-delay-hours"], "--retry-delay-hours") * 60 * 60 * 1_000,
  };
};

const isFileMissingError = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

const loadLocalCheckpoint = async (checkpointPath: string): Promise<ReconciliationCheckpoint> => {
  try {
    return reconciliationCheckpointSchema.parse(JSON.parse(await readFile(checkpointPath, "utf8")));
  } catch (error) {
    if (isFileMissingError(error)) return emptyReconciliationCheckpoint();
    throw error;
  }
};

export const loadR2Checkpoint = async (
  client: S3Client,
  bucket: string,
  objectKey: string,
): Promise<ReconciliationCheckpoint> => {
  try {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
    if (!response.Body) throw new Error(`R2 checkpoint ${objectKey} has no body`);
    return reconciliationCheckpointSchema.parse(
      JSON.parse(await response.Body.transformToString()),
    );
  } catch (error) {
    if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) {
      return emptyReconciliationCheckpoint();
    }
    throw error;
  }
};

const writeJsonAtomically = async (filePath: string, value: unknown): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
  const pendingPath = `${filePath}.pending`;
  await writeFile(pendingPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(pendingPath, filePath);
};

export const writeR2Json = async (
  client: S3Client,
  bucket: string,
  objectKey: string,
  value: unknown,
  immutable: boolean,
): Promise<void> => {
  await client.send(
    new PutObjectCommand({
      Body: `${JSON.stringify(value, null, 2)}\n`,
      Bucket: bucket,
      CacheControl: "no-store",
      ContentType: "application/json",
      IfNoneMatch: immutable ? "*" : undefined,
      Key: objectKey,
    }),
  );
};

const executeReconciliationAction = async (
  client: S3Client,
  bucket: string,
  action: ReconciliationAction,
  checkpoint: ReconciliationCheckpoint,
  options: CommandOptions,
  attemptedAt: Date,
  persistCheckpoint: () => Promise<void>,
): Promise<ReconciliationAction> => {
  const image = {
    blueprintIds: action.blueprintIds,
    imgurId: action.imgurId,
    mediaTypes: action.mediaTypes,
  };

  try {
    const downloadedImage = await downloadImageVariant(
      buildImgurSourceUrls(image, action.variant),
      {
        delay: async (milliseconds) =>
          new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds)),
        fetcher: fetch,
        maximumAttempts: 3,
        maximumBytes: options.maximumBytes,
        requestTimeoutMilliseconds: 20_000,
      },
    );
    await putAndVerifyImageObject(client, bucket, action.key, image, downloadedImage);
    delete checkpoint.variants[action.key];
    await persistCheckpoint();
    return {
      ...action,
      attempts: action.attempts + 1,
      failureKind: undefined,
      firstObservedAt: action.firstObservedAt ?? attemptedAt.toISOString(),
      nextAttemptAt: undefined,
      reason: undefined,
      status: ReconciliationStatus.Migrated,
    };
  } catch (error) {
    const failureKind =
      error instanceof SourceImageMissingError
        ? RetryFailureKind.SourceMissing
        : RetryFailureKind.Failed;
    const reason = error instanceof Error ? error.message : String(error);
    const retryState = recordReconciliationFailure(
      checkpoint,
      action.key,
      failureKind,
      reason,
      attemptedAt,
      options.retryDelayMilliseconds,
    );
    await persistCheckpoint();
    return {
      ...action,
      attempts: retryState.attempts,
      failureKind,
      firstObservedAt: retryState.firstObservedAt,
      nextAttemptAt: retryState.nextAttemptAt,
      reason,
      status:
        retryState.attempts >= options.maximumAttempts
          ? ReconciliationStatus.Exhausted
          : failureKind === RetryFailureKind.SourceMissing
            ? ReconciliationStatus.SourceMissing
            : ReconciliationStatus.Failed,
    };
  }
};

const main = async () => {
  const options = parseCommandOptions();
  const observedAt = new Date();
  const environment = imageR2EnvironmentSchema.parse(process.env);
  const client = new S3Client({
    credentials: {
      accessKeyId: environment.R2_ACCESS_KEY_ID,
      secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
    },
    endpoint: `https://${environment.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: "auto",
  });
  const [inventory, existingObjectKeys, checkpoint] = await Promise.all([
    loadImageInventory(options.databaseUrl, options.concurrency),
    listExistingImageObjectKeys(client, environment.R2_BUCKET, options.objectPrefix),
    options.checkpointObjectKey
      ? loadR2Checkpoint(client, environment.R2_BUCKET, options.checkpointObjectKey)
      : loadLocalCheckpoint(options.checkpointPath),
  ]);
  const selectedImages = options.limit
    ? inventory.images.slice(0, options.limit)
    : inventory.images;
  const removedCheckpointEntries = pruneReconciledCheckpointEntries(checkpoint, existingObjectKeys);
  const actions = buildReconciliationActions(
    selectedImages,
    existingObjectKeys,
    checkpoint,
    options.objectPrefix,
    observedAt,
    options.maximumAttempts,
  );

  let checkpointWrites = Promise.resolve();
  const persistCheckpoint = (): Promise<void> => {
    const snapshot = structuredClone(checkpoint);
    checkpointWrites = checkpointWrites.then(async () => {
      await writeJsonAtomically(options.checkpointPath, snapshot);
      if (options.checkpointObjectKey) {
        await writeR2Json(
          client,
          environment.R2_BUCKET,
          options.checkpointObjectKey,
          snapshot,
          false,
        );
      }
    });
    return checkpointWrites;
  };
  if (options.execute && removedCheckpointEntries > 0) await persistCheckpoint();

  const plannedActions = actions.filter((action) => action.status === ReconciliationStatus.Planned);
  const completedActions = options.execute
    ? await mapWithConcurrency(plannedActions, options.concurrency, async (action) =>
        executeReconciliationAction(
          client,
          environment.R2_BUCKET,
          action,
          checkpoint,
          options,
          new Date(),
          persistCheckpoint,
        ),
      )
    : [];
  await checkpointWrites;
  const completedActionsByKey = new Map(completedActions.map((action) => [action.key, action]));
  const finalActions = actions.map((action) => completedActionsByKey.get(action.key) ?? action);
  const expectedObjectKeys = new Set(actions.map((action) => action.key));
  const orphanedObjectKeys = options.limit
    ? null
    : [...existingObjectKeys].filter((key) => !expectedObjectKeys.has(key)).sort();
  const finishedAt = new Date();
  const report = {
    alertInputs: {
      ...buildReconciliationAlertInputs(finalActions, finishedAt),
      orphanedObjects: orphanedObjectKeys?.length ?? null,
    },
    checkpoint: {
      objectKey: options.checkpointObjectKey,
      path: options.checkpointPath,
      removedEntries: removedCheckpointEntries,
      retryEntries: Object.keys(checkpoint.variants).length,
    },
    dryRun: !options.execute,
    finishedAt: finishedAt.toISOString(),
    inventory: {
      invalidBlueprintImages: inventory.invalidBlueprintImages,
      rawBlueprints: inventory.rawBlueprintCount,
      rawOnlyBlueprints: inventory.rawOnlyBlueprintCount,
      selectedImages: selectedImages.length,
      summaries: inventory.summaryCount,
      uniqueImages: inventory.images.length,
    },
    options: {
      concurrency: options.concurrency,
      databaseUrl: options.databaseUrl,
      limit: options.limit,
      maximumAttempts: options.maximumAttempts,
      maximumBytes: options.maximumBytes,
      objectPrefix: options.objectPrefix,
      retryDelayMilliseconds: options.retryDelayMilliseconds,
    },
    orphanedObjectKeys,
    startedAt: observedAt.toISOString(),
    variantStatuses: countReconciliationStatuses(finalActions),
    variants: finalActions.filter((action) => action.status !== ReconciliationStatus.Existing),
  };
  await writeJsonAtomically(options.reportPath, report);
  if (options.execute && options.reportObjectKey) {
    await writeR2Json(client, environment.R2_BUCKET, options.reportObjectKey, report, true);
  }
  console.log(JSON.stringify(report, null, 2));

  if (report.variantStatuses.failed > 0) process.exitCode = 1;
};

const invokedModuleUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedModuleUrl) await main();
