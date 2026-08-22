import { z } from "zod";
import {
  type BackfillImage,
  buildR2ObjectKey,
  type ImageVariant,
  imageVariants,
} from "./imageBackfillCore.ts";

export const ReconciliationStatus = {
  Deferred: "deferred",
  Exhausted: "exhausted",
  Existing: "existing",
  Failed: "failed",
  Migrated: "migrated",
  Planned: "planned",
  SourceMissing: "sourceMissing",
} as const;

export type ReconciliationStatus = (typeof ReconciliationStatus)[keyof typeof ReconciliationStatus];

export const RetryFailureKind = {
  Failed: "failed",
  SourceMissing: "sourceMissing",
} as const;

export type RetryFailureKind = (typeof RetryFailureKind)[keyof typeof RetryFailureKind];

const retryStateSchema = z.object({
  attempts: z.number().int().positive(),
  failureKind: z.enum(RetryFailureKind),
  firstObservedAt: z.string().datetime(),
  lastAttemptAt: z.string().datetime(),
  nextAttemptAt: z.string().datetime(),
  reason: z.string().min(1),
});

export const reconciliationCheckpointSchema = z.object({
  variants: z.record(z.string(), retryStateSchema),
  version: z.literal(1),
});

export type ReconciliationCheckpoint = z.infer<typeof reconciliationCheckpointSchema>;
export type RetryState = z.infer<typeof retryStateSchema>;

export interface ReconciliationAction {
  attempts: number;
  blueprintIds: string[];
  failureKind?: RetryFailureKind;
  firstObservedAt?: string;
  imgurId: string;
  key: string;
  mediaTypes: BackfillImage["mediaTypes"];
  nextAttemptAt?: string;
  reason?: string;
  status: ReconciliationStatus;
  variant: ImageVariant;
}

export interface ReconciliationAlertInputs {
  deferredVariants: number;
  exhaustedVariants: number;
  failedVariants: number;
  oldestIncompleteAt: string | null;
  reconciliationLagSeconds: number;
  sourceMissingVariants: number;
}

export const emptyReconciliationCheckpoint = (): ReconciliationCheckpoint => ({
  variants: {},
  version: 1,
});

const classifyMissingVariant = (
  retryState: RetryState | undefined,
  observedAt: Date,
  maximumAttempts: number,
): ReconciliationStatus => {
  if (!retryState) return ReconciliationStatus.Planned;
  if (retryState.attempts >= maximumAttempts) return ReconciliationStatus.Exhausted;
  if (new Date(retryState.nextAttemptAt) > observedAt) return ReconciliationStatus.Deferred;
  return ReconciliationStatus.Planned;
};

export const buildReconciliationActions = (
  images: BackfillImage[],
  existingObjectKeys: Set<string>,
  checkpoint: ReconciliationCheckpoint,
  objectPrefix: string,
  observedAt: Date,
  maximumAttempts: number,
): ReconciliationAction[] => {
  if (!Number.isInteger(maximumAttempts) || maximumAttempts < 1) {
    throw new Error("Maximum attempts must be a positive integer");
  }
  return images.flatMap((image) =>
    imageVariants.map((variant) => {
      const key = buildR2ObjectKey(objectPrefix, image.imgurId, variant);
      const retryState = checkpoint.variants[key];
      const status = existingObjectKeys.has(key)
        ? ReconciliationStatus.Existing
        : classifyMissingVariant(retryState, observedAt, maximumAttempts);
      return {
        attempts: retryState?.attempts ?? 0,
        blueprintIds: image.blueprintIds,
        failureKind: retryState?.failureKind,
        firstObservedAt: retryState?.firstObservedAt,
        imgurId: image.imgurId,
        key,
        mediaTypes: image.mediaTypes,
        nextAttemptAt: retryState?.nextAttemptAt,
        reason: retryState?.reason,
        status,
        variant,
      };
    }),
  );
};

export const recordReconciliationFailure = (
  checkpoint: ReconciliationCheckpoint,
  key: string,
  failureKind: RetryFailureKind,
  reason: string,
  attemptedAt: Date,
  retryDelayMilliseconds: number,
): RetryState => {
  if (!Number.isSafeInteger(retryDelayMilliseconds) || retryDelayMilliseconds < 1) {
    throw new Error("Retry delay must be a positive integer number of milliseconds");
  }
  const previousState = checkpoint.variants[key];
  const attemptedAtText = attemptedAt.toISOString();
  const retryState = {
    attempts: (previousState?.attempts ?? 0) + 1,
    failureKind,
    firstObservedAt: previousState?.firstObservedAt ?? attemptedAtText,
    lastAttemptAt: attemptedAtText,
    nextAttemptAt: new Date(attemptedAt.getTime() + retryDelayMilliseconds).toISOString(),
    reason,
  };
  checkpoint.variants[key] = retryState;
  return retryState;
};

export const pruneReconciledCheckpointEntries = (
  checkpoint: ReconciliationCheckpoint,
  existingObjectKeys: Set<string>,
): number => {
  let removedEntries = 0;
  for (const key of Object.keys(checkpoint.variants)) {
    if (!existingObjectKeys.has(key)) continue;
    delete checkpoint.variants[key];
    removedEntries += 1;
  }
  return removedEntries;
};

export const countReconciliationStatuses = (
  actions: ReconciliationAction[],
): Record<ReconciliationStatus, number> => {
  const counts = {
    [ReconciliationStatus.Deferred]: 0,
    [ReconciliationStatus.Exhausted]: 0,
    [ReconciliationStatus.Existing]: 0,
    [ReconciliationStatus.Failed]: 0,
    [ReconciliationStatus.Migrated]: 0,
    [ReconciliationStatus.Planned]: 0,
    [ReconciliationStatus.SourceMissing]: 0,
  };
  for (const action of actions) counts[action.status] += 1;
  return counts;
};

export const buildReconciliationAlertInputs = (
  actions: ReconciliationAction[],
  observedAt: Date,
): ReconciliationAlertInputs => {
  const counts = countReconciliationStatuses(actions);
  const firstObservedTimes = actions
    .filter((action) => action.status !== ReconciliationStatus.Existing)
    .map((action) => action.firstObservedAt)
    .filter((value): value is string => value !== undefined)
    .map((value) => new Date(value).getTime());
  const oldestIncompleteTime =
    firstObservedTimes.length > 0 ? Math.min(...firstObservedTimes) : null;

  return {
    deferredVariants: counts.deferred,
    exhaustedVariants: counts.exhausted,
    failedVariants: counts.failed,
    oldestIncompleteAt:
      oldestIncompleteTime === null ? null : new Date(oldestIncompleteTime).toISOString(),
    reconciliationLagSeconds:
      oldestIncompleteTime === null
        ? 0
        : Math.max(0, Math.floor((observedAt.getTime() - oldestIncompleteTime) / 1_000)),
    sourceMissingVariants: actions.filter(
      (action) => action.failureKind === RetryFailureKind.SourceMissing,
    ).length,
  };
};
