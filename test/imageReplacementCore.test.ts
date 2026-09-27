import {
  auditReplacement,
  buildReplacementQueue,
  classifyImageField,
  emptyReplacementLedger,
  ImageFieldState,
  parseImgurUploadState,
  type ReplacementDependencies,
  type ReplacementLedger,
  ReplacementStatus,
  runReplacementLoop,
  type SaveOutcome,
  type UploadState,
} from "../scripts/imageReplacementCore";

const minutes = (count: number): number => count * 60 * 1_000;

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

  test("queues only replace decisions, in upload-plan order", () => {
    const { blocked, queue } = buildReplacementQueue({
      candidates,
      decisions: { alice: "replace", bob: "keep", carol: "delete", dave: "replace" },
      holdKeys: [],
      ledger: emptyReplacementLedger(),
      uploadPlan,
    });

    expect(queue).toEqual([
      {
        file: "/round/uploads/alice.png",
        key: "alice",
        previousImgurId: "oldAlice",
        step: "upload",
      },
      { file: "/round/uploads/dave.png", key: "dave", previousImgurId: null, step: "upload" },
    ]);
    expect(blocked).toEqual([]);
  });

  test("skips held keys", () => {
    const { queue } = buildReplacementQueue({
      candidates,
      decisions: { alice: "replace", dave: "replace" },
      holdKeys: ["alice"],
      ledger: emptyReplacementLedger(),
      uploadPlan,
    });

    expect(queue.map((item) => item.key)).toEqual(["dave"]);
  });

  test("blocks replace decisions with no staged file or no reviewed candidate", () => {
    const { blocked, queue } = buildReplacementQueue({
      candidates,
      decisions: { carol: "replace", erin: "replace" },
      holdKeys: [],
      ledger: emptyReplacementLedger(),
      uploadPlan,
    });

    expect(queue).toEqual([]);
    expect(blocked).toEqual([
      { key: "erin", reason: "no reviewed candidate, so no previous image to guard the save on" },
      { key: "carol", reason: "no staged upload file in upload-plan.json" },
    ]);
  });

  test("resumes from the ledger: saved and conflicting keys are done, uploaded keys only need saving", () => {
    const ledger: ReplacementLedger = {
      entries: {
        alice: {
          previousImgurId: "oldAlice",
          status: ReplacementStatus.Saved,
          upload: {
            ext: "png",
            imgurId: "newAlice",
            postUrl: "https://imgur.com/a/pa",
            uploadedAt: "2000-01-01T00:00:00.000Z",
          },
        },
        bob: {
          previousImgurId: "oldBob",
          status: ReplacementStatus.Uploaded,
          upload: {
            ext: "jpeg",
            imgurId: "newBob",
            postUrl: "https://imgur.com/a/pb",
            uploadedAt: "2000-01-01T00:00:00.000Z",
          },
        },
        dave: {
          previousImgurId: null,
          reason: "field held imgur.com/xyz",
          status: ReplacementStatus.Conflict,
        },
      },
      version: 1,
    };

    const { queue } = buildReplacementQueue({
      candidates,
      decisions: { alice: "replace", bob: "replace", dave: "replace" },
      holdKeys: [],
      ledger,
      uploadPlan,
    });

    expect(queue).toEqual([
      {
        file: "/round/uploads/bob.png",
        key: "bob",
        previousImgurId: "oldBob",
        step: "save",
        upload: {
          ext: "jpeg",
          imgurId: "newBob",
          postUrl: "https://imgur.com/a/pb",
          uploadedAt: "2000-01-01T00:00:00.000Z",
        },
      },
    ]);
  });
});

describe("imgur upload page state", () => {
  test("a new post with exactly one image is an upload", () => {
    expect(
      parseImgurUploadState({
        captcha: false,
        failed: false,
        imageFiles: ["cU8VrDV.png"],
        url: "https://imgur.com/a/WsGDjmT",
      }),
    ).toEqual({
      ext: "png",
      imgurId: "cU8VrDV",
      kind: "uploaded",
      postUrl: "https://imgur.com/a/WsGDjmT",
    });
  });

  test("the captcha wins even when the page already navigated to a post", () => {
    expect(
      parseImgurUploadState({
        captcha: true,
        failed: false,
        imageFiles: [],
        url: "https://imgur.com/a/xkI5wNf",
      }),
    ).toEqual({ kind: "captcha", postUrl: "https://imgur.com/a/xkI5wNf" });
  });

  test("an explicit upload failure is a failure", () => {
    expect(
      parseImgurUploadState({
        captcha: false,
        failed: true,
        imageFiles: [],
        url: "https://imgur.com/upload",
      }),
    ).toEqual({ kind: "failed", reason: "Imgur reported the upload failed" });
  });

  test("anything other than exactly one image on a post page is ambiguous", () => {
    expect(
      parseImgurUploadState({
        captcha: false,
        failed: false,
        imageFiles: [],
        url: "https://imgur.com/a/empty",
      }).kind,
    ).toBe("ambiguous");
    expect(
      parseImgurUploadState({
        captcha: false,
        failed: false,
        imageFiles: ["aaaaaaa.png", "bbbbbbb.jpeg"],
        url: "https://imgur.com/a/two",
      }).kind,
    ).toBe("ambiguous");
    expect(
      parseImgurUploadState({
        captcha: false,
        failed: false,
        imageFiles: [],
        url: "https://imgur.com/upload",
      }).kind,
    ).toBe("ambiguous");
  });
});

