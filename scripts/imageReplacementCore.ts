import { rmSync } from "node:fs";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

// Applies a reviewed image-replacement round: each replacement is uploaded through the image
// Worker (which stores it in R2 and on Imgur) and saved on its blueprint straight away. The Worker
// deletes an upload no blueprint uses within an hour, so an upload is never left waiting for a
// later save, and progress is visible on the site as the round goes.

export const replacementDecisionsSchema = z.record(
  z.string(),
  z.enum(["replace", "keep", "delete", "skip"]),
);

export const replacementCandidatesSchema = z.array(
  z.looseObject({ currentImageId: z.string().nullable().optional(), key: z.string().min(1) }),
);

export const uploadPlanSchema = z.array(
  z.object({
    bytes: z.number().int().nonnegative(),
    file: z.string().min(1),
    key: z.string().min(1),
  }),
);

export const ReplacementStatus = {
  Conflict: "conflict",
  // The edit form raised a warning the runner refuses to force past; a person has to look.
  NeedsReview: "needsReview",
  Saved: "saved",
  UploadFailed: "uploadFailed",
  Uploaded: "uploaded",
} as const;

export type ReplacementStatus = (typeof ReplacementStatus)[keyof typeof ReplacementStatus];

const uploadRecordSchema = z.object({
  imageId: z.string().min(1),
  type: z.string().min(1),
  uploadedAt: z.string().datetime(),
});

const ledgerEntrySchema = z.object({
  previousImageId: z.string().nullable(),
  reason: z.string().optional(),
  savedAt: z.string().datetime().optional(),
  status: z.enum(ReplacementStatus),
  upload: uploadRecordSchema.optional(),
});

export const replacementLedgerSchema = z.object({
  entries: z.record(z.string(), ledgerEntrySchema),
  // When this round sent each upload, so a rerun within the same UTC hour respects the quota.
  uploadAttempts: z.array(z.string().datetime()),
  version: z.literal(2),
});

export type ReplacementLedger = z.infer<typeof replacementLedgerSchema>;
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;
export type UploadRecord = z.infer<typeof uploadRecordSchema>;

export const emptyReplacementLedger = (): ReplacementLedger => ({
  entries: {},
  uploadAttempts: [],
  version: 2,
});

// The Worker deletes an unsaved upload after an hour. Like the site's Create drafts, an upload is
// only reused while it is safely younger than that; an older one is uploaded again.
const uploadReuseMilliseconds = 45 * 60 * 1000;

export interface ReplacementItem {
  file: string;
  key: string;
  previousImageId: string | null;
  // An earlier upload whose save was never confirmed. The guard always checks for it, since the
  // save may have landed anyway; it is only attached again while uploadReusable.
  upload?: UploadRecord;
  uploadReusable?: boolean;
}

export interface BlockedReplacement {
  key: string;
  reason: string;
}

export interface ReplacementQueueInputs {
  candidates: z.infer<typeof replacementCandidatesSchema>;
  decisions: z.infer<typeof replacementDecisionsSchema>;
  holdKeys: string[];
  ledger: ReplacementLedger;
  now: Date;
  uploadPlan: z.infer<typeof uploadPlanSchema>;
}

