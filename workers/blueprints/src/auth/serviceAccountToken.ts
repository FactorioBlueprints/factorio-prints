import {IdTokenRejection, isFutureBeyondTolerance, verifyRs256Jwt} from "../../../images/src/firebaseAuth.ts";

/** Google's OAuth signing keys, which sign the ID tokens a service account mints for an audience. */
export const GOOGLE_OAUTH_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";

const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const CLOCK_TOLERANCE_SECONDS = 60;

export interface ServiceAccountTokenOptions
{
	/** The Worker URL the token was minted for. */
	readonly audience: string;
	/** Service accounts allowed to call. Any Google account can mint a token for any audience, so this is required. */
	readonly allowedEmails: readonly string[];
	/** Epoch seconds. */
	readonly now: () => number;
	readonly publicKey: (keyId: string) => Promise<CryptoKey | null>;
}

export type ServiceAccountVerification =
	|
	  {
			readonly ok: true;
			readonly email: string;
	  }
	|
	  {
			readonly ok: false;
			readonly reason: IdTokenRejection;
	  };

const reject = (reason: IdTokenRejection): ServiceAccountVerification => (
{
	ok: false,
	reason,
});

/** Verifies a Google-signed service-account ID token, such as a Cloud Function mints with `format=full`. */
export const verifyServiceAccountToken = async (
	token: string,
	options: ServiceAccountTokenOptions,
): Promise<ServiceAccountVerification> =>
{
	const verified = await verifyRs256Jwt(token, options.publicKey);
	if (!verified.ok) return verified;
	const {payload} = verified;

	if (payload.aud !== options.audience) return reject(IdTokenRejection.InvalidAudience);
	if (typeof payload.iss !== "string" || !GOOGLE_ISSUERS.has(payload.iss))
	{
		return reject(IdTokenRejection.InvalidIssuer);
	}

	const now = options.now();
	if (typeof payload.exp !== "number" || payload.exp <= now) return reject(IdTokenRejection.Expired);
	if (isFutureBeyondTolerance(payload.iat, now, CLOCK_TOLERANCE_SECONDS)) return reject(IdTokenRejection.NotYetValid);

	if (
		payload.email_verified !== true ||
		typeof payload.email !== "string" ||
		!options.allowedEmails.includes(payload.email)
	)
	{
		return reject(IdTokenRejection.InvalidSubject);
	}

	return {
		ok: true,
		email: payload.email,
	};
};