describe("factorio prints image field guard", () => {
  test("replaces only when the field still holds the reviewed image", () => {
    expect(classifyImageField("https://imgur.com/oldAlice", "oldAlice", "newAlice")).toBe(
      ImageFieldState.Replace,
    );
    expect(classifyImageField("https://i.imgur.com/oldAlice.png", "oldAlice", "newAlice")).toBe(
      ImageFieldState.Replace,
    );
  });

  test("a field already holding the new image means an earlier save landed", () => {
    expect(classifyImageField("https://imgur.com/newAlice", "oldAlice", "newAlice")).toBe(
      ImageFieldState.AlreadySaved,
    );
  });

  test("any other image is somebody else's change and must not be overwritten", () => {
    expect(classifyImageField("https://imgur.com/authorPick", "oldAlice", "newAlice")).toBe(
      ImageFieldState.Conflict,
    );
    expect(classifyImageField("", "oldAlice", "newAlice")).toBe(ImageFieldState.Conflict);
  });

  test("a blueprint reviewed with no image accepts an empty field", () => {
    expect(classifyImageField("", null, "newDave")).toBe(ImageFieldState.Replace);
    expect(classifyImageField("https://imgur.com/authorPick", null, "newDave")).toBe(
      ImageFieldState.Conflict,
    );
  });
});

interface FakeScript {
  saves?: SaveOutcome[];
  uploads: UploadState[];
}

const fakeDependencies = (script: FakeScript) => {
  const uploads = [...script.uploads];
  const saves = [...(script.saves ?? [])];
  const calls: string[] = [];
  const sleeps: number[] = [];
  const persisted: ReplacementLedger[] = [];
  const dependencies: ReplacementDependencies = {
    confirmSaved: async (key, imgurId) => {
      calls.push(`confirm ${key} ${imgurId}`);
      return true;
    },
    log: () => {},
    now: () => new Date("2000-01-01T00:00:00.000Z"),
    persistLedger: async (ledger) => {
      persisted.push(structuredClone(ledger));
    },
    saveImage: async (key, previousImgurId, imgurId) => {
      calls.push(`save ${key} ${previousImgurId} ${imgurId}`);
      return saves.shift() ?? { outcome: "saved" };
    },
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
    },
    uploadImage: async (file) => {
      calls.push(`upload ${file}`);
      const next = uploads.shift();
      if (!next) throw new Error(`unscripted upload of ${file}`);
      return next;
    },
  };
  return { calls, dependencies, persisted, sleeps };
};

const uploaded = (imgurId: string): UploadState => ({
  ext: "png",
  imgurId,
  kind: "uploaded",
  postUrl: `https://imgur.com/a/post-${imgurId}`,
});

const options = {
  captchaBackoffMilliseconds: minutes(30),
  maximumConsecutiveCaptchas: 3,
  maximumConsecutiveSaveFailures: 2,
  uploadSpacingMilliseconds: 8_000,
};

