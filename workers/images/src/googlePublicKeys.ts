export const googlePublicKeyUrl =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const importAlgorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as const;
const fallbackMaxAgeSeconds = 300;
// A key id missing from a fresh set is either a rotation or a forged token. Rotations are rare, so
// refetching for unknown ids at most once a minute keeps up with them without letting anyone make
// every request fetch Google's key set.
const unknownKeyRefetchIntervalSeconds = 60;

export interface GooglePublicKeyProviderOptions {
  readonly fetch: (url: string) => Promise<Response>;
  readonly now: () => number;
}

interface CachedKeySet {
  readonly expiresAt: number;
  readonly keys: ReadonlyMap<string, CryptoKey>;
}

const parseMaxAgeSeconds = (response: Response): number => {
  const match = /max-age=(\d+)/.exec(response.headers.get("cache-control") ?? "");
  return match ? Number(match[1]) : fallbackMaxAgeSeconds;
};

const importKeySet = async (response: Response): Promise<ReadonlyMap<string, CryptoKey>> => {
  const body: unknown = await response.json();
  const keys =
    typeof body === "object" && body !== null ? (body as { keys?: unknown }).keys : undefined;
  if (!Array.isArray(keys)) return new Map();

  const imported = new Map<string, CryptoKey>();
  for (const candidate of keys as readonly JsonWebKey[]) {
    const keyId = (candidate as { kid?: unknown }).kid;
    if (typeof keyId !== "string" || keyId === "") continue;

    try {
      imported.set(
        keyId,
        await crypto.subtle.importKey("jwk", candidate, importAlgorithm, false, ["verify"]),
      );
    } catch {
      continue;
    }
  }
  return imported;
};

export const createGooglePublicKeyProvider = (
  options: GooglePublicKeyProviderOptions,
): ((keyId: string) => Promise<CryptoKey | null>) => {
  let cached: CachedKeySet | null = null;
  let lastFetchedAt = Number.NEGATIVE_INFINITY;

  const refresh = async (): Promise<ReadonlyMap<string, CryptoKey> | null> => {
    lastFetchedAt = options.now();
    let response: Response;
    try {
      response = await options.fetch(googlePublicKeyUrl);
    } catch {
      return null;
    }
    if (!response.ok) return null;

    let keys: ReadonlyMap<string, CryptoKey>;
    try {
      keys = await importKeySet(response);
    } catch {
      return null;
    }

    cached = { expiresAt: options.now() + parseMaxAgeSeconds(response), keys };
    return keys;
  };

  return async (keyId: string): Promise<CryptoKey | null> => {
    const fresh = cached && cached.expiresAt >= options.now() ? cached.keys : null;
    if (fresh?.has(keyId)) return fresh.get(keyId) ?? null;
    if (fresh && options.now() - lastFetchedAt < unknownKeyRefetchIntervalSeconds) return null;

    const refreshed = await refresh();
    return refreshed?.get(keyId) ?? null;
  };
};
