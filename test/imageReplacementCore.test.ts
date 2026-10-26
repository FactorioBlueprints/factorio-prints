import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import buildImageUrl, { ImageVariant } from "../src/helpers/buildImageUrl";
import {
  acquireRoundLock,
  auditReplacement,
  buildReplacementQueue,
  classifyCurrentImage,
  emptyReplacementLedger,
  forceSaveRefusal,
  gatewayImageUrl,
  ImageState,
  millisecondsUntilUploadAllowed,
  parseUploadResponse,
  type ReplacementDependencies,
  type ReplacementLedger,
  type ReplacementOptions,
  ReplacementStatus,
  runReplacementLoop,
  type SaveOutcome,
  type UploadRecord,
  type UploadState,
} from "../scripts/imageReplacementCore";

const minutes = (count: number): number => count * 60 * 1_000;
const gatewayOrigin = "https://images.factorioprints.com";
const longImageId = "abcdefghijklmnopqrst";

describe("replacement queue", () => {
  const candidates = [
    { currentImageId: "oldAlice", key: "alice" },
    { currentImageId: "oldBob", key: "bob" },
    { currentImageId: "oldCarol", key: "carol" },
    { currentImageId: null, key: "dave" },
  ];
  const uploadPlan = [
    { bytes: 1, file: "/round/uploads/alice.png", key: "alice" },
    { bytes: 1, file: "/round/uploads/bob.png", key: "bob" },
    { bytes: 1, file: "/round/uploads/dave.png", key: "dave" },
    { bytes: 1, file: "/round/uploads/erin.png", key: "erin" },
  ];
  const now = new Date("2000-01-01T12:00:00.000Z");

  test("queues only replace decisions, in upload-plan order", () => {
    const { blocked, queue } = buildReplacementQueue({
      candidates,
      decisions: { alice: "replace", bob: "keep", carol: "delete", dave: "replace" },
      holdKeys: [],
      ledger: emptyReplacementLedger(),
      now,
      uploadPlan,
    });

    expect(queue).toEqual([
      { file: "/round/uploads/alice.png", key: "alice", previousImageId: "oldAlice" },
      { file: "/round/uploads/dave.png", key: "dave", previousImageId: null },
    ]);
    expect(blocked).toEqual([]);
  });

  test("skips held keys", () => {
    const { queue } = buildReplacementQueue({
      candidates,
      decisions: { alice: "replace", dave: "replace" },
      holdKeys: ["alice"],
      ledger: emptyReplacementLedger(),
      now,
      uploadPlan,
    });

    expect(queue).toEqual([
      { file: "/round/uploads/dave.png", key: "dave", previousImageId: null },
    ]);
  });

  test("blocks replace decisions with no staged file or no reviewed candidate", () => {
    const { blocked, queue } = buildReplacementQueue({
      candidates,
      decisions: { carol: "replace", erin: "replace" },
      holdKeys: [],
      ledger: emptyReplacementLedger(),
      now,
      uploadPlan,
    });

    expect(queue).toEqual([]);
    expect(blocked).toEqual([
      { key: "erin", reason: "no reviewed candidate, so no previous image to guard the save on" },
      { key: "carol", reason: "no staged upload file in upload-plan.json" },
    ]);
  });

  test("resumes from the ledger: saved and conflicting keys are done, a fresh upload is reused", () => {
    const ledger: ReplacementLedger = {
      entries: {
        alice: {
          previousImageId: "oldAlice",
          status: ReplacementStatus.Saved,
          upload: {
            imageId: "newAlice",
            type: "image/png",
            uploadedAt: "2000-01-01T11:00:00.000Z",
          },
        },
        bob: {
          previousImageId: "oldBob",
          status: ReplacementStatus.Uploaded,
          upload: {
            imageId: longImageId,
            type: "image/jpeg",
            uploadedAt: "2000-01-01T11:30:00.000Z",
          },
        },
        dave: {
          previousImageId: null,
          reason: "Firebase holds authorPick",
          status: ReplacementStatus.Conflict,
        },
      },
      uploadAttempts: [],
      version: 2,
    };

    const { queue } = buildReplacementQueue({
      candidates,
      decisions: { alice: "replace", bob: "replace", dave: "replace" },
      holdKeys: [],
      ledger,
      now,
      uploadPlan,
    });

    expect(queue).toEqual([
      {
        file: "/round/uploads/bob.png",
        key: "bob",
        previousImageId: "oldBob",
        upload: {
          imageId: longImageId,
          type: "image/jpeg",
          uploadedAt: "2000-01-01T11:30:00.000Z",
        },
        uploadReusable: true,
      },
    ]);
  });

  test("an unsaved upload old enough that the Worker may expire it is not reattached, but still guards the save", () => {
    const ledger: ReplacementLedger = {
      entries: {
        bob: {
          previousImageId: "oldBob",
          status: ReplacementStatus.Uploaded,
          upload: { imageId: "newBob", type: "image/png", uploadedAt: "2000-01-01T11:14:59.000Z" },
        },
      },
      uploadAttempts: [],
      version: 2,
    };

    const { queue } = buildReplacementQueue({
      candidates,
      decisions: { bob: "replace" },
      holdKeys: [],
      ledger,
      now,
      uploadPlan,
    });

    expect(queue).toEqual([
      {
        file: "/round/uploads/bob.png",
        key: "bob",
        previousImageId: "oldBob",
        upload: { imageId: "newBob", type: "image/png", uploadedAt: "2000-01-01T11:14:59.000Z" },
        uploadReusable: false,
      },
    ]);
  });

  test("a replacement whose save was refused for review is done until a person looks at it", () => {
    const ledger: ReplacementLedger = {
      entries: {
        bob: {
          previousImageId: "oldBob",
          reason: "the blueprint string does not parse",
          status: ReplacementStatus.NeedsReview,
          upload: { imageId: "newBob", type: "image/png", uploadedAt: "2000-01-01T11:50:00.000Z" },
        },
      },
      uploadAttempts: [],
      version: 2,
    };

    expect(
      buildReplacementQueue({
        candidates,
        decisions: { bob: "replace" },
        holdKeys: [],
        ledger,
        now,
        uploadPlan,
      }),
    ).toEqual({ blocked: [], queue: [] });
  });
});

