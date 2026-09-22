import { beforeAll, describe, expect, it, vi } from "vitest";
import { createGooglePublicKeyProvider, googlePublicKeyUrl } from "./googlePublicKeys.ts";

const generateKeyPair = (): Promise<CryptoKeyPair> =>
  crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  ) as Promise<CryptoKeyPair>;

const exportJwk = async (key: CryptoKey): Promise<JsonWebKey> =>
  (await crypto.subtle.exportKey("jwk", key)) as JsonWebKey;

let firstJwk: JsonWebKey;
let secondJwk: JsonWebKey;

beforeAll(async () => {
  const [first, second] = await Promise.all([generateKeyPair(), generateKeyPair()]);
  [firstJwk, secondJwk] = await Promise.all([
    exportJwk(first.publicKey),
    exportJwk(second.publicKey),
  ]);
});

const keySetResponse = (keys: readonly JsonWebKey[], maxAgeSeconds = 3600): Response =>
  new Response(JSON.stringify({ keys }), {
    status: 200,
    headers: { "cache-control": `public, max-age=${maxAgeSeconds}`, "content-type": "text/json" },
  });

const withKeyId = (jwk: JsonWebKey, keyId: string): JsonWebKey & { kid: string } => ({
  ...jwk,
  alg: "RS256",
  kid: keyId,
  use: "sig",
});

describe("createGooglePublicKeyProvider", () => {
  it("imports a verification key for a published key id", async () => {
    const fetchKeys = vi.fn().mockResolvedValue(keySetResponse([withKeyId(firstJwk, "one")]));
    const provider = createGooglePublicKeyProvider({ fetch: fetchKeys, now: () => 0 });

    const key = await provider("one");

    expect(fetchKeys).toHaveBeenCalledExactlyOnceWith(googlePublicKeyUrl);
    expect(key).toMatchObject({ algorithm: { name: "RSASSA-PKCS1-v1_5" }, type: "public" });
  });

  it("serves a second lookup from cache while max-age has not elapsed", async () => {
    const fetchKeys = vi.fn().mockResolvedValue(keySetResponse([withKeyId(firstJwk, "one")], 3600));
    const now = vi.fn().mockReturnValue(0);
    const provider = createGooglePublicKeyProvider({ fetch: fetchKeys, now });

    await provider("one");
    now.mockReturnValue(3599);
    expect(await provider("one")).not.toBeNull();

    expect(fetchKeys).toHaveBeenCalledTimes(1);
  });

  it("refetches the key set once max-age has elapsed", async () => {
    const fetchKeys = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(keySetResponse([withKeyId(firstJwk, "one")], 3600)),
      );
    const now = vi.fn().mockReturnValue(0);
    const provider = createGooglePublicKeyProvider({ fetch: fetchKeys, now });

    await provider("one");
    now.mockReturnValue(3601);
    expect(await provider("one")).not.toBeNull();

    expect(fetchKeys).toHaveBeenCalledTimes(2);
  });

  it("refetches when the requested key id is absent from the cached set", async () => {
    const fetchKeys = vi
      .fn()
      .mockResolvedValueOnce(keySetResponse([withKeyId(firstJwk, "one")]))
      .mockResolvedValueOnce(keySetResponse([withKeyId(secondJwk, "two")]));
    const provider = createGooglePublicKeyProvider({ fetch: fetchKeys, now: () => 0 });

    await provider("one");

    expect(await provider("two")).not.toBeNull();
    expect(fetchKeys).toHaveBeenCalledTimes(2);
  });

  it("returns null when the key id is still absent after refetching", async () => {
    const fetchKeys = vi.fn().mockResolvedValue(keySetResponse([withKeyId(firstJwk, "one")]));
    const provider = createGooglePublicKeyProvider({ fetch: fetchKeys, now: () => 0 });

    expect(await provider("rotated-away")).toBeNull();
  });

  it("returns null and caches nothing when the key set cannot be fetched", async () => {
    const fetchKeys = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream is down", { status: 503 }))
      .mockResolvedValueOnce(keySetResponse([withKeyId(firstJwk, "one")]));
    const provider = createGooglePublicKeyProvider({ fetch: fetchKeys, now: () => 0 });

    expect(await provider("one")).toBeNull();
    expect(await provider("one")).not.toBeNull();
  });

  it("returns null when the key set is not valid JSON", async () => {
    const fetchKeys = vi.fn().mockResolvedValue(new Response("<html>nope</html>", { status: 200 }));
    const provider = createGooglePublicKeyProvider({ fetch: fetchKeys, now: () => 0 });

    expect(await provider("one")).toBeNull();
  });
});
