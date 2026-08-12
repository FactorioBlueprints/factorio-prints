import type { Event, StackFrame } from "@sentry/react";
import { describe, expect, it } from "vite-plus/test";
import {
  groupMobileIosRecursion,
  isFirebaseAuthDatabaseClosingError,
  isUnactionableError,
} from "./sentryFiltering";

const chromeMobileIosContext = {
  browser: {
    name: "Chrome Mobile iOS",
    version: "151.0.0",
  },
};

function createMobileIosStackOverflowEvent(
  route: string,
  release: string,
  frames: StackFrame[],
): Event {
  return {
    contexts: chromeMobileIosContext,
    exception: {
      values: [
        {
          type: "RangeError",
          value: "Maximum call stack size exceeded.",
          stacktrace: { frames },
        },
      ],
    },
    release,
    request: {
      url: `https://example.com${route}`,
    },
    transaction: route,
  };
}

describe("Sentry error filtering", () => {
  it("groups the four observed Chrome Mobile iOS inline recursion variants", () => {
    const repeatedViewFrames = Array.from({ length: 4 }).flatMap(() => [
      {
        filename: "https://example.com/",
        function: "Fk",
        lineno: 224,
        colno: 63,
      },
      {
        filename: "https://example.com/",
        function: "Hk",
        lineno: 224,
        colno: 408,
      },
    ]);
    const repeatedPreviousRouteFrames = Array.from({ length: 4 }).flatMap(() => [
      {
        filename: "/view/example-blueprint",
        function: "Fk",
        lineno: 224,
        colno: 63,
      },
      {
        filename: "/view/example-blueprint",
        function: "Hk",
        lineno: 224,
        colno: 408,
      },
    ]);
    const cases = [
      {
        issueId: "FACTORIO-PRINTS-1JV",
        event: createMobileIosStackOverflowEvent(
          "/view/example-blueprint",
          "release-one",
          repeatedViewFrames,
        ),
      },
      {
        issueId: "FACTORIO-PRINTS-1JW",
        event: createMobileIosStackOverflowEvent(
          "/search",
          "release-one",
          repeatedPreviousRouteFrames,
        ),
      },
      {
        issueId: "FACTORIO-PRINTS-1JP",
        event: createMobileIosStackOverflowEvent("/blueprints", "release-one", [
          {
            filename: "/blueprints",
            lineno: 184,
            context_line: ".fa-6x {",
          },
        ]),
      },
      {
        issueId: "FACTORIO-PRINTS-1KC",
        event: createMobileIosStackOverflowEvent("/view/example-print", "release-two", [
          {
            filename: "/view/example-print",
            lineno: 187,
          },
        ]),
      },
    ];

    expect(
      cases.map(({ event, issueId }) => ({
        context: groupMobileIosRecursion(event) ? event.contexts?.mobile_ios_recursion : undefined,
        fingerprint: event.fingerprint,
        issueId,
        tags: event.tags,
      })),
    ).toStrictEqual([
      {
        context: {
          browser: "Chrome Mobile iOS 151.0.0",
          candidate_sources: [
            "first-party-rendering",
            "generated-inline-bootstrap",
            "advertising-script",
            "injected-script",
          ],
          first_party_asset_frame_count: 0,
          frame_count: 8,
          frame_samples: [
            "Fk@https://example.com/:224:63 × 4",
            "Hk@https://example.com/:224:408 × 4",
          ],
          inline_document_frame_count: 8,
          release: "release-one",
          repeated_frame_pattern: true,
          route: "/view/example-blueprint",
        },
        fingerprint: ["mobile-ios-inline-document-recursion"],
        issueId: "FACTORIO-PRINTS-1JV",
        tags: { mobile_ios_recursion: "inline-document" },
      },
      {
        context: {
          browser: "Chrome Mobile iOS 151.0.0",
          candidate_sources: [
            "first-party-rendering",
            "generated-inline-bootstrap",
            "advertising-script",
            "injected-script",
          ],
          first_party_asset_frame_count: 0,
          frame_count: 8,
          frame_samples: [
            "Fk@/view/example-blueprint:224:63 × 4",
            "Hk@/view/example-blueprint:224:408 × 4",
          ],
          inline_document_frame_count: 8,
          release: "release-one",
          repeated_frame_pattern: true,
          route: "/search",
        },
        fingerprint: ["mobile-ios-inline-document-recursion"],
        issueId: "FACTORIO-PRINTS-1JW",
        tags: { mobile_ios_recursion: "inline-document" },
      },
      {
        context: {
          browser: "Chrome Mobile iOS 151.0.0",
          candidate_sources: [
            "first-party-rendering",
            "generated-inline-bootstrap",
            "advertising-script",
            "injected-script",
          ],
          first_party_asset_frame_count: 0,
          frame_count: 1,
          frame_samples: ["<anonymous>@/blueprints:184:0 × 1"],
          inline_document_frame_count: 1,
          release: "release-one",
          repeated_frame_pattern: false,
          route: "/blueprints",
        },
        fingerprint: ["mobile-ios-inline-document-recursion"],
        issueId: "FACTORIO-PRINTS-1JP",
        tags: { mobile_ios_recursion: "inline-document" },
      },
      {
        context: {
          browser: "Chrome Mobile iOS 151.0.0",
          candidate_sources: [
            "first-party-rendering",
            "generated-inline-bootstrap",
            "advertising-script",
            "injected-script",
          ],
          first_party_asset_frame_count: 0,
          frame_count: 1,
          frame_samples: ["<anonymous>@/view/example-print:187:0 × 1"],
          inline_document_frame_count: 1,
          release: "release-two",
          repeated_frame_pattern: false,
          route: "/view/example-print",
        },
        fingerprint: ["mobile-ios-inline-document-recursion"],
        issueId: "FACTORIO-PRINTS-1KC",
        tags: { mobile_ios_recursion: "inline-document" },
      },
    ]);
  });

  it("preserves unrelated range errors and external script failures", () => {
    const firstPartyRangeError = createMobileIosStackOverflowEvent("/search", "release-one", [
      {
        filename: "https://example.com/assets/application.js",
        function: "renderResults",
        lineno: 100,
        colno: 20,
      },
    ]);
    const otherRangeError = createMobileIosStackOverflowEvent("/search", "release-one", [
      {
        filename: "/search",
        function: "renderResults",
        lineno: 100,
        colno: 20,
      },
    ]);
    otherRangeError.exception!.values![0].value = "Invalid array length";
    const safariStackOverflow = createMobileIosStackOverflowEvent("/search", "release-one", [
      {
        filename: "/search",
        lineno: 100,
        colno: 20,
      },
    ]);
    safariStackOverflow.contexts = { browser: { name: "Mobile Safari", version: "26.0" } };
    const advertisingScriptStackOverflow = createMobileIosStackOverflowEvent(
      "/search",
      "release-one",
      [
        {
          filename: "https://ads.example.net/advertisement.js",
          function: "renderAdvertisement",
          lineno: 100,
          colno: 20,
        },
      ],
    );
    const cases = [
      firstPartyRangeError,
      otherRangeError,
      safariStackOverflow,
      advertisingScriptStackOverflow,
    ];
    const expectedEvents = structuredClone(cases);

    expect(
      cases.map((event) => ({
        event,
        grouped: groupMobileIosRecursion(event),
      })),
    ).toStrictEqual(
      expectedEvents.map((event) => ({
        event,
        grouped: false,
      })),
    );
  });

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

  it("filters only the Firebase pending popup promise assertion variants", () => {
    const messages = [
      "INTERNAL ASSERTION FAILED: Pending promise was never set",
      "[2000-01-01T00:00:00.000Z]  @firebase/auth: Auth (12.17.0): INTERNAL ASSERTION FAILED: Pending promise was never set",
      "Pending promise was never set",
      "Application assertion failed: Pending promise was never set",
      "[2000-01-01T00:00:00.000Z]  @firebase/database: INTERNAL ASSERTION FAILED: Pending promise was never set",
      "[2000-01-01T00:00:00.000Z]  @firebase/auth: Auth (12.17.0): INTERNAL ASSERTION FAILED: Another invariant",
    ];

    expect(messages.map(isUnactionableError)).toStrictEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it("filters only the Firebase Auth hidden-page database closure", () => {
    const reasons = [
      new Error("Database is closing/hidden"),
      "Database is closing/hidden",
      new Error("Database is closing"),
      new Error("IndexedDB database is closing/hidden"),
      new Error("Database is closing/hidden after transaction failure"),
      new Error("IndexedDB transaction failed"),
    ];

    expect(reasons.map(isFirebaseAuthDatabaseClosingError)).toStrictEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(
      reasons.map((reason) =>
        isUnactionableError(reason instanceof Error ? reason.message : reason),
      ),
    ).toStrictEqual([true, true, false, false, false, false]);
  });
});
