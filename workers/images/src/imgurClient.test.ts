import { describe, expect, it, vi } from "vitest";
import {
  deleteImgurImage,
  ImgurFailure,
  type ImgurTokenState,
  uploadToImgur,
} from "./imgurClient.ts";

const now = 1_800_000_000_000;
const credentials = { clientId: "client-id", clientSecret: "client-secret" };
const bytes = new Uint8Array([1, 2, 3]);

const freshState: ImgurTokenState = {
  accessToken: "access-token",
  accessTokenExpiresAt: now + 60 * 60 * 1000,
  refreshToken: "refresh-token",
};

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const uploaded = (id = "AbCdE12", deletehash = "delete-hash", type = "image/png") =>
  json(200, { data: { id, deletehash, type }, success: true, status: 200 });

const refreshed = (accessToken = "new-access-token", refreshToken?: string) =>
  json(200, {
    access_token: accessToken,
    expires_in: 2_419_200,
    ...(refreshToken ? { refresh_token: refreshToken } : {}),
  });

const createDependencies = (...responses: (Response | Error)[]) => {
  const queue = [...responses];
  const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected fetch");
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = vi.fn(async (_milliseconds: number) => {});
  return { fetch, now: () => now, sleep };
};

const requestAt = (fetch: ReturnType<typeof vi.fn>, index: number) => {
  const [input, init] = fetch.mock.calls[index] as [string, RequestInit];
  return { init, url: String(input) };
};