describe("replacement loop", () => {
  const queue = [
    { file: "alice.png", key: "alice", previousImgurId: "oldAlice", step: "upload" as const },
    { file: "bob.png", key: "bob", previousImgurId: "oldBob", step: "upload" as const },
  ];

  test("uploads then immediately saves each image, confirming every save", async () => {
    const { calls, dependencies } = fakeDependencies({
      uploads: [uploaded("newAlice"), uploaded("newBob")],
    });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(calls).toEqual([
      "upload alice.png",
      "save alice oldAlice newAlice",
      "confirm alice newAlice",
      "upload bob.png",
      "save bob oldBob newBob",
      "confirm bob newBob",
    ]);
    expect(result.ledger.entries.alice?.status).toBe(ReplacementStatus.Saved);
    expect(result.ledger.entries.bob?.status).toBe(ReplacementStatus.Saved);
    expect(result.stoppedReason).toBeUndefined();
  });

  test("persists the upload before attempting the save, so a crash never loses an uploaded image", async () => {
    const { dependencies, persisted } = fakeDependencies({ uploads: [uploaded("newAlice")] });

    await runReplacementLoop(queue.slice(0, 1), emptyReplacementLedger(), dependencies, options);

    expect(persisted[0]?.entries.alice?.status).toBe(ReplacementStatus.Uploaded);
    expect(persisted[0]?.entries.alice?.upload?.imgurId).toBe("newAlice");
    expect(persisted.at(-1)?.entries.alice?.status).toBe(ReplacementStatus.Saved);
  });

  test("backs off on a captcha and retries the same image", async () => {
    const { calls, dependencies, sleeps } = fakeDependencies({
      uploads: [{ kind: "captcha", postUrl: "https://imgur.com/a/x" }, uploaded("newAlice")],
    });

    const result = await runReplacementLoop(
      queue.slice(0, 1),
      emptyReplacementLedger(),
      dependencies,
      options,
    );

    expect(calls.filter((call) => call.startsWith("upload"))).toEqual([
      "upload alice.png",
      "upload alice.png",
    ]);
    expect(sleeps).toContain(minutes(30));
    expect(result.ledger.entries.alice?.status).toBe(ReplacementStatus.Saved);
  });

  test("stops when the captcha keeps coming back", async () => {
    const captcha: UploadState = { kind: "captcha", postUrl: "https://imgur.com/a/x" };
    const { dependencies } = fakeDependencies({ uploads: [captcha, captcha, captcha] });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(result.stoppedReason).toMatch(/captcha/i);
    expect(result.ledger.entries.alice).toBeUndefined();
  });

  test("stops on an ambiguous upload rather than guessing which image went up", async () => {
    const { calls, dependencies } = fakeDependencies({
      uploads: [{ kind: "ambiguous", reason: "2 images on https://imgur.com/a/two" }],
    });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(result.stoppedReason).toMatch(/2 images/);
    expect(calls).toEqual(["upload alice.png"]);
  });

  test("records a failed upload and moves on to the next image", async () => {
    const { dependencies } = fakeDependencies({
      uploads: [{ kind: "failed", reason: "Imgur reported the upload failed" }, uploaded("newBob")],
    });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(result.ledger.entries.alice?.status).toBe(ReplacementStatus.UploadFailed);
    expect(result.ledger.entries.bob?.status).toBe(ReplacementStatus.Saved);
  });

  test("a guard conflict is final and never retried", async () => {
    const { dependencies } = fakeDependencies({
      saves: [{ detail: "field held https://imgur.com/authorPick", outcome: "conflict" }],
      uploads: [uploaded("newAlice"), uploaded("newBob")],
    });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(result.ledger.entries.alice).toMatchObject({
      reason: "field held https://imgur.com/authorPick",
      status: ReplacementStatus.Conflict,
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

    expect(result.ledger.entries.alice).toMatchObject({
      reason: "Firebase does not show newAlice yet",
      status: ReplacementStatus.Uploaded,
    });
  });

  test("stops after repeated save failures, which usually means the site session expired", async () => {
    const failed: SaveOutcome = { detail: "no image field on the edit page", outcome: "failed" };
    const { dependencies } = fakeDependencies({
      saves: [failed, failed],
      uploads: [uploaded("newAlice"), uploaded("newBob")],
    });

    const result = await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(result.stoppedReason).toMatch(/sign/i);
    expect(result.ledger.entries.alice?.status).toBe(ReplacementStatus.Uploaded);
    expect(result.ledger.entries.bob?.status).toBe(ReplacementStatus.Uploaded);
  });

  test("a resumed save step does not upload again", async () => {
    const { calls, dependencies } = fakeDependencies({ uploads: [] });
    const upload = {
      ext: "png",
      imgurId: "newAlice",
      postUrl: "https://imgur.com/a/pa",
      uploadedAt: "2000-01-01T00:00:00.000Z",
    };

    await runReplacementLoop(
      [{ file: "alice.png", key: "alice", previousImgurId: "oldAlice", step: "save", upload }],
      {
        entries: {
          alice: { previousImgurId: "oldAlice", status: ReplacementStatus.Uploaded, upload },
        },
        version: 1,
      },
      dependencies,
      options,
    );

    expect(calls).toEqual(["save alice oldAlice newAlice", "confirm alice newAlice"]);
  });

  test("spaces uploads out", async () => {
    const { dependencies, sleeps } = fakeDependencies({
      uploads: [uploaded("newAlice"), uploaded("newBob")],
    });

    await runReplacementLoop(queue, emptyReplacementLedger(), dependencies, options);

    expect(sleeps).toEqual([8_000]);
  });
});

describe("replacement audit", () => {
  test("a replacement is live when Firebase holds it and Imgur serves the image and its thumbnail", () => {
    expect(
      auditReplacement("newAlice", {
        firebaseImageId: "newAlice",
        fullStatus: 200,
        thumbnailStatus: 200,
      }),
    ).toEqual([]);
  });

  test("reports every way a replacement can fail to be live", () => {
    expect(
      auditReplacement("newAlice", {
        firebaseImageId: "authorPick",
        fullStatus: 302,
        thumbnailStatus: 404,
      }),
    ).toEqual([
      "Firebase holds authorPick, not newAlice",
      "i.imgur.com/newAlice.png returned 302",
      "i.imgur.com/newAlicel.png returned 404",
    ]);
    expect(
      auditReplacement("newAlice", {
        firebaseImageId: null,
        fullStatus: 200,
        thumbnailStatus: 200,
      }),
    ).toEqual(["Firebase holds no image, not newAlice"]);
  });
});
