// Two kinds of id share a blueprint's image.id field. Imgur assigns 5-7 letters and digits; when
// Imgur is unavailable the upload Worker assigns a 20-character id of its own, which exists only
// in R2. Length alone tells them apart. The gateway, the scripts, and the site all use this rule.

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const fallbackIdThreshold = 16;

export const fallbackIdLength = 20;

export const isFallbackImageId = (id: string): boolean => id.length >= fallbackIdThreshold;

export const newFallbackImageId = (): string => {
  // 248 is the largest multiple of 62 below 256; rejecting bytes above it keeps every letter equally likely.
  const letters: string[] = [];
  while (letters.length < fallbackIdLength) {
    for (const byte of crypto.getRandomValues(new Uint8Array(fallbackIdLength))) {
      if (byte < 248 && letters.length < fallbackIdLength) letters.push(alphabet.charAt(byte % 62));
    }
  }
  return letters.join("");
};
