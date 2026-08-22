import {
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { spawnSync } from "node:child_process";
import {
  buildReconciliationActions,
  buildReconciliationAlertInputs,
  countReconciliationStatuses,
  emptyReconciliationCheckpoint,
  pruneReconciledCheckpointEntries,
  reconciliationCheckpointSchema,
  ReconciliationStatus,
  recordReconciliationFailure,
  RetryFailureKind,
} from "../scripts/imageReconciliationCore";
import { loadR2Checkpoint, writeR2Json } from "../scripts/reconcileImages";

const observedAt = new Date("2000-01-08T00:00:00.000Z");
const retryDelayMilliseconds = 7 * 24 * 60 * 60 * 1_000;

describe("image reconciliation planning", () => {
  test("classifies existing, eligible, deferred, and exhausted variants", () => {
    const checkpoint = reconciliationCheckpointSchema.parse({
      variants: {
        "legacy-imgur/imageAlice/large": {
          attempts: 3,
          failureKind: "sourceMissing",
          firstObservedAt: "1999-12-01T00:00:00.000Z",
          lastAttemptAt: "2000-01-01T00:00:00.000Z",
          nextAttemptAt: "2000-01-08T00:00:00.000Z",
          reason: "Imgur returned no image",
        },
        "legacy-imgur/imageAlice/thumbnail": {
          attempts: 1,
          failureKind: "failed",
          firstObservedAt: "2000-01-01T00:00:00.000Z",
          lastAttemptAt: "2000-01-07T00:00:00.000Z",
          nextAttemptAt: "2000-01-14T00:00:00.000Z",
          reason: "HTTP 503",
        },
      },
      version: 1,
    });

    const actions = buildReconciliationActions(
      [
        {
          blueprintIds: ["blueprint-alice"],
          imgurId: "imageAlice",
          mediaTypes: ["image/png"],
        },
        {
          blueprintIds: ["blueprint-bob"],
          imgurId: "imageBob",
          mediaTypes: ["image/jpeg"],
        },
      ],
      new Set([
        "legacy-imgur/imageAlice/original",
        "legacy-imgur/imageBob/original",
        "legacy-imgur/imageBob/thumbnail",
      ]),
      checkpoint,
      "legacy-imgur",
      observedAt,
      3,
    );

    expect(actions).toStrictEqual([
      {
        attempts: 0,
        blueprintIds: ["blueprint-alice"],
        failureKind: undefined,
        firstObservedAt: undefined,
        imgurId: "imageAlice",
        key: "legacy-imgur/imageAlice/original",
        mediaTypes: ["image/png"],
        nextAttemptAt: undefined,
        reason: undefined,
        status: ReconciliationStatus.Existing,
        variant: "original",
      },
      {
        attempts: 1,
        blueprintIds: ["blueprint-alice"],
        failureKind: RetryFailureKind.Failed,
        firstObservedAt: "2000-01-01T00:00:00.000Z",
        imgurId: "imageAlice",
        key: "legacy-imgur/imageAlice/thumbnail",
        mediaTypes: ["image/png"],
        nextAttemptAt: "2000-01-14T00:00:00.000Z",
        reason: "HTTP 503",
        status: ReconciliationStatus.Deferred,
        variant: "thumbnail",
      },
      {
        attempts: 3,
        blueprintIds: ["blueprint-alice"],
        failureKind: RetryFailureKind.SourceMissing,
        firstObservedAt: "1999-12-01T00:00:00.000Z",
        imgurId: "imageAlice",
        key: "legacy-imgur/imageAlice/large",
        mediaTypes: ["image/png"],
        nextAttemptAt: "2000-01-08T00:00:00.000Z",
        reason: "Imgur returned no image",
        status: ReconciliationStatus.Exhausted,
        variant: "large",
      },
      {
        attempts: 0,
        blueprintIds: ["blueprint-bob"],
        failureKind: undefined,
        firstObservedAt: undefined,
        imgurId: "imageBob",
        key: "legacy-imgur/imageBob/original",
        mediaTypes: ["image/jpeg"],
        nextAttemptAt: undefined,
        reason: undefined,
        status: ReconciliationStatus.Existing,
        variant: "original",
      },
      {
        attempts: 0,
        blueprintIds: ["blueprint-bob"],
        failureKind: undefined,
        firstObservedAt: undefined,
        imgurId: "imageBob",
        key: "legacy-imgur/imageBob/thumbnail",
        mediaTypes: ["image/jpeg"],
        nextAttemptAt: undefined,
        reason: undefined,
        status: ReconciliationStatus.Existing,
        variant: "thumbnail",
      },
      {
        attempts: 0,
        blueprintIds: ["blueprint-bob"],
        failureKind: undefined,
        firstObservedAt: undefined,
        imgurId: "imageBob",
        key: "legacy-imgur/imageBob/large",
        mediaTypes: ["image/jpeg"],
        nextAttemptAt: undefined,
        reason: undefined,
        status: ReconciliationStatus.Planned,
        variant: "large",
      },
    ]);
  });

  test("records bounded cross-run failures and prunes variants already present in R2", () => {
    const checkpoint = emptyReconciliationCheckpoint();
    const firstFailure = recordReconciliationFailure(
      checkpoint,
      "legacy-imgur/imageAlice/thumbnail",
      RetryFailureKind.SourceMissing,
      "Imgur returned no image",
      observedAt,
      retryDelayMilliseconds,
    );
    const secondFailure = recordReconciliationFailure(
      checkpoint,
      "legacy-imgur/imageAlice/thumbnail",
      RetryFailureKind.SourceMissing,
      "Imgur returned no image",
      new Date("2000-01-15T00:00:00.000Z"),
      retryDelayMilliseconds,
    );

    expect({ firstFailure, secondFailure }).toStrictEqual({
      firstFailure: {
        attempts: 1,
        failureKind: RetryFailureKind.SourceMissing,
        firstObservedAt: "2000-01-08T00:00:00.000Z",
        lastAttemptAt: "2000-01-08T00:00:00.000Z",
        nextAttemptAt: "2000-01-15T00:00:00.000Z",
        reason: "Imgur returned no image",
      },
      secondFailure: {
        attempts: 2,
        failureKind: RetryFailureKind.SourceMissing,
        firstObservedAt: "2000-01-08T00:00:00.000Z",
        lastAttemptAt: "2000-01-15T00:00:00.000Z",
        nextAttemptAt: "2000-01-22T00:00:00.000Z",
        reason: "Imgur returned no image",
      },
    });
    expect(
      pruneReconciledCheckpointEntries(checkpoint, new Set(["legacy-imgur/imageAlice/thumbnail"])),
    ).toBe(1);
    expect(checkpoint).toStrictEqual({ variants: {}, version: 1 });
  });

  test("rejects invalid retry controls", () => {
    expect(() =>
      buildReconciliationActions(
        [],
        new Set(),
        emptyReconciliationCheckpoint(),
        "legacy-imgur",
        observedAt,
        0,
      ),
    ).toThrow(new Error("Maximum attempts must be a positive integer"));
    expect(() =>
      recordReconciliationFailure(
        emptyReconciliationCheckpoint(),
        "legacy-imgur/imageAlice/original",
        RetryFailureKind.Failed,
        "HTTP 503",
        observedAt,
        0,
      ),
    ).toThrow(new Error("Retry delay must be a positive integer number of milliseconds"));
  });
});

describe("image reconciliation reporting", () => {
  test("emits complete status counts and alert-ready lag inputs", () => {
    const actions = buildReconciliationActions(
      [
        {
          blueprintIds: ["blueprint-alice"],
          imgurId: "imageAlice",
          mediaTypes: ["image/png"],
        },
      ],
      new Set(["legacy-imgur/imageAlice/original"]),
      reconciliationCheckpointSchema.parse({
        variants: {
          "legacy-imgur/imageAlice/large": {
            attempts: 3,
            failureKind: "sourceMissing",
            firstObservedAt: "2000-01-01T00:00:00.000Z",
            lastAttemptAt: "2000-01-08T00:00:00.000Z",
            nextAttemptAt: "2000-01-15T00:00:00.000Z",
            reason: "Imgur returned no image",
          },
          "legacy-imgur/imageAlice/thumbnail": {
            attempts: 1,
            failureKind: "failed",
            firstObservedAt: "2000-01-07T00:00:00.000Z",
            lastAttemptAt: "2000-01-07T00:00:00.000Z",
            nextAttemptAt: "2000-01-14T00:00:00.000Z",
            reason: "HTTP 503",
          },
        },
        version: 1,
      }),
      "legacy-imgur",
      observedAt,
      3,
    );

    expect(countReconciliationStatuses(actions)).toStrictEqual({
      deferred: 1,
      exhausted: 1,
      existing: 1,
      failed: 0,
      migrated: 0,
      planned: 0,
      sourceMissing: 0,
    });
    expect(buildReconciliationAlertInputs(actions, observedAt)).toStrictEqual({
      deferredVariants: 1,
      exhaustedVariants: 1,
      failedVariants: 0,
      oldestIncompleteAt: "2000-01-01T00:00:00.000Z",
      reconciliationLagSeconds: 604_800,
      sourceMissingVariants: 1,
    });
  });
});

describe("image reconciliation operations", () => {
  test("runs directly under Node's TypeScript stripping", () => {
    const result = spawnSync(process.execPath, ["scripts/reconcileImages.ts", "--limit=0"], {
      encoding: "utf8",
    });
    const errorMessage = /^Error: (.+)$/m.exec(result.stderr)?.[1] ?? null;

    expect({
      errorMessage,
      signal: result.signal,
      status: result.status,
      stdout: result.stdout,
    }).toStrictEqual({
      errorMessage: "--limit must be a positive integer",
      signal: null,
      status: 1,
      stdout: "",
    });
  });

  test("loads a valid checkpoint from its private R2 operations key", async () => {
    const transformToString = vi.fn().mockResolvedValue(
      JSON.stringify({
        variants: {
          "legacy-imgur/imageAlice/original": {
            attempts: 1,
            failureKind: "sourceMissing",
            firstObservedAt: "2000-01-01T00:00:00.000Z",
            lastAttemptAt: "2000-01-01T00:00:00.000Z",
            nextAttemptAt: "2000-01-08T00:00:00.000Z",
            reason: "Imgur returned no image",
          },
        },
        version: 1,
      }),
    );
    const send = vi.fn().mockResolvedValue({ Body: { transformToString } });
    const client = { send } as unknown as S3Client;

    const checkpoint = await loadR2Checkpoint(
      client,
      "factorio-prints-images",
      "operations/reconciliation/checkpoint-v1.json",
    );

    expect(checkpoint).toStrictEqual({
      variants: {
        "legacy-imgur/imageAlice/original": {
          attempts: 1,
          failureKind: "sourceMissing",
          firstObservedAt: "2000-01-01T00:00:00.000Z",
          lastAttemptAt: "2000-01-01T00:00:00.000Z",
          nextAttemptAt: "2000-01-08T00:00:00.000Z",
          reason: "Imgur returned no image",
        },
      },
      version: 1,
    });
    expect(
      send.mock.calls.map(([command]) => ({
        command: command instanceof GetObjectCommand ? "GetObjectCommand" : "unexpected",
        input: command.input,
      })),
    ).toStrictEqual([
      {
        command: "GetObjectCommand",
        input: {
          Bucket: "factorio-prints-images",
          Key: "operations/reconciliation/checkpoint-v1.json",
        },
      },
    ]);
    expect(transformToString.mock.calls).toStrictEqual([[]]);
  });

  test("starts with an empty checkpoint when the R2 operations key does not exist", async () => {
    const send = vi.fn().mockRejectedValue(
      new S3ServiceException({
        $fault: "client",
        $metadata: { httpStatusCode: 404 },
        name: "NoSuchKey",
      }),
    );

    await expect(
      loadR2Checkpoint(
        { send } as unknown as S3Client,
        "factorio-prints-images",
        "operations/reconciliation/checkpoint-v1.json",
      ),
    ).resolves.toStrictEqual({ variants: {}, version: 1 });
    expect(
      send.mock.calls.map(([command]) => ({
        command: command instanceof GetObjectCommand ? "GetObjectCommand" : "unexpected",
        input: command.input,
      })),
    ).toStrictEqual([
      {
        command: "GetObjectCommand",
        input: {
          Bucket: "factorio-prints-images",
          Key: "operations/reconciliation/checkpoint-v1.json",
        },
      },
    ]);
  });

  test("writes private JSON and makes run-specific reports immutable", async () => {
    const send = vi.fn().mockResolvedValue({});
    const client = { send } as unknown as S3Client;

    await writeR2Json(
      client,
      "factorio-prints-images",
      "operations/reconciliation/checkpoint-v1.json",
      { variants: {}, version: 1 },
      false,
    );
    await writeR2Json(
      client,
      "factorio-prints-images",
      "operations/reconciliation/reports/100-1.json",
      { failedVariants: 0 },
      true,
    );

    expect(
      send.mock.calls.map(([command]) => ({
        command: command instanceof PutObjectCommand ? "PutObjectCommand" : "unexpected",
        input: command.input,
      })),
    ).toStrictEqual([
      {
        command: "PutObjectCommand",
        input: {
          Body: '{\n  "variants": {},\n  "version": 1\n}\n',
          Bucket: "factorio-prints-images",
          CacheControl: "no-store",
          ContentType: "application/json",
          IfNoneMatch: undefined,
          Key: "operations/reconciliation/checkpoint-v1.json",
        },
      },
      {
        command: "PutObjectCommand",
        input: {
          Body: '{\n  "failedVariants": 0\n}\n',
          Bucket: "factorio-prints-images",
          CacheControl: "no-store",
          ContentType: "application/json",
          IfNoneMatch: "*",
          Key: "operations/reconciliation/reports/100-1.json",
        },
      },
    ]);
  });
});
