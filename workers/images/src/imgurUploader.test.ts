import { describe, expect, it, vi } from "vitest";
import { ImgurFailure, type ImgurTokenState } from "./imgurClient.ts";
import {
  handleImgurUploaderRequest,
  type ImgurTokenStore,
  resolveStoredToken,
  type StoredImgurToken,
} from "./imgurUploader.ts";

const now = 1_800_000_000_000;
const credentials = { clientId: "client-id", clientSecret: "client-secret" };
const hash = async (value: string) => `hash:${value}`;

describe("resolveStoredToken", () => {
  it("starts from the seed secret when nothing is stored", async () => {
    expect(await resolveStoredToken(undefined, "seed-token", hash)).toEqual({
      seedHash: "hash:seed-token",
      state: { accessToken: null, accessTokenExpiresAt: 0, refreshToken: "seed-token" },
    });
  });

  it("prefers the stored, possibly rotated, token while the seed is unchanged", async () => {
    const stored: StoredImgurToken = {
      seedHash: "hash:seed-token",
      state: { accessToken: "access", accessTokenExpiresAt: now, refreshToken: "rotated" },
    };

    expect(await resolveStoredToken(stored, "seed-token", hash)).toEqual(stored);
  });

  it("drops the stored token when the seed secret changes after a re-consent", async () => {
    const stored: StoredImgurToken = {
      seedHash: "hash:old-seed",
      state: { accessToken: "access", accessTokenExpiresAt: now, refreshToken: "rotated" },
    };

    expect((await resolveStoredToken(stored, "new-seed", hash)).state.refreshToken).toBe(
      "new-seed",
    );
  });
});

const createStore = (initial?: ImgurTokenState) => {
  let state: ImgurTokenState = initial ?? {
    accessToken: "access-token",
    accessTokenExpiresAt: now + 60 * 60 * 1000,
    refreshToken: "refresh-token",
  };
  const saved: ImgurTokenState[] = [];
  const store: ImgurTokenStore = {
    load: async () => state,
    save: async (next) => {
      state = next;
      saved.push(next);
    },
  };
  return { saved, store };
};

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const dependenciesFor = (...responses: Response[]) => {
  const queue = [...responses];
  return {
    fetch: vi.fn(async () => queue.shift() ?? json(500, {})),
    now: () => now,
    sleep: vi.fn(async () => {}),
  };
};

const uploadRequest = () =>
  new Request("https://imgur-uploader/upload", {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: new Uint8Array([1, 2, 3]),
  });

describe("handleImgurUploaderRequest", () => {
  it("uploads and answers the Imgur id and deletehash", async () => {
    const { store } = createStore();
    const dependencies = dependenciesFor(
      json(200, { data: { id: "AbCdE12", deletehash: "delete-hash" }, success: true }),
    );

    const response = await handleImgurUploaderRequest(
      uploadRequest(),
      store,
      credentials,
      dependencies,
    );

    expect(await response.json()).toEqual({ ok: true, id: "AbCdE12", deletehash: "delete-hash" });
  });

  it("persists a renewed token so the next request does not renew again", async () => {
    const { saved, store } = createStore({
      accessToken: null,
      accessTokenExpiresAt: 0,
      refreshToken: "refresh-token",
    });
    const dependencies = dependenciesFor(
      json(200, { access_token: "new-access", expires_in: 3600, refresh_token: "rotated" }),
      json(200, { data: { id: "AbCdE12", deletehash: "delete-hash" }, success: true }),
    );

    await handleImgurUploaderRequest(uploadRequest(), store, credentials, dependencies);

    expect(saved).toEqual([
      { accessToken: "new-access", accessTokenExpiresAt: now + 3_600_000, refreshToken: "rotated" },
    ]);
  });

  it("reports missing credentials as unauthorized without calling Imgur", async () => {
    const { store } = createStore();
    const dependencies = dependenciesFor();

    const response = await handleImgurUploaderRequest(uploadRequest(), store, null, dependencies);

    expect(await response.json()).toEqual({
      ok: false,
      reason: ImgurFailure.Unauthorized,
      detail: "Imgur credentials are not configured",
    });
    expect(dependencies.fetch).not.toHaveBeenCalled();
  });

  it("deletes by deletehash", async () => {
    const { store } = createStore();
    const dependencies = dependenciesFor(json(200, { success: true }));

    const response = await handleImgurUploaderRequest(
      new Request("https://imgur-uploader/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deletehash: "delete-hash" }),
      }),
      store,
      credentials,
      dependencies,
    );

    expect(await response.json()).toEqual({ ok: true });
    expect(dependencies.fetch).toHaveBeenCalledWith(
      "https://api.imgur.com/3/image/delete-hash",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("answers 404 for anything else", async () => {
    const { store } = createStore();

    const response = await handleImgurUploaderRequest(
      new Request("https://imgur-uploader/other", { method: "POST" }),
      store,
      credentials,
      dependenciesFor(),
    );

    expect(response.status).toBe(404);
  });
});
