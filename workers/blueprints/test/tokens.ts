// Signs RS256 JWTs with throwaway keys, standing in for Google's service-account and Firebase ID tokens.

const TEST_KEY_ID = "test-key";

const encodeBytes = (bytes: Uint8Array): string =>
{
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const encodeSegment = (value: unknown): string => encodeBytes(new TextEncoder().encode(JSON.stringify(value)));

export const generateSigningKeys = (): Promise<CryptoKeyPair> =>
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

export const signToken = async (
	payload: Record<string, unknown>,
	privateKey: CryptoKey,
	header: Record<string, unknown> = {},
): Promise<string> =>
{
	const signingInput = `${encodeSegment(
		{
			alg: "RS256",
			kid: TEST_KEY_ID,
			typ: "JWT",
			...header,
		},
	)}.${encodeSegment(payload)}`;
	const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(signingInput));
	return `${signingInput}.${encodeBytes(new Uint8Array(signature))}`;
};

/** A key lookup that knows only the test key. */
export const publicKeyLookup = (keys: CryptoKeyPair) => async (keyId: string) =>
	keyId === TEST_KEY_ID ? keys.publicKey : null;
