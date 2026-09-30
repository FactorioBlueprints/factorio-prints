import { isFallbackImageId } from "../../workers/images/src/imageIds";
import buildImageUrl, { ImageVariant, resolveImageGatewayOrigin } from "./buildImageUrl";

// Sends a screenshot to the image Worker, which stores it on Imgur and in R2 and answers the id to
// save on the blueprint. The Worker enforces the same limits; checking here first spares a
// pointless upload and gives a clearer message.

export interface UploadedImage {
  readonly id: string;
  readonly type: string;
  // When this browser finished the upload; lets a saved Create draft notice a stale image.
  readonly uploadedAt?: number;
}

export const maximumUploadBytes = 10 * 1024 * 1024;

const acceptedTypes = new Set(["image/gif", "image/jpeg", "image/png"]);

const messages = {
  network: "The upload did not reach the server. Check your connection and retry.",
  signIn: "Sign in again, then retry the upload.",
  tooLarge: "The image is larger than 10 MB.",
  unreadable: "The image is too large in pixels or could not be read.",
  unsupported: "Choose a PNG, JPEG or GIF image.",
  hourlyLimit: "You have reached the limit of 10 uploads an hour. Try again later.",
  busy: "Image storage is busy. Try again in a minute.",
  unexpected: "The upload failed. Try again.",
} as const;

const statusMessages: Readonly<Record<number, string>> = {
  401: messages.signIn,
  413: messages.tooLarge,
  415: messages.unsupported,
  422: messages.unreadable,
  429: messages.hourlyLimit,
  503: messages.busy,
};

interface UploadOptions {
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
  readonly gatewayOrigin: string;
}

const defaultOptions = (): UploadOptions => ({
  fetch: (url, init) => fetch(url, init),
  gatewayOrigin: resolveImageGatewayOrigin(import.meta.env),
});

export const uploadImage = async (
  file: Blob,
  getIdToken: () => Promise<string>,
  options: UploadOptions = defaultOptions(),
): Promise<UploadedImage> => {
  if (!acceptedTypes.has(file.type)) throw new Error(messages.unsupported);
  if (file.size > maximumUploadBytes) throw new Error(messages.tooLarge);

  const token = await getIdToken();
  let response: Response;
  try {
    response = await options.fetch(`${options.gatewayOrigin}/uploads`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": file.type },
      body: file,
    });
  } catch {
    throw new Error(messages.network);
  }
  if (!response.ok) throw new Error(statusMessages[response.status] ?? messages.unexpected);

  const body = (await response.json()) as Partial<UploadedImage>;
  if (typeof body.id !== "string" || typeof body.type !== "string") {
    throw new Error(messages.unexpected);
  }
  return { id: body.id, type: body.type };
};

// What blueprintsPrivate/<id>/imageUrl records: the Imgur page while Imgur has the image, the
// gateway URL for a fallback id that only R2 holds.
export const imageSourceUrl = (
  image: UploadedImage,
  gatewayOrigin = resolveImageGatewayOrigin(import.meta.env),
): string =>
  isFallbackImageId(image.id)
    ? buildImageUrl(image.id, image.type, ImageVariant.Original, gatewayOrigin)
    : `https://imgur.com/${image.id}`;

// The upload Worker deletes an upload no blueprint references within an hour. A Create draft saved
// in localStorage can outlive that, so its image is restored only while it is safely younger.
const draftImageLifetimeMilliseconds = 45 * 60 * 1000;

export const restorableDraftImage = (value: unknown, now: number): UploadedImage | null => {
  if (typeof value !== "object" || value === null) return null;
  const { id, type, uploadedAt } = value as Partial<UploadedImage>;
  if (typeof id !== "string" || typeof type !== "string" || typeof uploadedAt !== "number") {
    return null;
  }
  return now - uploadedAt <= draftImageLifetimeMilliseconds ? { id, type, uploadedAt } : null;
};