export const buildReplacementQueue = ({
  candidates,
  decisions,
  holdKeys,
  ledger,
  now,
  uploadPlan,
}: ReplacementQueueInputs): { blocked: BlockedReplacement[]; queue: ReplacementItem[] } => {
  const held = new Set(holdKeys);
  const files = new Map(uploadPlan.map((entry) => [entry.key, entry.file]));
  const reviewed = new Map(
    candidates.map((candidate) => [candidate.key, candidate.currentImageId ?? null]),
  );
  const planOrder = new Map(uploadPlan.map((entry, index) => [entry.key, index]));
  const keys = Object.keys(decisions)
    .filter((key) => decisions[key] === "replace" && !held.has(key))
    .sort((left, right) => (planOrder.get(left) ?? Infinity) - (planOrder.get(right) ?? Infinity));

  const blocked: BlockedReplacement[] = [];
  const queue: ReplacementItem[] = [];
  for (const key of keys) {
    const entry = ledger.entries[key];
    if (
      entry?.status === ReplacementStatus.Saved ||
      entry?.status === ReplacementStatus.Conflict ||
      entry?.status === ReplacementStatus.NeedsReview
    )
      continue;
    const file = files.get(key);
    if (!file) {
      blocked.push({ key, reason: "no staged upload file in upload-plan.json" });
      continue;
    }
    if (!reviewed.has(key)) {
      blocked.push({
        key,
        reason: "no reviewed candidate, so no previous image to guard the save on",
      });
      continue;
    }
    const previousImageId = reviewed.get(key) ?? null;
    const upload = entry?.status === ReplacementStatus.Uploaded ? entry.upload : undefined;
    queue.push(
      upload
        ? {
            file,
            key,
            previousImageId,
            upload,
            uploadReusable: now.getTime() - Date.parse(upload.uploadedAt) < uploadReuseMilliseconds,
          }
        : { file, key, previousImageId },
    );
  }
  return { blocked, queue };
};

export type UploadState =
  | { imageId: string; kind: "uploaded"; type: string }
  | { kind: "rateLimited"; reason: string; retryAfterMilliseconds: number; spentQuota: boolean }
  | { kind: "failed"; reason: string }
  // `upload` is set when the Worker did store an image but the form never showed it.
  | { kind: "ambiguous"; reason: string; upload?: { imageId: string; type: string } };

export interface UploadResponse {
  body: string;
  retryAfter: string | null;
  status: number;
}

const defaultRetryAfterMilliseconds = 10 * 60 * 1000;

const parseRetryAfter = (retryAfter: string | null): number => {
  const seconds = Number(retryAfter);
  return retryAfter !== null && Number.isFinite(seconds) && seconds > 0
    ? seconds * 1000
    : defaultRetryAfterMilliseconds;
};

// workers/images/src/uploads.ts answers this when it cannot reach the quota store.
const quotaUnavailableBody = "Upload limits are temporarily unavailable";

const uploadedImageSchema = z.object({ id: z.string().min(1), type: z.string().min(1) });

// Reads the Worker's answer to POST /uploads (see workers/images/src/uploads.ts).
export const parseUploadResponse = ({ body, retryAfter, status }: UploadResponse): UploadState => {
  if (status === 200 || status === 201) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = undefined;
    }
    const image = uploadedImageSchema.safeParse(parsed);
    return image.success
      ? { imageId: image.data.id, kind: "uploaded", type: image.data.type }
      : {
          kind: "ambiguous",
          reason: `upload answered ${status} without an image id and type: ${body}`,
        };
  }
  if (status === 429 || status === 503) {
    return {
      kind: "rateLimited",
      reason: `${status} ${body}`,
      retryAfterMilliseconds: parseRetryAfter(retryAfter),
      // A 429 and the Worker's quota-store outage are answered before quota is consumed; any other
      // 503 (an R2 write failure) comes after, so it counts against this hour's uploads. Guessing
      // "spent" for an unknown 503 only slows the run down, never overruns the quota.
      spentQuota: status === 503 && body !== quotaUnavailableBody,
    };
  }
  if (status === 413 || status === 415 || status === 422) {
    return { kind: "failed", reason: `upload rejected with ${status}: ${body}` };
  }
  if (status === 401) {
    return {
      kind: "ambiguous",
      reason: "the Worker rejected the Factorio Prints sign-in; run with --login",
    };
  }
  return { kind: "ambiguous", reason: `upload answered ${status}: ${body}` };
};

const hourMilliseconds = 60 * 60 * 1000;
const hourBoundaryMarginMilliseconds = 5_000;

const utcHourStart = (time: number): number =>
  Math.floor(time / hourMilliseconds) * hourMilliseconds;

const attemptsThisHour = (attempts: string[], now: Date): string[] => {
  const hourStart = utcHourStart(now.getTime());
  return attempts.filter((attempt) => Date.parse(attempt) >= hourStart);
};

