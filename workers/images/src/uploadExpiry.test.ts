import { describe, expect, it, vi } from "vitest";
import {
  createSummaryReferenceCheck,
  type ExpiryDependencies,
  expireUpload,
  handleUploadExpiryRequest,
  uploadLifetimeMilliseconds,
} from "./uploadExpiry.ts";

const createDependencies = (referenced: boolean | Error = false) => {
  const deleted: string[] = [];
  const dependencies = {
    deleteFromImgur: vi.fn(async () => ({ ok: true as const })),
    deleteObjects: vi.fn(async (keys: string[]) => {
      deleted.push(...keys);
    }),
    isReferenced: vi.fn(async () => {
      if (referenced instanceof Error) throw referenced;
      return referenced;
    }),
  } satisfies ExpiryDependencies;
  return { deleted, dependencies };
};

describe("expireUpload", () => {
  it("deletes an upload no blueprint uses from R2 and from Imgur", async () => {
    const { deleted, dependencies } = createDependencies();

    const outcome = await expireUpload(
      { imageId: "AbCdE12", imgurDeletehash: "hash" },
      dependencies,
    );

    expect(outcome).toBe("deleted");
    expect(dependencies.deleteFromImgur).toHaveBeenCalledWith("hash");
    expect(deleted).toEqual([
      "legacy-imgur/AbCdE12/original",
      "legacy-imgur/AbCdE12/thumbnail",
      "legacy-imgur/AbCdE12/large",
    ]);
  });

  it("keeps an upload a blueprint uses", async () => {
    const { deleted, dependencies } = createDependencies(true);

    const outcome = await expireUpload(
      { imageId: "AbCdE12", imgurDeletehash: "hash" },
      dependencies,
    );

    expect(outcome).toBe("referenced");
    expect(deleted).toEqual([]);
    expect(dependencies.deleteFromImgur).not.toHaveBeenCalled();
  });

  it("deletes a fallback-id upload from R2 without calling Imgur", async () => {
    const { dependencies } = createDependencies();

    expect(await expireUpload({ imageId: "Fallback0123456789Ab" }, dependencies)).toBe("deleted");
    expect(dependencies.deleteFromImgur).not.toHaveBeenCalled();
  });

  it("asks for a retry, deleting nothing, when Firebase cannot answer", async () => {
    const { deleted, dependencies } = createDependencies(new Error("Firebase returned 503"));

    expect(await expireUpload({ imageId: "AbCdE12", imgurDeletehash: "hash" }, dependencies)).toBe(
      "retry",
    );
    expect(deleted).toEqual([]);
  });

  it("asks for a retry, keeping R2, when Imgur refuses the delete", async () => {
    const { deleted, dependencies } = createDependencies();
    dependencies.deleteFromImgur.mockResolvedValue({
      ok: false,
      reason: "unavailable",
      detail: "delete returned 503",
    } as never);

    expect(await expireUpload({ imageId: "AbCdE12", imgurDeletehash: "hash" }, dependencies)).toBe(
      "retry",
    );
    expect(deleted).toEqual([]);
  });
});

const createStorage = () => {
  const values = new Map<string, unknown>();
  const alarms: number[] = [];
  return {
    alarms,
    storage: {
      get: async <T>(key: string) => values.get(key) as T | undefined,
      put: async (key: string, value: unknown) => {
        values.set(key, value);
      },
      setAlarm: async (time: number) => {
        alarms.push(time);
      },
    },
    values,
  };
};

describe("handleUploadExpiryRequest", () => {
  it("records the upload and sets an alarm an hour out", async () => {
    const { alarms, storage, values } = createStorage();
    const now = 1_800_000_000_000;

    const response = await handleUploadExpiryRequest(
      new Request("https://upload-expiry/schedule", {
        method: "POST",
        body: JSON.stringify({ imageId: "AbCdE12", imgurDeletehash: "hash" }),
      }),
      storage,
      () => now,
    );

    expect(response.status).toBe(204);
    expect(uploadLifetimeMilliseconds).toBe(60 * 60 * 1000);
    expect(alarms).toEqual([now + uploadLifetimeMilliseconds]);
    expect([...values.values()]).toEqual([
      { attempts: 0, imageId: "AbCdE12", imgurDeletehash: "hash" },
    ]);
  });
});

describe("createSummaryReferenceCheck", () => {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

  it("asks Firebase for a summary whose imgurId is the image id", async () => {
    const fetch = vi.fn(async (_url: string) =>
      json(200, { "-Blueprint12345678901": { imgurId: "AbCdE12" } }),
    );
    const isReferenced = createSummaryReferenceCheck(
      fetch,
      "https://facorio-blueprints.firebaseio.com",
    );

    expect(await isReferenced("AbCdE12")).toBe(true);
    const url = new URL(String(fetch.mock.calls[0]![0]));
    expect(url.origin + url.pathname).toBe(
      "https://facorio-blueprints.firebaseio.com/blueprintSummaries.json",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      equalTo: '"AbCdE12"',
      limitToFirst: "1",
      orderBy: '"imgurId"',
    });
  });

  it("reads an empty answer as unreferenced", async () => {
    const isReferenced = createSummaryReferenceCheck(
      async () => json(200, {}),
      "https://db.example",
    );

    expect(await isReferenced("AbCdE12")).toBe(false);
  });

  it("throws on an error so the upload is kept for a retry", async () => {
    const isReferenced = createSummaryReferenceCheck(
      async () => json(400, { error: "Index not defined" }),
      "https://db.example",
    );

    await expect(isReferenced("AbCdE12")).rejects.toThrow("Firebase returned 400");
  });
});
