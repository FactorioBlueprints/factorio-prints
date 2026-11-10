// Blueprint strings live in R2, keyed by the SHA-256 of their UTF-8 bytes. D1 keeps only the digest: the
// blueprint_string content column goes away when Klass's objectStorage keyword lands, and until then it holds "".
// Every string read and write goes through these helpers, so the storage layout is decided in one place.

const objectKey = (sha: string) => `strings/${sha}`;

/** Stores a string under its digest. Content-addressed, so rewriting it is harmless. */
export const putBlueprintString = async (bucket: R2Bucket, sha: string, content: string): Promise<void> =>
{
	await bucket.put(
		objectKey(sha),
		content,
		{
			httpMetadata:
			{
				contentType: "text/plain; charset=utf-8",
			},
		},
	);
};

export const getBlueprintString = async (bucket: R2Bucket, sha: string): Promise<string | null> =>
{
	const object = await bucket.get(objectKey(sha));
	return object === null ? null : object.text();
};

export {STRING_STORED_IN_R2} from "./stringLayout.ts";
