/*
  The blueprint API keys stored blueprint strings by the sha-1 of the string
  itself, so a client holding the string can address the API without a round
  trip to look the sha up.
*/
export async function sha1Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