describe("upload response", () => {
  test("a created upload answers the image id and type to save", () => {
    expect(
      parseUploadResponse({
        body: JSON.stringify({ id: longImageId, type: "image/png" }),
        retryAfter: null,
        status: 201,
      }),
    ).toEqual({ imageId: longImageId, kind: "uploaded", type: "image/png" });
  });

  test("a created upload without an id and type is ambiguous", () => {
    expect(parseUploadResponse({ body: "{}", retryAfter: null, status: 201 })).toEqual({
      kind: "ambiguous",
      reason: "upload answered 201 without an image id and type: {}",
    });
    expect(parseUploadResponse({ body: "not json", retryAfter: null, status: 201 })).toEqual({
      kind: "ambiguous",
      reason: "upload answered 201 without an image id and type: not json",
    });
  });

  test("the hourly limit and a busy Worker wait for retry-after", () => {
    expect(
      parseUploadResponse({ body: "Hourly upload limit reached", retryAfter: "600", status: 429 }),
    ).toEqual({
      kind: "rateLimited",
      reason: "429 Hourly upload limit reached",
      retryAfterMilliseconds: minutes(10),
      spentQuota: false,
    });
    expect(
      parseUploadResponse({
        body: "Upload limits are temporarily unavailable",
        retryAfter: "60",
        status: 503,
      }),
    ).toEqual({
      kind: "rateLimited",
      reason: "503 Upload limits are temporarily unavailable",
      retryAfterMilliseconds: minutes(1),
      spentQuota: false,
    });
  });

  test("any other 503 comes after the Worker spent quota on the upload, so it counts as an attempt", () => {
    expect(
      parseUploadResponse({
        body: "Image storage is temporarily unavailable",
        retryAfter: "60",
        status: 503,
      }),
    ).toEqual({
      kind: "rateLimited",
      reason: "503 Image storage is temporarily unavailable",
      retryAfterMilliseconds: minutes(1),
      spentQuota: true,
    });
  });

  test("a rate limit without a usable retry-after waits ten minutes", () => {
    expect(parseUploadResponse({ body: "", retryAfter: null, status: 429 })).toEqual({
      kind: "rateLimited",
      reason: "429 ",
      retryAfterMilliseconds: minutes(10),
      spentQuota: false,
    });
    expect(parseUploadResponse({ body: "", retryAfter: "soon", status: 429 })).toEqual({
      kind: "rateLimited",
      reason: "429 ",
      retryAfterMilliseconds: minutes(10),
      spentQuota: false,
    });
  });

  test("an image the Worker rejects fails only that replacement", () => {
    expect(
      parseUploadResponse({ body: "Image is too large", retryAfter: null, status: 413 }),
    ).toEqual({ kind: "failed", reason: "upload rejected with 413: Image is too large" });
    expect(parseUploadResponse({ body: "Unsupported", retryAfter: null, status: 415 })).toEqual({
      kind: "failed",
      reason: "upload rejected with 415: Unsupported",
    });
    expect(parseUploadResponse({ body: "Unreadable", retryAfter: null, status: 422 })).toEqual({
      kind: "failed",
      reason: "upload rejected with 422: Unreadable",
    });
  });

  test("a rejected sign-in stops the run", () => {
    expect(parseUploadResponse({ body: "Unauthorized", retryAfter: null, status: 401 })).toEqual({
      kind: "ambiguous",
      reason: "the Worker rejected the Factorio Prints sign-in; run with --login",
    });
  });

  test("any other answer stops the run rather than guessing", () => {
    expect(parseUploadResponse({ body: "boom", retryAfter: null, status: 500 })).toEqual({
      kind: "ambiguous",
      reason: "upload answered 500: boom",
    });
  });
});

