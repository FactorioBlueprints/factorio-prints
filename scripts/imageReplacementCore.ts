import { z } from "zod";

// Applies a reviewed image-replacement round: each replacement is uploaded to Imgur as its own
// post and saved on its blueprint straight away, so progress is visible on the site and a crash
// or an Imgur throttle never strands a batch of uploaded-but-unsaved images.

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
  Saved: "saved",
  UploadFailed: "uploadFailed",
  Uploaded: "uploaded",
} as const;

export type ReplacementStatus = (typeof ReplacementStatus)[keyof typeof ReplacementStatus];

const uploadRecordSchema = z.object({
  ext: z.string().min(1),
  imgurId: z.string().min(1),
  postUrl: z.string().url(),
  uploadedAt: z.string().datetime(),
});

const ledgerEntrySchema = z.object({
  previousImgurId: z.string().nullable(),
  reason: z.string().optional(),
  savedAt: z.string().datetime().optional(),
  status: z.enum(ReplacementStatus),
  upload: uploadRecordSchema.optional(),
});

export const replacementLedgerSchema = z.object({
  entries: z.record(z.string(), ledgerEntrySchema),
  version: z.literal(1),
});

export type ReplacementLedger = z.infer<typeof replacementLedgerSchema>;
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;
export type UploadRecord = z.infer<typeof uploadRecordSchema>;

export const emptyReplacementLedger = (): ReplacementLedger => ({ entries: {}, version: 1 });

export interface ReplacementItem {
  file: string;
  key: string;
  previousImgurId: string | null;
  step: "save" | "upload";
  upload?: UploadRecord;
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
  uploadPlan: z.infer<typeof uploadPlanSchema>;
}

export const buildReplacementQueue = ({
  candidates,
  decisions,
  holdKeys,
  ledger,
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
    if (entry?.status === ReplacementStatus.Saved || entry?.status === ReplacementStatus.Conflict)
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
    const previousImgurId = reviewed.get(key) ?? null;
    if (entry?.status === ReplacementStatus.Uploaded && entry.upload) {
      queue.push({ file, key, previousImgurId, step: "save", upload: entry.upload });
    } else {
      queue.push({ file, key, previousImgurId, step: "upload" });
    }
  }
  return { blocked, queue };
};

export interface ImgurPageObservation {
  captcha: boolean;
  failed: boolean;
  imageFiles: string[];
  url: string;
}

export type UploadState =
  | { ext: string; imgurId: string; kind: "uploaded"; postUrl: string }
  | { kind: "captcha"; postUrl: string }
  | { kind: "failed"; reason: string }
  | { kind: "ambiguous"; reason: string };

export const parseImgurUploadState = ({
  captcha,
  failed,
  imageFiles,
  url,
}: ImgurPageObservation): UploadState => {
  if (captcha) return { kind: "captcha", postUrl: url };
  if (failed) return { kind: "failed", reason: "Imgur reported the upload failed" };
  if (new URL(url).pathname.startsWith("/upload")) {
    return { kind: "ambiguous", reason: `the upload never left ${url}` };
  }
  const distinct = [...new Set(imageFiles)];
  if (distinct.length !== 1) {
    return { kind: "ambiguous", reason: `${distinct.length} images on ${url}` };
  }
  const [imgurId, ext] = distinct[0]!.split(".");
  return { ext: ext!, imgurId: imgurId!, kind: "uploaded", postUrl: url };
};

export const ImageFieldState = {
  AlreadySaved: "alreadySaved",
  Conflict: "conflict",
  Replace: "replace",
} as const;

export type ImageFieldState = (typeof ImageFieldState)[keyof typeof ImageFieldState];

const imgurIdInField = (fieldValue: string): string | null =>
  /imgur\.com\/(?:a\/|gallery\/)?([A-Za-z0-9]+)/.exec(fieldValue)?.[1] ?? null;

// The save only goes ahead if the blueprint still shows the image that was reviewed, so an
// author's own fix made after the review is never overwritten.
export const classifyImageField = (
  fieldValue: string,
  previousImgurId: string | null,
  imgurId: string,
): ImageFieldState => {
  const current = imgurIdInField(fieldValue);
  if (current === imgurId) return ImageFieldState.AlreadySaved;
  if (current === previousImgurId) return ImageFieldState.Replace;
  return ImageFieldState.Conflict;
};

export interface ReplacementObservation {
  firebaseImageId: string | null;
  fullStatus: number;
  thumbnailStatus: number;
}

