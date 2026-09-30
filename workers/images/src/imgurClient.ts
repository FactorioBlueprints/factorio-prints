// Talks to the Imgur API as the FactorioBlueprints account. Uploads are never anonymous:
// anonymous images are the ones Imgur deletes, which is the problem this Worker exists to fix.

const imgurImageUrl = "https://api.imgur.com/3/image";
const imgurTokenUrl = "https://api.imgur.com/oauth2/token";
const renewalMarginMilliseconds = 60_000;

export enum ImgurFailure {
  Rejected = "rejected",
  Unauthorized = "unauthorized",
  Unavailable = "unavailable",
}

export interface ImgurCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface ImgurTokenState {
  readonly accessToken: string | null;
  readonly accessTokenExpiresAt: number;
  readonly refreshToken: string;
}

export interface ImgurDependencies {
  readonly fetch: (input: string, init: RequestInit) => Promise<Response>;
  readonly now: () => number;
  readonly sleep: (milliseconds: number) => Promise<void>;
}

export interface ImgurRetryOptions {
  readonly attempts: number;
  readonly retryDelayMilliseconds: number;
}

export type ImgurFailureResult = {
  readonly ok: false;
  readonly reason: ImgurFailure;
  readonly detail: string;
};
export type ImgurUploadResult =
  | { readonly ok: true; readonly id: string; readonly deletehash: string }
  | ImgurFailureResult;
export type ImgurDeleteResult = { readonly ok: true } | ImgurFailureResult;

const defaultRetryOptions: ImgurRetryOptions = { attempts: 3, retryDelayMilliseconds: 500 };

const failure = (reason: ImgurFailure, detail: string): ImgurFailureResult => ({
  ok: false,
  reason,
  detail,
});

const isTransient = (status: number): boolean => status === 429 || status >= 500;

type TokenOutcome =
  | { readonly ok: true; readonly state: ImgurTokenState; readonly accessToken: string }
  | ImgurFailureResult;

const renewAccessToken = async (
  state: ImgurTokenState,
  credentials: ImgurCredentials,
  dependencies: ImgurDependencies,
): Promise<TokenOutcome> => {
  let response: Response;
  try {
    response = await dependencies.fetch(imgurTokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: "refresh_token",
        refresh_token: state.refreshToken,
      }).toString(),
    });
  } catch (error) {
    return failure(ImgurFailure.Unavailable, `token refresh failed: ${String(error)}`);
  }
  if (!response.ok) {
    const reason = isTransient(response.status)
      ? ImgurFailure.Unavailable
      : ImgurFailure.Unauthorized;
    return failure(reason, `token refresh returned ${response.status}`);
  }

  const body = (await response.json().catch(() => ({}))) as {
    access_token?: unknown;
    expires_in?: unknown;
    refresh_token?: unknown;
  };
  if (typeof body.access_token !== "string" || typeof body.expires_in !== "number") {
    return failure(ImgurFailure.Unauthorized, "token refresh returned no access token");
  }
  const renewed: ImgurTokenState = {
    accessToken: body.access_token,
    accessTokenExpiresAt: dependencies.now() + body.expires_in * 1000,
    refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : state.refreshToken,
  };
  return { ok: true, state: renewed, accessToken: body.access_token };
};

const currentAccessToken = async (
  state: ImgurTokenState,
  credentials: ImgurCredentials,
  dependencies: ImgurDependencies,
): Promise<TokenOutcome> => {
  if (
    state.accessToken &&
    state.accessTokenExpiresAt > dependencies.now() + renewalMarginMilliseconds
  ) {
    return { ok: true, state, accessToken: state.accessToken };
  }
  return renewAccessToken(state, credentials, dependencies);
};

// Which failures may be retried. An upload is not idempotent: after a server error or a dropped
// connection Imgur may already hold the image, and a retry would store a second copy that no
// deletehash reaches. Only a 429, which Imgur sends before storing anything, is safe to retry.
interface RetryPolicy {
  readonly afterThrow: boolean;
  readonly afterStatus: (status: number) => boolean;
}

const uploadRetryPolicy: RetryPolicy = {
  afterThrow: false,
  afterStatus: (status) => status === 429,
};
const deleteRetryPolicy: RetryPolicy = { afterThrow: true, afterStatus: isTransient };

