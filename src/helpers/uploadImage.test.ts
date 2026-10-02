import { describe, expect, it, vi } from "vitest";
import {
  imageSourceUrl,
  maximumUploadBytes,
  restorableDraftImage,
  uploadImage,
} from "./uploadImage";

const gatewayOrigin = "https://images.example.com";
const png = () => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });

const respond = (status: number, body: unknown = {}) =>
  vi.fn(async () =>
    typeof body === "string"
      ? new Response(body, { status })
      : new Response(JSON.stringify(body), { status }),
  );

describe("uploadImage", () => {
  it("posts the file to the gateway with the user's ID token and returns the stored image", async () => {
    const fetch = respond(201, { id: "AbCdE12", type: "image/png" });
    const file = png();

    const image = await uploadImage(file, async () => "id-token", { fetch, gatewayOrigin });

    expect(image).toEqual({ id: "AbCdE12", type: "image/png" });
    expect(fetch).toHaveBeenCalledWith(`${gatewayOrigin}/uploads`, {
      method: "POST",
      headers: { authorization: "Bearer id-token", "content-type": "image/png" },
      body: file,
    });
  });

  it("refuses files that are not PNG, JPEG or GIF before uploading", async () => {
    const fetch = respond(201);

    await expect(
      uploadImage(new Blob(["x"], { type: "image/webp" }), async () => "token", {
        fetch,
        gatewayOrigin,
      }),
    ).rejects.toThrow("Choose a PNG, JPEG or GIF image.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses files over the size limit before uploading", async () => {
    const fetch = respond(201);
    const tooLarge = new Blob([new Uint8Array(maximumUploadBytes + 1)], { type: "image/png" });

    await expect(
      uploadImage(tooLarge, async () => "token", { fetch, gatewayOrigin }),
    ).rejects.toThrow("The image is larger than 10 MB.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [401, "Sign in again, then retry the upload."],
    [413, "The image is larger than 10 MB."],
    [415, "Choose a PNG, JPEG or GIF image."],
    [422, "The image is too large in pixels or could not be read."],
    [429, "You have reached the limit of 10 uploads an hour. Try again later."],
    [503, "Image storage is busy. Try again in a minute."],
  ])("explains a %i answer", async (status, message) => {
    await expect(
      uploadImage(png(), async () => "token", { fetch: respond(status, "nope"), gatewayOrigin }),
    ).rejects.toThrow(message);
  });

  it("explains a network failure", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(uploadImage(png(), async () => "token", { fetch, gatewayOrigin })).rejects.toThrow(
      "The upload did not reach the server. Check your connection and retry.",
    );
  });
});

describe("imageSourceUrl", () => {
  it("records an Imgur page URL for an Imgur id", () => {
    expect(imageSourceUrl({ id: "AbCdE12", type: "image/png" }, gatewayOrigin)).toBe(
      "https://imgur.com/AbCdE12",
    );
  });

  it("records the gateway URL for a fallback id, which Imgur never saw", () => {
    expect(imageSourceUrl({ id: "Fallback0123456789Ab", type: "image/jpeg" }, gatewayOrigin)).toBe(
      `${gatewayOrigin}/legacy-imgur/Fallback0123456789Ab/original.jpeg`,
    );
  });
});

describe("restorableDraftImage", () => {
  const minute = 60 * 1000;
  const now = Date.parse("2026-10-20T00:00:00Z");

  it("keeps an upload a saved draft made recently", () => {
    const image = { id: "AbCdE12", type: "image/png", uploadedAt: now - 44 * minute };

    expect(restorableDraftImage(image, now)).toEqual(image);
  });

  it("drops an upload the expiry may already have deleted", () => {
    expect(
      restorableDraftImage(
        { id: "AbCdE12", type: "image/png", uploadedAt: now - 45 * minute - 1 },
        now,
      ),
    ).toBeNull();
  });

  it("drops an image with no upload time and anything malformed", () => {
    expect(restorableDraftImage({ id: "AbCdE12", type: "image/png" }, now)).toBeNull();
    expect(restorableDraftImage(undefined, now)).toBeNull();
    expect(restorableDraftImage("https://imgur.com/AbCdE12", now)).toBeNull();
  });
});
