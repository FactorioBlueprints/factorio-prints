const signingAlgorithm = "RS256";
const verificationAlgorithm = "RSASSA-PKCS1-v1_5";
const defaultClockToleranceSeconds = 60;
const maximumSubjectLength = 128;

export enum IdTokenRejection {
  Expired = "expired",
  InvalidAudience = "invalid-audience",
  InvalidIssuer = "invalid-issuer",
  InvalidSignature = "invalid-signature",
  InvalidSubject = "invalid-subject",
  Malformed = "malformed",
  NotYetValid = "not-yet-valid",
  UnknownKey = "unknown-key",
  UnsupportedAlgorithm = "unsupported-algorithm",
}

export interface VerifiedIdentity {
  readonly userId: string;
}

export type IdTokenVerification =
  | { readonly ok: true; readonly identity: VerifiedIdentity }
  | { readonly ok: false; readonly reason: IdTokenRejection };

export interface VerifyIdTokenOptions {
  readonly clockToleranceSeconds?: number;
  readonly now: () => number;
  readonly projectId: string;
  readonly publicKey: (keyId: string) => Promise<CryptoKey | null>;
}

const reject = (reason: IdTokenRejection): IdTokenVerification => ({ ok: false, reason });

const decodeSegment = (segment: string): Uint8Array | null => {
  try {
    const binary = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
};

const decodeJsonSegment = (segment: string): Record<string, unknown> | null => {
  const bytes = decodeSegment(segment);
  if (!bytes) return null;

  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isFutureBeyondTolerance = (
  claim: unknown,
  now: number,
  clockToleranceSeconds: number,
): boolean => typeof claim === "number" && claim > now + clockToleranceSeconds;

export const verifyFirebaseIdToken = async (
  token: string,
  options: VerifyIdTokenOptions,
): Promise<IdTokenVerification> => {
  const segments = token.split(".");
  if (segments.length !== 3) return reject(IdTokenRejection.Malformed);

  const [encodedHeader, encodedPayload, encodedSignature] = segments as [string, string, string];
  const header = decodeJsonSegment(encodedHeader);
  const payload = decodeJsonSegment(encodedPayload);
  const signature = decodeSegment(encodedSignature);
  if (!header || !payload || !signature) return reject(IdTokenRejection.Malformed);

  if (header.alg !== signingAlgorithm) return reject(IdTokenRejection.UnsupportedAlgorithm);
  if (typeof header.kid !== "string" || header.kid === "") {
    return reject(IdTokenRejection.UnknownKey);
  }

  const publicKey = await options.publicKey(header.kid);
  if (!publicKey) return reject(IdTokenRejection.UnknownKey);

  const signedInput = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signatureIsValid = await crypto.subtle.verify(
    verificationAlgorithm,
    publicKey,
    signature,
    signedInput,
  );
  if (!signatureIsValid) return reject(IdTokenRejection.InvalidSignature);

  if (payload.aud !== options.projectId) return reject(IdTokenRejection.InvalidAudience);
  if (payload.iss !== `https://securetoken.google.com/${options.projectId}`) {
    return reject(IdTokenRejection.InvalidIssuer);
  }

  const now = options.now();
  if (typeof payload.exp !== "number" || payload.exp <= now)
    return reject(IdTokenRejection.Expired);

  const clockToleranceSeconds = options.clockToleranceSeconds ?? defaultClockToleranceSeconds;
  if (
    isFutureBeyondTolerance(payload.iat, now, clockToleranceSeconds) ||
    isFutureBeyondTolerance(payload.auth_time, now, clockToleranceSeconds)
  ) {
    return reject(IdTokenRejection.NotYetValid);
  }

  if (
    typeof payload.sub !== "string" ||
    payload.sub === "" ||
    payload.sub.length > maximumSubjectLength
  ) {
    return reject(IdTokenRejection.InvalidSubject);
  }

  return { ok: true, identity: { userId: payload.sub } };
};