// Runs one authenticated Imgur request: renews the access token when it is due, renews once more
// if Imgur answers 401 anyway, and retries the failures its policy allows with a growing delay.
const withAccount = async <T>(
  state: ImgurTokenState,
  credentials: ImgurCredentials,
  dependencies: ImgurDependencies,
  options: ImgurRetryOptions,
  retryPolicy: RetryPolicy,
  describe: string,
  send: (accessToken: string) => Promise<Response>,
  interpret: (response: Response) => Promise<T | ImgurFailureResult>,
): Promise<{ result: T | ImgurFailureResult; state: ImgurTokenState }> => {
  let current = state;
  let renewedAfterRejection = false;
  let lastFailure = failure(ImgurFailure.Unavailable, `${describe} was not attempted`);

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    const token = await currentAccessToken(current, credentials, dependencies);
    if (!token.ok) return { result: token, state: current };
    current = token.state;

    let response: Response;
    try {
      response = await send(token.accessToken);
    } catch (error) {
      lastFailure = failure(ImgurFailure.Unavailable, `${describe} failed: ${String(error)}`);
      if (!retryPolicy.afterThrow) break;
      if (attempt < options.attempts)
        await dependencies.sleep(options.retryDelayMilliseconds * attempt);
      continue;
    }

    if (response.status === 401) {
      if (renewedAfterRejection) {
        return {
          result: failure(ImgurFailure.Unauthorized, `${describe} returned 401`),
          state: current,
        };
      }
      renewedAfterRejection = true;
      current = { ...current, accessToken: null };
      attempt -= 1;
      continue;
    }
    if (isTransient(response.status)) {
      lastFailure = failure(ImgurFailure.Unavailable, `${describe} returned ${response.status}`);
      if (!retryPolicy.afterStatus(response.status)) break;
      if (attempt < options.attempts)
        await dependencies.sleep(options.retryDelayMilliseconds * attempt);
      continue;
    }
    return { result: await interpret(response), state: current };
  }
  return { result: lastFailure, state: current };
};

export const uploadToImgur = (
  bytes: Uint8Array,
  contentType: string,
  state: ImgurTokenState,
  credentials: ImgurCredentials,
  dependencies: ImgurDependencies,
  options: ImgurRetryOptions = defaultRetryOptions,
): Promise<{ result: ImgurUploadResult; state: ImgurTokenState }> =>
  withAccount(
    state,
    credentials,
    dependencies,
    options,
    uploadRetryPolicy,
    "upload",
    (accessToken) => {
      const form = new FormData();
      form.append("image", new Blob([bytes], { type: contentType }));
      form.append("type", "file");
      return dependencies.fetch(imgurImageUrl, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` },
        body: form,
      });
    },
    async (response) => {
      if (!response.ok) return failure(ImgurFailure.Rejected, `upload returned ${response.status}`);
      const body = (await response.json().catch(() => ({}))) as {
        data?: { id?: unknown; deletehash?: unknown };
      };
      const { id, deletehash } = body.data ?? {};
      if (typeof id !== "string" || typeof deletehash !== "string") {
        return failure(ImgurFailure.Unavailable, "upload response had no id or deletehash");
      }
      return { ok: true as const, id, deletehash };
    },
  );

export const deleteImgurImage = (
  deletehash: string,
  state: ImgurTokenState,
  credentials: ImgurCredentials,
  dependencies: ImgurDependencies,
  options: ImgurRetryOptions = defaultRetryOptions,
): Promise<{ result: ImgurDeleteResult; state: ImgurTokenState }> =>
  withAccount(
    state,
    credentials,
    dependencies,
    options,
    deleteRetryPolicy,
    "delete",
    (accessToken) =>
      dependencies.fetch(`${imgurImageUrl}/${encodeURIComponent(deletehash)}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${accessToken}` },
      }),
    async (response) => {
      // An image Imgur already deleted is exactly the state we asked for.
      if (response.ok || response.status === 404) return { ok: true as const };
      return failure(ImgurFailure.Rejected, `delete returned ${response.status}`);
    },
  );