describe("hourly upload budget", () => {
  const now = new Date("2000-01-01T12:40:00.000Z");
  const attempts = (count: number, at: string): string[] => Array.from({ length: count }, () => at);

  test("uploads go ahead while this UTC hour has spent fewer than the limit", () => {
    expect(millisecondsUntilUploadAllowed(attempts(9, "2000-01-01T12:05:00.000Z"), now, 10)).toBe(
      0,
    );
  });

  test("attempts from an earlier UTC hour do not count, matching the Worker's quota", () => {
    expect(millisecondsUntilUploadAllowed(attempts(10, "2000-01-01T11:59:59.000Z"), now, 10)).toBe(
      0,
    );
  });

  test("a spent hour waits until just after the next UTC hour starts", () => {
    expect(millisecondsUntilUploadAllowed(attempts(10, "2000-01-01T12:05:00.000Z"), now, 10)).toBe(
      minutes(20) + 5_000,
    );
  });
});

describe("current image guard", () => {
  test("replaces only when Firebase still holds the reviewed image", () => {
    expect(classifyCurrentImage("oldAlice", "oldAlice")).toBe(ImageState.Replace);
    expect(classifyCurrentImage(null, null)).toBe(ImageState.Replace);
  });

  test("Firebase already holding the new image means an earlier save landed", () => {
    expect(classifyCurrentImage(longImageId, "oldAlice", longImageId)).toBe(
      ImageState.AlreadySaved,
    );
  });

  test("any other image is somebody else's change and must not be overwritten", () => {
    expect(classifyCurrentImage("authorPick", "oldAlice")).toBe(ImageState.Conflict);
    expect(classifyCurrentImage(null, "oldAlice")).toBe(ImageState.Conflict);
    expect(classifyCurrentImage("authorPick", null, "newDave")).toBe(ImageState.Conflict);
  });
});

