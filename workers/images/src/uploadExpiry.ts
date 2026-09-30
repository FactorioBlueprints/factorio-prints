import type { ImgurDeleteResult } from "./imgurClient.ts";
import { deleteThroughImgurUploader } from "./imgurUploader.ts";

// Every upload gets an hour to be saved on a blueprint. One Durable Object per upload holds an
// alarm for that hour; when it fires, an upload no blueprint uses is deleted from R2 and from
// Imgur. This keeps signed-in users from using uploads as free image hosting.

export const uploadLifetimeMilliseconds = 60 * 60 * 1000;

const retryDelayMilliseconds = 15 * 60 * 1000;
const maximumAttempts = 24;
const recordKey = "upload";
const legacyImgurPrefix = "legacy-imgur";
const variants = ["original", "thumbnail", "large"] as const;

export interface PendingUpload {
  readonly imageId: string;
  readonly imgurDeletehash?: string;
}

interface StoredUpload extends PendingUpload {
  readonly attempts: number;
}

export interface ExpiryDependencies {
  readonly deleteFromImgur: (deletehash: string) => Promise<ImgurDeleteResult>;
  readonly deleteObjects: (keys: string[]) => Promise<void>;
  readonly isReferenced: (imageId: string) => Promise<boolean>;
}

export type ExpiryOutcome = "deleted" | "referenced" | "retry";

export const expireUpload = async (
  upload: PendingUpload,
  dependencies: ExpiryDependencies,
): Promise<ExpiryOutcome> => {
  let referenced: boolean;
  try {
    referenced = await dependencies.isReferenced(upload.imageId);
  } catch (error) {
    console.error({
      event: "upload_expiry_lookup_failed",
      imageId: upload.imageId,
      message: String(error),
    });
    return "retry";
  }
  if (referenced) return "referenced";

  // Imgur first: if its copy cannot be removed now, keep everything so the retry sees the same state.
  if (upload.imgurDeletehash) {
    const imgur = await dependencies.deleteFromImgur(upload.imgurDeletehash);
    if (!imgur.ok) {
      console.warn({
        event: "upload_expiry_imgur_delete_failed",
        imageId: upload.imageId,
        detail: imgur.detail,
      });
      return "retry";
    }
  }
  await dependencies.deleteObjects(
    variants.map((variant) => `${legacyImgurPrefix}/${upload.imageId}/${variant}`),
  );
  return "deleted";
};

// Every blueprint save writes its summary's imgurId, so one indexed query answers whether any
// blueprint uses an upload. The rules must list imgurId in blueprintSummaries/.indexOn.
export const createSummaryReferenceCheck =
  (fetch: (url: string) => Promise<Response>, databaseUrl: string) =>
  async (imageId: string): Promise<boolean> => {
    const url = new URL(`${databaseUrl}/blueprintSummaries.json`);
    url.searchParams.set("orderBy", JSON.stringify("imgurId"));
    url.searchParams.set("equalTo", JSON.stringify(imageId));
    url.searchParams.set("limitToFirst", "1");
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Firebase returned ${response.status}`);
    const matches = (await response.json()) as Record<string, unknown> | null;
    return matches !== null && Object.keys(matches).length > 0;
  };

export interface ExpiryStorage {
  readonly get: <T>(key: string) => Promise<T | undefined>;
  readonly put: (key: string, value: unknown) => Promise<void>;
  readonly setAlarm: (scheduledTime: number) => Promise<void>;
}

export const handleUploadExpiryRequest = async (
  request: Request,
  storage: ExpiryStorage,
  now: () => number,
): Promise<Response> => {
  const upload = (await request.json()) as PendingUpload;
  const stored: StoredUpload = { attempts: 0, ...upload };
  await storage.put(recordKey, stored);
  await storage.setAlarm(now() + uploadLifetimeMilliseconds);
  return new Response(null, { status: 204 });
};

export class UploadExpiry implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly environment: Env,
  ) {}

  fetch(request: Request): Promise<Response> {
    return handleUploadExpiryRequest(request, this.state.storage, () => Date.now());
  }

  async alarm(): Promise<void> {
    const upload = await this.state.storage.get<StoredUpload>(recordKey);
    if (!upload) return;

    const outcome = await expireUpload(upload, {
      deleteFromImgur: (deletehash) =>
        deleteThroughImgurUploader(this.environment.IMGUR_UPLOADER, deletehash),
      deleteObjects: (keys) => this.environment.IMAGES.delete(keys),
      isReferenced: createSummaryReferenceCheck(
        (url) => fetch(url),
        this.environment.FIREBASE_DATABASE_URL,
      ),
    });
    if (outcome !== "retry") {
      console.log({ event: "upload_expiry_finished", imageId: upload.imageId, outcome });
      await this.state.storage.deleteAll();
      return;
    }
    if (upload.attempts + 1 >= maximumAttempts) {
      console.error({
        event: "upload_expiry_abandoned",
        imageId: upload.imageId,
        attempts: upload.attempts + 1,
      });
      await this.state.storage.deleteAll();
      return;
    }
    await this.state.storage.put(recordKey, { ...upload, attempts: upload.attempts + 1 });
    await this.state.storage.setAlarm(Date.now() + retryDelayMilliseconds);
  }
}

export const scheduleThroughUploadExpiry = async (
  namespace: DurableObjectNamespace,
  imageId: string,
  imgurDeletehash: string | undefined,
): Promise<void> => {
  const stub = namespace.get(namespace.idFromName(imageId));
  const response = await stub.fetch("https://upload-expiry/schedule", {
    method: "POST",
    body: JSON.stringify({ imageId, ...(imgurDeletehash ? { imgurDeletehash } : {}) }),
  });
  if (!response.ok) throw new Error(`upload expiry answered ${response.status}`);
};