describe("uploadToImgur", () => {
  it("uploads with the stored access token when it is still valid", async () => {
    const dependencies = createDependencies(uploaded());

    const { result, state } = await uploadToImgur(
      bytes,
      "image/png",
      freshState,
      credentials,
      dependencies,
    );

    expect(result).toEqual({ ok: true, id: "AbCdE12", deletehash: "delete-hash" });
    expect(state).toEqual(freshState);
    const { init, url } = requestAt(dependencies.fetch, 0);
    expect(url).toBe("https://api.imgur.com/3/image");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer access-token");
    const form = init.body as FormData;
    expect(form.get("type")).toBe("file");
    expect(form.get("image")).toBeInstanceOf(Blob);
  });

  it("renews an expired access token before uploading and keeps a rotated refresh token", async () => {
    const dependencies = createDependencies(
      refreshed("new-access-token", "new-refresh-token"),
      uploaded(),
    );
    const expired = { ...freshState, accessTokenExpiresAt: now - 1 };

    const { result, state } = await uploadToImgur(
      bytes,
      "image/png",
      expired,
      credentials,
      dependencies,
    );

    expect(result.ok).toBe(true);
    expect(state).toEqual({
      accessToken: "new-access-token",
      accessTokenExpiresAt: now + 2_419_200 * 1000,
      refreshToken: "new-refresh-token",
    });
    const refresh = requestAt(dependencies.fetch, 0);
    expect(refresh.url).toBe("https://api.imgur.com/oauth2/token");
    const form = new URLSearchParams(String(refresh.init.body));
    expect(Object.fromEntries(form)).toEqual({
      client_id: "client-id",
      client_secret: "client-secret",
      grant_type: "refresh_token",
      refresh_token: "refresh-token",
    });
    expect(new Headers(requestAt(dependencies.fetch, 1).init.headers).get("authorization")).toBe(
      "Bearer new-access-token",
    );
  });

  it("keeps the old refresh token when Imgur does not rotate it", async () => {
    const dependencies = createDependencies(refreshed(), uploaded());

    const { state } = await uploadToImgur(
      bytes,
      "image/png",
      { ...freshState, accessToken: null },
      credentials,
      dependencies,
    );

    expect(state.refreshToken).toBe("refresh-token");
  });

  it("renews once and retries when Imgur rejects the access token", async () => {
    const dependencies = createDependencies(json(401, { success: false }), refreshed(), uploaded());

    const { result, state } = await uploadToImgur(
      bytes,
      "image/png",
      freshState,
      credentials,
      dependencies,
    );

    expect(result.ok).toBe(true);
    expect(state.accessToken).toBe("new-access-token");
    expect(dependencies.fetch).toHaveBeenCalledTimes(3);
  });

  it("reports the account as unauthorized when the refresh token is refused", async () => {
    const dependencies = createDependencies(json(400, { error: "invalid_grant" }));

    const { result } = await uploadToImgur(
      bytes,
      "image/png",
      { ...freshState, accessToken: null },
      credentials,
      dependencies,
    );

    expect(result).toEqual({
      ok: false,
      reason: ImgurFailure.Unauthorized,
      detail: "token refresh returned 400",
    });
    expect(dependencies.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries an upload Imgur throttled, then gives up", async () => {
    const dependencies = createDependencies(json(429, {}), json(429, {}), json(429, {}));

    const { result } = await uploadToImgur(
      bytes,
      "image/png",
      freshState,
      credentials,
      dependencies,
      { attempts: 3, retryDelayMilliseconds: 500 },
    );

    expect(result).toEqual({
      ok: false,
      reason: ImgurFailure.Unavailable,
      detail: "upload returned 429",
    });
    expect(dependencies.fetch).toHaveBeenCalledTimes(3);
    expect(dependencies.sleep.mock.calls).toEqual([[500], [1000]]);
  });

  it("does not retry an upload after a server error or dropped connection, which may have stored it", async () => {
    for (const failure of [json(503, {}), new Error("network down")]) {
      const dependencies = createDependencies(failure, uploaded());

      const { result } = await uploadToImgur(
        bytes,
        "image/png",
        freshState,
        credentials,
        dependencies,
        { attempts: 3, retryDelayMilliseconds: 500 },
      );

      expect(result.ok).toBe(false);
      expect(dependencies.fetch).toHaveBeenCalledTimes(1);
    }
  });

  it("does not retry an image Imgur rejects", async () => {
    const dependencies = createDependencies(json(400, { data: { error: "Bad image" } }));

    const { result } = await uploadToImgur(
      bytes,
      "image/png",
      freshState,
      credentials,
      dependencies,
      {
        attempts: 3,
        retryDelayMilliseconds: 500,
      },
    );

    expect(result).toEqual({
      ok: false,
      reason: ImgurFailure.Rejected,
      detail: "upload returned 400",
    });
    expect(dependencies.fetch).toHaveBeenCalledTimes(1);
  });

  it("treats a success response without an id or deletehash as unavailable", async () => {
    const dependencies = createDependencies(json(200, { data: {}, success: true }));

    const { result } = await uploadToImgur(
      bytes,
      "image/png",
      freshState,
      credentials,
      dependencies,
    );

    expect(result).toEqual({
      ok: false,
      reason: ImgurFailure.Unavailable,
      detail: "upload response had no id or deletehash",
    });
  });
});

describe("deleteImgurImage", () => {
  it("deletes by deletehash with the account token", async () => {
    const dependencies = createDependencies(json(200, { success: true }));

    const { result } = await deleteImgurImage("delete-hash", freshState, credentials, dependencies);

    expect(result).toEqual({ ok: true });
    const { init, url } = requestAt(dependencies.fetch, 0);
    expect(url).toBe("https://api.imgur.com/3/image/delete-hash");
    expect(init.method).toBe("DELETE");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer access-token");
  });

  it("retries a delete after a server error, since deleting twice is harmless", async () => {
    const dependencies = createDependencies(json(503, {}), json(200, { success: true }));

    const { result } = await deleteImgurImage("delete-hash", freshState, credentials, dependencies);

    expect(result).toEqual({ ok: true });
    expect(dependencies.fetch).toHaveBeenCalledTimes(2);
  });

  it("treats an image that is already gone as deleted", async () => {
    const dependencies = createDependencies(json(404, { success: false }));

    const { result } = await deleteImgurImage("delete-hash", freshState, credentials, dependencies);

    expect(result).toEqual({ ok: true });
  });
});