// The Worker allows each user a fixed number of uploads per UTC hour; once this hour's are spent,
// waiting for the next hour beats collecting 429s.
export const millisecondsUntilUploadAllowed = (
  attempts: string[],
  now: Date,
  uploadsPerHour: number,
): number => {
  if (attemptsThisHour(attempts, now).length < uploadsPerHour) return 0;
  return (
    utcHourStart(now.getTime()) + hourMilliseconds - now.getTime() + hourBoundaryMarginMilliseconds
  );
};

export const ImageState = {
  AlreadySaved: "alreadySaved",
  Conflict: "conflict",
  Replace: "replace",
} as const;

export type ImageState = (typeof ImageState)[keyof typeof ImageState];

// The save only goes ahead if the blueprint still holds the image that was reviewed, so an
// author's own fix made after the review is never overwritten.
export const classifyCurrentImage = (
  currentImageId: string | null,
  previousImageId: string | null,
  imageId?: string,
): ImageState => {
  if (imageId !== undefined && currentImageId === imageId) return ImageState.AlreadySaved;
  if (currentImageId === previousImageId) return ImageState.Replace;
  return ImageState.Conflict;
};

const imageExtensions: Readonly<Record<string, string>> = {
  "image/gif": "gif",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "image/png": "png",
};

// Mirrors src/helpers/buildImageUrl.ts, which Node can't import directly because of its enum.
export const gatewayImageUrl = (
  gatewayOrigin: string,
  imageId: string,
  type: string,
  // The values of src/helpers/buildImageUrl.ts's ImageVariant.
  variant: "original" | "large" | "thumbnail",
): string =>
  `${gatewayOrigin}/legacy-imgur/${imageId}/${variant}.${imageExtensions[type] ?? "png"}`;

export interface ReplacementObservation {
  firebaseImageId: string | null;
  originalStatus: number;
  thumbnailStatus: number;
}

// The view page shows the thumbnail, so a replacement is only live once that variant resolves too.
export const auditReplacement = (
  { imageId, type }: { imageId: string; type: string },
  gatewayOrigin: string,
  observed: ReplacementObservation,
): string[] => {
  const problems: string[] = [];
  if (observed.firebaseImageId !== imageId) {
    problems.push(`Firebase holds ${observed.firebaseImageId ?? "no image"}, not ${imageId}`);
  }
  if (observed.originalStatus !== 200) {
    problems.push(
      `${gatewayImageUrl(gatewayOrigin, imageId, type, "original")} returned ${observed.originalStatus}`,
    );
  }
  if (observed.thumbnailStatus !== 200) {
    problems.push(
      `${gatewayImageUrl(gatewayOrigin, imageId, type, "thumbnail")} returned ${observed.thumbnailStatus}`,
    );
  }
  return problems;
};

export type SaveOutcome =
  | { outcome: "saved" }
  | { detail: string; outcome: "failed" }
  | { detail: string; outcome: "needsReview" };

// Forcing past "Submission warnings" saves whatever the form holds. Cosmetic warnings (no tags, no
// name, no icons) are pre-existing and harmless, but forcing past "Could not parse blueprint."
// would push a broken blueprint string through, so that save is left for a person.
const unforceableWarnings = ["Could not parse blueprint."];

export const forceSaveRefusal = (warnings: string[]): string | undefined => {
  const refused = warnings.filter((warning) => unforceableWarnings.includes(warning.trim()));
  return refused.length > 0 ? `the edit form warns: ${refused.join(" ")}` : undefined;
};

const roundLockName = "replacement.lock";

// Two runs on one round would race on the ledger and double-spend uploads, so a run holds a
// lockfile in the round directory. The returned release is synchronous so a signal handler can
// call it.
export const acquireRoundLock = async (round: string, owner: string): Promise<() => void> => {
  const path = join(round, roundLockName);
  let handle;
  try {
    handle = await open(path, "wx");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const holder = await open(path, "r")
      .then(async (existing) => {
        try {
          return (await existing.readFile("utf8")).trim();
        } finally {
          await existing.close();
        }
      })
      .catch(() => "unknown holder");
    throw new Error(
      `another run holds ${path} (${holder}); if no run is active, delete it and rerun`,
    );
  }
  try {
    await handle.writeFile(`${owner}\n`);
  } finally {
    await handle.close();
  }
  return () => rmSync(path, { force: true });
};

