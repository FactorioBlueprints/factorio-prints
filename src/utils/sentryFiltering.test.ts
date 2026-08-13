import { describe, expect, it } from "vite-plus/test";
import { isUnactionableError } from "./sentryFiltering";

describe("Sentry error filtering", () => {
  it("filters expected Firebase user transaction disconnect warnings", () => {
    const messages = [
      "[2026-07-27T18:07:41.068Z] @firebase/database: FIREBASE WARNING: transaction at /users/user-123 failed: disconnect",
      "@firebase/database: FIREBASE WARNING: transaction at /blueprints/blueprint-123 failed: disconnect",
      "@firebase/database: FIREBASE WARNING: transaction at /users/user-123 failed: permission_denied",
    ];

    expect(messages.map(isUnactionableError)).toStrictEqual([true, false, false]);
  });

  it("filters Vite asset preload failures", () => {
    const messages = [
      "Unable to preload CSS for https://factorioprints.com/assets/RichText-BKC2Zd9i.css",
      "Unable to preload CSS for /assets/index-CzBJOCTd.css",
      "Unable to preload the module https://factorioprints.com/assets/RichText-CYTSpsh0.js",
      "Unable to preload the user's saved blueprint",
    ];

    expect(messages.map(isUnactionableError)).toStrictEqual([true, true, true, false]);
  });
});