// Factorio Prints shows the 640px `<id>l` thumbnail on the view page, so a replacement is only
// live once that variant resolves too. Imgur answers 302 for a deleted image.
export const auditReplacement = (imgurId: string, observed: ReplacementObservation): string[] => {
  const problems: string[] = [];
  if (observed.firebaseImageId !== imgurId) {
    problems.push(`Firebase holds ${observed.firebaseImageId ?? "no image"}, not ${imgurId}`);
  }
  if (observed.fullStatus !== 200)
    problems.push(`i.imgur.com/${imgurId}.png returned ${observed.fullStatus}`);
  if (observed.thumbnailStatus !== 200) {
    problems.push(`i.imgur.com/${imgurId}l.png returned ${observed.thumbnailStatus}`);
  }
  return problems;
};

export type SaveOutcome =
  | { detail?: string; outcome: "saved" | "alreadySaved" }
  | { detail: string; outcome: "conflict" | "failed" };

export interface ReplacementDependencies {
  confirmSaved: (key: string, imgurId: string) => Promise<boolean>;
  log: (message: string) => void;
  now: () => Date;
  persistLedger: (ledger: ReplacementLedger) => Promise<void>;
  saveImage: (key: string, previousImgurId: string | null, imgurId: string) => Promise<SaveOutcome>;
  sleep: (milliseconds: number) => Promise<void>;
  uploadImage: (file: string) => Promise<UploadState>;
}

export interface ReplacementOptions {
  captchaBackoffMilliseconds: number;
  maximumConsecutiveCaptchas: number;
  maximumConsecutiveSaveFailures: number;
  uploadSpacingMilliseconds: number;
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
    let upload = item.upload;

    if (item.step === "upload") {
      let consecutiveCaptchas = 0;
      for (;;) {
        if (uploadedBefore) await dependencies.sleep(options.uploadSpacingMilliseconds);
        uploadedBefore = true;
        const state = await dependencies.uploadImage(item.file);
        if (state.kind === "captcha") {
          consecutiveCaptchas += 1;
          if (consecutiveCaptchas >= options.maximumConsecutiveCaptchas) {
            return {
              ledger,
              stoppedReason: `Imgur captcha persisted through ${consecutiveCaptchas} attempts; rerun later to resume`,
            };
          }
          dependencies.log(
            `${progress}: captcha, backing off ${options.captchaBackoffMilliseconds / 60_000} minutes`,
          );
          await dependencies.sleep(options.captchaBackoffMilliseconds);
          uploadedBefore = false;
          continue;
        }
        if (state.kind === "ambiguous") {
          return { ledger, stoppedReason: `ambiguous upload for ${item.key}: ${state.reason}` };
        }
        if (state.kind === "failed") {
          dependencies.log(`${progress}: upload failed, ${state.reason}`);
          await record(item.key, {
            previousImgurId: item.previousImgurId,
            reason: state.reason,
            status: ReplacementStatus.UploadFailed,
          });
          break;
        }
        upload = {
          ext: state.ext,
          imgurId: state.imgurId,
          postUrl: state.postUrl,
          uploadedAt: dependencies.now().toISOString(),
        };
        await record(item.key, {
          previousImgurId: item.previousImgurId,
          status: ReplacementStatus.Uploaded,
          upload,
        });
        dependencies.log(`${progress}: uploaded ${upload.imgurId}`);
        break;
      }
    }
    if (!upload) continue;

    const saved = await dependencies.saveImage(item.key, item.previousImgurId, upload.imgurId);
    if (saved.outcome === "conflict") {
      consecutiveSaveFailures = 0;
      dependencies.log(`${progress}: not saved, ${saved.detail}`);
      await record(item.key, {
        previousImgurId: item.previousImgurId,
        reason: saved.detail,
        status: ReplacementStatus.Conflict,
        upload,
      });
      continue;
    }
    if (saved.outcome === "failed") {
      consecutiveSaveFailures += 1;
      dependencies.log(`${progress}: save failed, ${saved.detail}`);
      await record(item.key, {
        previousImgurId: item.previousImgurId,
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

    if (!(await dependencies.confirmSaved(item.key, upload.imgurId))) {
      dependencies.log(`${progress}: save not visible in Firebase yet`);
      await record(item.key, {
        previousImgurId: item.previousImgurId,
        reason: `Firebase does not show ${upload.imgurId} yet`,
        status: ReplacementStatus.Uploaded,
        upload,
      });
      continue;
    }
    await record(item.key, {
      previousImgurId: item.previousImgurId,
      savedAt: dependencies.now().toISOString(),
      status: ReplacementStatus.Saved,
      upload,
    });
    dependencies.log(`${progress}: saved ${upload.imgurId}`);
  }
  return { ledger };
};
