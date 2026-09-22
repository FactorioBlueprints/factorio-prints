import { beforeAll, describe, expect, it } from "vitest";
import { IdTokenRejection, verifyFirebaseIdToken } from "./firebaseAuth.ts";

const projectId = "facorio-blueprints";
const issuer = `https://securetoken.google.com/${projectId}`;
const signingKeyId = "test-key";
const nowSeconds = 1_800_000_000;

const encodeBytes = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const encodeSegment = (value: unknown): string =>
  encodeBytes(new TextEncoder().encode(JSON.stringify(value)));

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

let signingPair: CryptoKeyPair;
let impostorPair: CryptoKeyPair;

beforeAll(async () => {
  [signingPair, impostorPair] = await Promise.all([generateKeyPair(), generateKeyPair()]);
});

interface TokenOverrides {
  readonly header?: Record<string, unknown>;
  readonly payload?: Record<string, unknown>;
  readonly signWith?: CryptoKey;
}

const createToken = async (overrides: TokenOverrides = {}): Promise<string> => {
  const header = { alg: "RS256", kid: signingKeyId, typ: "JWT", ...overrides.header };
  const payload = {
    aud: projectId,
    auth_time: nowSeconds - 120,
    exp: nowSeconds + 3600,
    iat: nowSeconds - 120,
    iss: issuer,
    sub: "firebase-user-id",
    ...overrides.payload,
  };
  const signingInput = `${encodeSegment(header)}.${encodeSegment(payload)}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    overrides.signWith ?? signingPair.privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${encodeBytes(new Uint8Array(signature))}`;
};

const verify = (token: string) =>
  verifyFirebaseIdToken(token, {
    projectId,
    now: () => nowSeconds,
    publicKey: async (keyId) => (keyId === signingKeyId ? signingPair.publicKey : null),
  });

describe("verifyFirebaseIdToken", () => {
  it("accepts a correctly signed token and returns its subject", async () => {
    const result = await verify(await createToken());

    expect(result).toEqual({ ok: true, identity: { userId: "firebase-user-id" } });
  });

  it.each([
    ["an empty string", ""],
    ["a single segment", "not-a-jwt"],
    ["two segments", "header.payload"],
    ["four segments", "a.b.c.d"],
    ["a non-JSON header", `${encodeBytes(new TextEncoder().encode("nope"))}.e30.sig`],
  ])("rejects %s as malformed", async (_description, token) => {
    expect(await verify(token)).toEqual({ ok: false, reason: IdTokenRejection.Malformed });
  });

  it("rejects an algorithm other than RS256", async () => {
    const token = await createToken({ header: { alg: "HS256" } });

    expect(await verify(token)).toEqual({
      ok: false,
      reason: IdTokenRejection.UnsupportedAlgorithm,
    });
  });

  it("rejects a token whose key id is unknown", async () => {
    const token = await createToken({ header: { kid: "rotated-away" } });

    expect(await verify(token)).toEqual({ ok: false, reason: IdTokenRejection.UnknownKey });
  });

  it("rejects a token signed by a different key", async () => {
    const token = await createToken({ signWith: impostorPair.privateKey });

    expect(await verify(token)).toEqual({ ok: false, reason: IdTokenRejection.InvalidSignature });
  });

  it("rejects a token issued for another audience", async () => {
    const token = await createToken({ payload: { aud: "some-other-project" } });

    expect(await verify(token)).toEqual({ ok: false, reason: IdTokenRejection.InvalidAudience });
  });

  it("rejects a token from another issuer", async () => {
    const token = await createToken({
      payload: { iss: "https://securetoken.google.com/some-other-project" },
    });

    expect(await verify(token)).toEqual({ ok: false, reason: IdTokenRejection.InvalidIssuer });
  });

  it("rejects an expired token", async () => {
    const token = await createToken({ payload: { exp: nowSeconds - 1 } });

    expect(await verify(token)).toEqual({ ok: false, reason: IdTokenRejection.Expired });
  });

  it("rejects a token issued further in the future than the clock tolerance", async () => {
    const token = await createToken({ payload: { iat: nowSeconds + 61 } });

    expect(await verify(token)).toEqual({ ok: false, reason: IdTokenRejection.NotYetValid });
  });

  it("accepts a token issued slightly in the future", async () => {
    const token = await createToken({ payload: { iat: nowSeconds + 30 } });

    expect(await verify(token)).toEqual({ ok: true, identity: { userId: "firebase-user-id" } });
  });

  it("rejects a token authenticated further in the future than the clock tolerance", async () => {
    const token = await createToken({ payload: { auth_time: nowSeconds + 61 } });

    expect(await verify(token)).toEqual({ ok: false, reason: IdTokenRejection.NotYetValid });
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["not a string", 42],
    ["longer than 128 characters", "u".repeat(129)],
  ])("rejects a token whose subject is %s", async (_description, sub) => {
    const token = await createToken({ payload: { sub } });

    expect(await verify(token)).toEqual({ ok: false, reason: IdTokenRejection.InvalidSubject });
  });
});