describe("submission warnings", () => {
  test("pre-existing cosmetic warnings are forced past", () => {
    expect(
      forceSaveRefusal([
        "The blueprint has no tags. Consider adding a few tags.",
        "Blueprint has no name. Consider adding a name.",
      ]),
    ).toBeUndefined();
  });

  test("a blueprint string that does not parse is never forced through", () => {
    expect(
      forceSaveRefusal([
        "The blueprint has no tags. Consider adding a few tags.",
        "Could not parse blueprint.",
      ]),
    ).toBe("the edit form warns: Could not parse blueprint.");
  });
});

interface FakeScript {
  currentImages?: Record<string, string | null>;
  saves?: SaveOutcome[];
  uploads: UploadState[];
}

const reviewedImageId = (key: string): string => `old${key[0]!.toUpperCase()}${key.slice(1)}`;

const fakeDependencies = (script: FakeScript) => {
  const uploads = [...script.uploads];
  const saves = [...(script.saves ?? [])];
  const calls: string[] = [];
  const sleeps: number[] = [];
  const persisted: ReplacementLedger[] = [];
  const dependencies: ReplacementDependencies = {
    confirmSaved: async (key, imageId) => {
      calls.push(`confirm ${key} ${imageId}`);
      return true;
    },
    currentImageId: async (key) =>
      script.currentImages && key in script.currentImages
        ? script.currentImages[key]!
        : reviewedImageId(key),
    log: () => {},
    now: () => new Date("2000-01-01T12:00:00.000Z"),
    persistLedger: async (ledger) => {
      persisted.push(structuredClone(ledger));
    },
    saveImage: async (key, imageId) => {
      calls.push(`save ${key} ${imageId}`);
      return saves.shift() ?? { outcome: "saved" };
    },
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
    },
    uploadImage: async (key, file, reuse) => {
      if (reuse) {
        calls.push(`reattach ${key} ${reuse.imageId}`);
        return { imageId: reuse.imageId, kind: "uploaded", type: reuse.type };
      }
      calls.push(`upload ${key} ${file}`);
      const next = uploads.shift();
      if (!next) throw new Error(`unscripted upload of ${file}`);
      return next;
    },
  };
  return { calls, dependencies, persisted, sleeps };
};

const uploaded = (imageId: string): UploadState => ({
  imageId,
  kind: "uploaded",
  type: "image/png",
});

const options: ReplacementOptions = {
  maximumConsecutiveRateLimits: 3,
  maximumConsecutiveSaveFailures: 2,
  uploadSpacingMilliseconds: 8_000,
  uploadsPerHour: 10,
};