export interface ReplacementDependencies {
  confirmSaved: (key: string, imageId: string) => Promise<boolean>;
  currentImageId: (key: string) => Promise<string | null>;
  log: (message: string) => void;
  now: () => Date;
  persistLedger: (ledger: ReplacementLedger) => Promise<void>;
  // Saves the edit form that uploadImage left open for this key.
  saveImage: (key: string, imageId: string) => Promise<SaveOutcome>;
  sleep: (milliseconds: number) => Promise<void>;
  // Opens the blueprint's edit form and attaches the file through the image Worker; with `reuse`,
  // attaches that earlier upload again without sending a new one.
  uploadImage: (key: string, file: string, reuse?: UploadRecord) => Promise<UploadState>;
}

export interface ReplacementOptions {
  maximumConsecutiveRateLimits: number;
  maximumConsecutiveSaveFailures: number;
  uploadSpacingMilliseconds: number;
  uploadsPerHour: number;
}

export interface ReplacementResult {
  ledger: ReplacementLedger;
  stoppedReason?: string;
}

export const runReplacementLoop = async (
  queue: ReplacementItem[],
  initialLedger: ReplacementLedger,
  dependencies: ReplacementDependencies,
  options: ReplacementOptions,
): Promise<ReplacementResult> => {
  const ledger: ReplacementLedger = structuredClone(initialLedger);
  const record = async (key: string, entry: LedgerEntry): Promise<void> => {
    ledger.entries[key] = entry;
    await dependencies.persistLedger(ledger);
  };
  let consecutiveSaveFailures = 0;
  let uploadedBefore = false;

  for (const [index, item] of queue.entries()) {
    const progress = `${index + 1}/${queue.length} ${item.key}`;
    const { previousImageId } = item;

    const current = await dependencies.currentImageId(item.key);
    // Whatever its age, an earlier upload may have been saved by a run that could not confirm it.
    const state = classifyCurrentImage(current, previousImageId, item.upload?.imageId);
    if (state === ImageState.AlreadySaved && item.upload) {
      await record(item.key, {
        previousImageId,
        savedAt: dependencies.now().toISOString(),
        status: ReplacementStatus.Saved,
        upload: item.upload,
      });
      dependencies.log(`${progress}: already saved ${item.upload.imageId}`);
      continue;
    }
    if (state === ImageState.Conflict) {
      const reason = `Firebase holds ${current ?? "no image"}, not the reviewed ${previousImageId ?? "no image"}`;
      dependencies.log(`${progress}: not saved, ${reason}`);
      await record(item.key, {
        previousImageId,
        reason,
        status: ReplacementStatus.Conflict,
        ...(item.upload && { upload: item.upload }),
      });
      continue;
    }

    let upload = item.uploadReusable ? item.upload : undefined;
    if (upload) {
      const reattached = await dependencies.uploadImage(item.key, item.file, upload);
      if (reattached.kind !== "uploaded" || reattached.imageId !== upload.imageId) {
        return {
          ledger,
          stoppedReason: `could not attach the earlier upload ${upload.imageId} for ${item.key}`,
        };
      }
    } else {
      let consecutiveRateLimits = 0;
      for (;;) {
        const wait = millisecondsUntilUploadAllowed(
          ledger.uploadAttempts,
          dependencies.now(),
          options.uploadsPerHour,
        );
        if (wait > 0) {
          dependencies.log(
            `${progress}: hourly upload budget spent, waiting ${Math.ceil(wait / 60_000)} minutes`,
          );
          await dependencies.sleep(wait);
        } else if (uploadedBefore) {
          await dependencies.sleep(options.uploadSpacingMilliseconds);
        }
        uploadedBefore = true;
        const uploadState = await dependencies.uploadImage(item.key, item.file);
        if (uploadState.kind === "rateLimited") {
          consecutiveRateLimits += 1;
          if (consecutiveRateLimits >= options.maximumConsecutiveRateLimits) {
            return {
              ledger,
              stoppedReason: `upload rate limited ${consecutiveRateLimits} times in a row (last: ${uploadState.reason}); rerun later to resume`,
            };
          }
          if (uploadState.spentQuota) {
            const attemptedAt = dependencies.now();
            ledger.uploadAttempts = [
              ...attemptsThisHour(ledger.uploadAttempts, attemptedAt),
              attemptedAt.toISOString(),
            ];
            await dependencies.persistLedger(ledger);
          }
          dependencies.log(
            `${progress}: ${uploadState.reason}, waiting ${uploadState.retryAfterMilliseconds / 60_000} minutes`,
          );
          await dependencies.sleep(uploadState.retryAfterMilliseconds);
          uploadedBefore = false;
          continue;
        }
        const attemptedAt = dependencies.now();
        ledger.uploadAttempts = [
          ...attemptsThisHour(ledger.uploadAttempts, attemptedAt),
          attemptedAt.toISOString(),
        ];
        if (uploadState.kind === "ambiguous") {
          if (uploadState.upload) {
            // Keep the stored image for diagnosis; it also lets the guard and a reattach find it.
            ledger.entries[item.key] = {
              previousImageId,
              reason: uploadState.reason,
              status: ReplacementStatus.Uploaded,
              upload: { ...uploadState.upload, uploadedAt: attemptedAt.toISOString() },
            };
          }
          await dependencies.persistLedger(ledger);
          return {
            ledger,
            stoppedReason: `ambiguous upload for ${item.key}: ${uploadState.reason}`,
          };
        }
        if (uploadState.kind === "failed") {
          dependencies.log(`${progress}: upload failed, ${uploadState.reason}`);
          await record(item.key, {
            previousImageId,
            reason: uploadState.reason,
            status: ReplacementStatus.UploadFailed,
          });
          break;
        }
        upload = {
          imageId: uploadState.imageId,
          type: uploadState.type,
          uploadedAt: attemptedAt.toISOString(),
        };
        await record(item.key, { previousImageId, status: ReplacementStatus.Uploaded, upload });
        dependencies.log(`${progress}: uploaded ${upload.imageId}`);
        break;
      }
    }
    if (!upload) continue;

    const saved = await dependencies.saveImage(item.key, upload.imageId);
    if (saved.outcome === "needsReview") {
      // The form reached its warning dialog, so the site session works.
      consecutiveSaveFailures = 0;
      dependencies.log(`${progress}: not saved, ${saved.detail}`);
      await record(item.key, {
        previousImageId,
        reason: saved.detail,
        status: ReplacementStatus.NeedsReview,
        upload,
      });
      continue;
    }
    if (saved.outcome === "failed") {
      consecutiveSaveFailures += 1;
      dependencies.log(`${progress}: save failed, ${saved.detail}`);
      await record(item.key, {
        previousImageId,
        reason: saved.detail,
        status: ReplacementStatus.Uploaded,
        upload,
      });
      if (consecutiveSaveFailures >= options.maximumConsecutiveSaveFailures) {
        return {
          ledger,
          stoppedReason: `${consecutiveSaveFailures} saves failed in a row (last: ${saved.detail}); check the Factorio Prints sign-in, then rerun`,
        };
      }
      continue;
    }
    consecutiveSaveFailures = 0;

    if (!(await dependencies.confirmSaved(item.key, upload.imageId))) {
      dependencies.log(`${progress}: save not visible in Firebase yet`);
      await record(item.key, {
        previousImageId,
        reason: `Firebase does not show ${upload.imageId} yet`,
        status: ReplacementStatus.Uploaded,
        upload,
      });
      continue;
    }
    await record(item.key, {
      previousImageId,
      savedAt: dependencies.now().toISOString(),
      status: ReplacementStatus.Saved,
      upload,
    });
    dependencies.log(`${progress}: saved ${upload.imageId}`);
  }
  return { ledger };
};