describe("replacement loop", () => {
  const queue = [
    { file: "alice.png", key: "alice", previousImageId: "oldAlice" },
    { file: "bob.png", key: "bob", previousImageId: "oldBob" },
  ];

  test("uploads then immediately saves each image, confirming every save", async () => {
    const { calls, dependencies } = fakeDependencies({
      uploads: [uploaded("newAlice"), uploaded(longImageId)],
    });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(calls).toEqual([
      "upload alice alice.png",
      "save alice newAlice",
      "confirm alice newAlice",
      "upload bob bob.png",
      `save bob ${longImageId}`,
      `confirm bob ${longImageId}`,
    ]);
    expect(result).toEqual({
      ledger: {
        entries: {
          alice: {
            previousImageId: "oldAlice",
            savedAt: "2000-01-01T12:00:00.000Z",
            status: ReplacementStatus.Saved,
            upload: {
              imageId: "newAlice",
              type: "image/png",
              uploadedAt: "2000-01-01T12:00:00.000Z",
            },
          },
          bob: {
            previousImageId: "oldBob",
            savedAt: "2000-01-01T12:00:00.000Z",
            status: ReplacementStatus.Saved,
            upload: {
              imageId: longImageId,
              type: "image/png",
              uploadedAt: "2000-01-01T12:00:00.000Z",
            },
          },
        },
        uploadAttempts: ["2000-01-01T12:00:00.000Z", "2000-01-01T12:00:00.000Z"],
        version: 2,
      },
    });
  });

  test("persists the upload before attempting the save, so a crash never loses an uploaded image", async () => {
    const { dependencies, persisted } = fakeDependencies({ uploads: [uploaded("newAlice")] });

    await runReplacementLoop(queue.slice(0, 1), emptyReplacementLedger(), dependencies, options);

    expect(persisted[0]?.entries.alice).toEqual({
      previousImageId: "oldAlice",
      status: ReplacementStatus.Uploaded,
      upload: { imageId: "newAlice", type: "image/png", uploadedAt: "2000-01-01T12:00:00.000Z" },
    });
    expect(persisted.at(-1)?.entries.alice?.status).toBe(ReplacementStatus.Saved);
  });

  test("a guard conflict is final, never retried, and spends no upload", async () => {
    const { calls, dependencies } = fakeDependencies({
      currentImages: { alice: "authorPick" },
      uploads: [uploaded("newBob")],
    });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(calls).toEqual(["upload bob bob.png", "save bob newBob", "confirm bob newBob"]);
    expect(result.ledger.entries.alice).toEqual({
      previousImageId: "oldAlice",
      reason: "Firebase holds authorPick, not the reviewed oldAlice",
      status: ReplacementStatus.Conflict,
    });
  });

  test("a resumed fresh upload is reattached without uploading again", async () => {
    const { calls, dependencies, sleeps } = fakeDependencies({ uploads: [] });
    const upload: UploadRecord = {
      imageId: "newAlice",
      type: "image/png",
      uploadedAt: "2000-01-01T11:50:00.000Z",
    };

    const result = await runReplacementLoop(
      [
        {
          file: "alice.png",
          key: "alice",
          previousImageId: "oldAlice",
          upload,
          uploadReusable: true,
        },
      ],
      {
        entries: {
          alice: { previousImageId: "oldAlice", status: ReplacementStatus.Uploaded, upload },
        },
        uploadAttempts: [],
        version: 2,
      },
      dependencies,
      options,
    );

    expect(calls).toEqual([
      "reattach alice newAlice",
      "save alice newAlice",
      "confirm alice newAlice",
    ]);
    expect(sleeps).toEqual([]);
    expect(result.ledger.uploadAttempts).toEqual([]);
  });

  test("a resumed upload that Firebase already shows is recorded as saved without touching the form", async () => {
    const { calls, dependencies } = fakeDependencies({
      currentImages: { alice: "newAlice" },
      uploads: [],
    });
    const upload: UploadRecord = {
      imageId: "newAlice",
      type: "image/png",
      uploadedAt: "2000-01-01T11:50:00.000Z",
    };

    const result = await runReplacementLoop(
      [{ file: "alice.png", key: "alice", previousImageId: "oldAlice", upload }],
      emptyReplacementLedger(),
      dependencies,
      options,
    );

    expect(calls).toEqual([]);
    expect(result.ledger.entries.alice).toEqual({
      previousImageId: "oldAlice",
      savedAt: "2000-01-01T12:00:00.000Z",
      status: ReplacementStatus.Saved,
      upload,
    });
  });

  test("a resumed upload too old to reattach that Firebase already shows is recorded as saved", async () => {
    const { calls, dependencies } = fakeDependencies({
      currentImages: { alice: "newAlice" },
      uploads: [],
    });
    const upload: UploadRecord = {
      imageId: "newAlice",
      type: "image/png",
      uploadedAt: "2000-01-01T10:00:00.000Z",
    };

    const result = await runReplacementLoop(
      [
        {
          file: "alice.png",
          key: "alice",
          previousImageId: "oldAlice",
          upload,
          uploadReusable: false,
        },
      ],
      emptyReplacementLedger(),
      dependencies,
      options,
    );

    expect(calls).toEqual([]);
    expect(result).toEqual({
      ledger: {
        entries: {
          alice: {
            previousImageId: "oldAlice",
            savedAt: "2000-01-01T12:00:00.000Z",
            status: ReplacementStatus.Saved,
            upload,
          },
        },
        uploadAttempts: [],
        version: 2,
      },
    });
  });

  test("a resumed upload too old to reattach is uploaded again when the save never landed", async () => {
    const { calls, dependencies } = fakeDependencies({ uploads: [uploaded("newerAlice")] });
    const upload: UploadRecord = {
      imageId: "newAlice",
      type: "image/png",
      uploadedAt: "2000-01-01T10:00:00.000Z",
    };

    await runReplacementLoop(
      [
        {
          file: "alice.png",
          key: "alice",
          previousImageId: "oldAlice",
          upload,
          uploadReusable: false,
        },
      ],
      emptyReplacementLedger(),
      dependencies,
      options,
    );

    expect(calls).toEqual([
      "upload alice alice.png",
      "save alice newerAlice",
      "confirm alice newerAlice",
    ]);
  });

  test("a save refused over submission warnings needs review and is not a save failure", async () => {
    const refused: SaveOutcome = {
      detail: "the edit form warns: Could not parse blueprint.",
      outcome: "needsReview",
    };
    const failed: SaveOutcome = { detail: "save never reached /view/bob", outcome: "failed" };
    const threeQueue = [
      { file: "alice.png", key: "alice", previousImageId: "oldAlice" },
      { file: "bob.png", key: "bob", previousImageId: "oldBob" },
      { file: "carol.png", key: "carol", previousImageId: "oldCarol" },
    ];
    const { calls, dependencies } = fakeDependencies({
      saves: [failed, refused, failed],
      uploads: [uploaded("newAlice"), uploaded("newBob"), uploaded("newCarol")],
    });

    const result = await runReplacementLoop(
      threeQueue,
      emptyReplacementLedger(),
      dependencies,
      options,
    );

    expect(calls).toEqual([
      "upload alice alice.png",
      "save alice newAlice",
      "upload bob bob.png",
      "save bob newBob",
      "upload carol carol.png",
      "save carol newCarol",
    ]);
    expect(result.stoppedReason).toBeUndefined();
    expect(result.ledger.entries.bob).toEqual({
      previousImageId: "oldBob",
      reason: "the edit form warns: Could not parse blueprint.",
      status: ReplacementStatus.NeedsReview,
      upload: { imageId: "newBob", type: "image/png", uploadedAt: "2000-01-01T12:00:00.000Z" },
    });
  });

  test("a 503 that spent quota counts against the hourly budget", async () => {
    const { dependencies } = fakeDependencies({
      uploads: [
        {
          kind: "rateLimited",
          reason: "503 Image storage is temporarily unavailable",
          retryAfterMilliseconds: minutes(1),
          spentQuota: true,
        },
        uploaded("newAlice"),
      ],
    });

    const result = await runReplacementLoop(
      queue.slice(0, 1),
      emptyReplacementLedger(),
      dependencies,
      options,
    );

    expect(result.ledger.uploadAttempts).toEqual([
      "2000-01-01T12:00:00.000Z",
      "2000-01-01T12:00:00.000Z",
    ]);
  });

  test("waits out the retry-after of a rate limit and retries the same image", async () => {
    const { calls, dependencies, sleeps } = fakeDependencies({
      uploads: [
        {
          kind: "rateLimited",
          reason: "429 Hourly upload limit reached",
          retryAfterMilliseconds: minutes(10),
          spentQuota: false,
        },
        uploaded("newAlice"),
      ],
    });

    const result = await runReplacementLoop(
      queue.slice(0, 1),
      emptyReplacementLedger(),
      dependencies,
      options,
    );

    expect(calls.filter((call) => call.startsWith("upload"))).toEqual([
      "upload alice alice.png",
      "upload alice alice.png",
    ]);
    expect(sleeps).toEqual([minutes(10)]);
    expect(result.ledger.entries.alice?.status).toBe(ReplacementStatus.Saved);
    expect(result.ledger.uploadAttempts).toEqual(["2000-01-01T12:00:00.000Z"]);
  });

  test("stops when the rate limit keeps coming back", async () => {
    const limited: UploadState = {
      kind: "rateLimited",
      reason: "429 Hourly upload limit reached",
      retryAfterMilliseconds: minutes(10),
      spentQuota: false,
    };
    const { dependencies } = fakeDependencies({ uploads: [limited, limited, limited] });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(result.stoppedReason).toBe(
      "upload rate limited 3 times in a row (last: 429 Hourly upload limit reached); rerun later to resume",
    );
    expect(result.ledger.entries.alice).toBeUndefined();
  });

  test("holds uploads back once this UTC hour's budget is spent", async () => {
    const { calls, dependencies, sleeps } = fakeDependencies({ uploads: [uploaded("newAlice")] });
    const spent = Array.from({ length: 10 }, () => "2000-01-01T12:00:00.000Z");

    await runReplacementLoop(
      queue.slice(0, 1),
      { entries: {}, uploadAttempts: spent, version: 2 },
      dependencies,
      options,
    );

    expect(sleeps).toEqual([minutes(60) + 5_000]);
    expect(calls[0]).toBe("upload alice alice.png");
  });

  test("forgets attempts from earlier hours so the ledger does not grow without bound", async () => {
    const { dependencies } = fakeDependencies({ uploads: [uploaded("newAlice")] });

    const result = await runReplacementLoop(
      queue.slice(0, 1),
      { entries: {}, uploadAttempts: ["2000-01-01T10:00:00.000Z"], version: 2 },
      dependencies,
      options,
    );

    expect(result.ledger.uploadAttempts).toEqual(["2000-01-01T12:00:00.000Z"]);
  });

  test("stops on an ambiguous upload rather than guessing", async () => {
    const { calls, dependencies } = fakeDependencies({
      uploads: [{ kind: "ambiguous", reason: "upload answered 500: boom" }],
    });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(result.stoppedReason).toBe("ambiguous upload for alice: upload answered 500: boom");
    expect(calls).toEqual(["upload alice alice.png"]);
  });

  test("an ambiguous upload that did return an image id records it in the ledger", async () => {
    const { calls, dependencies, persisted } = fakeDependencies({
      uploads: [
        {
          kind: "ambiguous",
          reason: "uploaded newAlice but the form shows no preview",
          upload: { imageId: "newAlice", type: "image/png" },
        },
      ],
    });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    const ledger: ReplacementLedger = {
      entries: {
        alice: {
          previousImageId: "oldAlice",
          reason: "uploaded newAlice but the form shows no preview",
          status: ReplacementStatus.Uploaded,
          upload: {
            imageId: "newAlice",
            type: "image/png",
            uploadedAt: "2000-01-01T12:00:00.000Z",
          },
        },
      },
      uploadAttempts: ["2000-01-01T12:00:00.000Z"],
      version: 2,
    };
    expect(calls).toEqual(["upload alice alice.png"]);
    expect(persisted.at(-1)).toEqual(ledger);
    expect(result).toEqual({
      ledger,
      stoppedReason: "ambiguous upload for alice: uploaded newAlice but the form shows no preview",
    });
  });

  test("records a failed upload and moves on to the next image", async () => {
    const { dependencies } = fakeDependencies({
      uploads: [
        { kind: "failed", reason: "upload rejected with 413: Image is too large" },
        uploaded("newBob"),
      ],
    });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(result.ledger.entries.alice).toEqual({
      previousImageId: "oldAlice",
      reason: "upload rejected with 413: Image is too large",
      status: ReplacementStatus.UploadFailed,
    });
    expect(result.ledger.entries.bob?.status).toBe(ReplacementStatus.Saved);
  });

  test("an unconfirmed save stays uploaded so the next run saves it again", async () => {
    const { dependencies } = fakeDependencies({ uploads: [uploaded("newAlice")] });
    dependencies.confirmSaved = async () => false;

    const result = await runReplacementLoop(
      queue.slice(0, 1),
      emptyReplacementLedger(),
      dependencies,
      options,
    );

    expect(result.ledger.entries.alice).toEqual({
      previousImageId: "oldAlice",
      reason: "Firebase does not show newAlice yet",
      status: ReplacementStatus.Uploaded,
      upload: { imageId: "newAlice", type: "image/png", uploadedAt: "2000-01-01T12:00:00.000Z" },
    });
  });

  test("stops after repeated save failures, which usually means the site session expired", async () => {
    const failed: SaveOutcome = { detail: "save never reached /view/alice", outcome: "failed" };
    const { dependencies } = fakeDependencies({
      saves: [failed, failed],
      uploads: [uploaded("newAlice"), uploaded("newBob")],
    });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(result.stoppedReason).toBe(
      "2 saves failed in a row (last: save never reached /view/alice); check the Factorio Prints sign-in, then rerun",
    );
    expect(result.ledger.entries.alice?.status).toBe(ReplacementStatus.Uploaded);
    expect(result.ledger.entries.bob?.status).toBe(ReplacementStatus.Uploaded);
  });

  test("spaces uploads out", async () => {
    const { dependencies, sleeps } = fakeDependencies({
      uploads: [uploaded("newAlice"), uploaded("newBob")],
    });

    await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(sleeps).toEqual([8_000]);
  });
});

describe("gateway image url", () => {
  test("matches the site's buildImageUrl", () => {
    for (const variant of [ImageVariant.Original, ImageVariant.Thumbnail]) {
      expect(gatewayImageUrl(gatewayOrigin, longImageId, "image/jpeg", variant)).toBe(
        buildImageUrl(longImageId, "image/jpeg", variant, gatewayOrigin),
      );
    }
    expect(gatewayImageUrl(gatewayOrigin, "abc1234", "image/webp", "original")).toBe(
      buildImageUrl("abc1234", "image/webp", ImageVariant.Original, gatewayOrigin),
    );
  });
});

describe("replacement audit", () => {
  const upload = { imageId: longImageId, type: "image/png" };

  // Until the cron copies a fresh upload's variants, the gateway answers its thumbnail with the
  // original, still a 200, so the audit only needs both URLs to resolve.
  test("a replacement is live when Firebase holds it and the gateway serves its original and thumbnail", () => {
    expect(
      auditReplacement(upload, gatewayOrigin, {
        firebaseImageId: longImageId,
        originalStatus: 200,
        thumbnailStatus: 200,
      }),
    ).toEqual([]);
  });

  test("reports every way a replacement can fail to be live", () => {
    expect(
      auditReplacement(upload, gatewayOrigin, {
        firebaseImageId: "authorPick",
        originalStatus: 404,
        thumbnailStatus: 502,
      }),
    ).toEqual([
      `Firebase holds authorPick, not ${longImageId}`,
      `${gatewayOrigin}/legacy-imgur/${longImageId}/original.png returned 404`,
      `${gatewayOrigin}/legacy-imgur/${longImageId}/thumbnail.png returned 502`,
    ]);
    expect(
      auditReplacement(upload, gatewayOrigin, {
        firebaseImageId: null,
        originalStatus: 200,
        thumbnailStatus: 200,
      }),
    ).toEqual([`Firebase holds no image, not ${longImageId}`]);
  });
});

describe("round lock", () => {
  let round: string;

  beforeEach(async () => {
    round = await mkdtemp(join(tmpdir(), "replacement-round-"));
  });

  afterEach(async () => {
    await rm(round, { force: true, recursive: true });
  });

  test("a second run on the same round fails fast until the first releases its lock", async () => {
    const release = await acquireRoundLock(round, "pid 1 at 2000-01-01T12:00:00.000Z");

    await expect(acquireRoundLock(round, "pid 2")).rejects.toThrow(
      new Error(
        `another run holds ${join(round, "replacement.lock")} (pid 1 at 2000-01-01T12:00:00.000Z); if no run is active, delete it and rerun`,
      ),
    );

    release();
    expect(await readdir(round)).toEqual([]);
    const releaseAgain = await acquireRoundLock(round, "pid 2");
    expect(await readdir(round)).toEqual(["replacement.lock"]);
    releaseAgain();
  });
});
