import type { Event, StackFrame } from "@sentry/react";
import { describe, expect, it } from "vite-plus/test";
import {
  groupMobileIosRecursion,
  isFirebaseAuthDatabaseClosingError,
  isUnactionableError,
  normalizeAndFilterThirdPartyNoise,
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

  it("normalizes paired injected events and filters independently proven external noise", () => {
    const cases: { event: Event; issueId: string }[] = [
      {
        issueId: "FACTORIO-PRINTS-1K2",
        event: {
          contexts: chromeMobileIosContext,
          exception: {
            values: [
              {
                type: "Error",
                value: "Ba",
                mechanism: { handled: false, type: "onunhandledrejection" },
              },
            ],
          },
          message: "Ba",
          request: { url: "https://example.com/view/example-blueprint" },
        },
      },
      {
        issueId: "FACTORIO-PRINTS-1K3",
        event: {
          exception: {
            values: [
              {
                type: "Error",
                value: "ga",
                mechanism: { handled: false, type: "onerror" },
                stacktrace: {
                  frames: [
                    {
                      filename: "https://example.com/view/example-blueprint",
                      function: "<anonymous>",
                      lineno: 400,
                      colno: 40,
                      pre_context: [
                        '<ins class="adsbygoogle adsbygoogle-noablate" data-adsbygoogle-status="done">',
                      ],
                      context_line: "</html>",
                    },
                  ],
                },
              },
            ],
          },
          request: { url: "https://example.com/view/example-blueprint" },
        },
      },
      {
        issueId: "FACTORIO-PRINTS-1JX",
        event: {
          exception: {
            values: [
              {
                type: "TypeError",
                value: "Failed to fetch",
                mechanism: { handled: false, type: "onunhandledrejection" },
                stacktrace: {
                  frames: [
                    {
                      filename: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
                      function: "fetchAdvertisement",
                    },
                    {
                      filename: "https://browser.sentry-cdn.example/instrument/fetch.js",
                      function: "<anonymous>",
                    },
                  ],
                },
              },
            ],
          },
          request: { url: "https://example.com/user/alice" },
        },
      },
      {
        issueId: "FACTORIO-PRINTS-1K5",
        event: {
          exception: {
            values: [
              {
                value: "addEventListener ignored event='mouseout'",
                stacktrace: {
                  frames: [
                    {
                      filename: "<anonymous>",
                      function: "window.addEventListener",
                      lineno: 400,
                      colno: 20,
                    },
                  ],
                },
              },
            ],
          },
          extra: { arguments: ["addEventListener ignored event='mouseout'"] },
          level: "warning",
          logger: "console",
          message: "addEventListener ignored event='mouseout'",
        },
      },
      {
        issueId: "FACTORIO-PRINTS-1KB",
        event: {
          exception: {
            values: [{ value: "Crypto site not identified within timeout period" }],
          },
          extra: { arguments: ["Crypto site not identified within timeout period"] },
          level: "error",
          logger: "console",
          message: "Crypto site not identified within timeout period",
        },
      },
      {
        issueId: "FACTORIO-PRINTS-1KA",
        event: {
          exception: {
            values: [
              {
                type: "TypeError",
                value: "Cannot read properties of undefined (reading 'location')",
                mechanism: { handled: false, type: "onerror" },
                stacktrace: {
                  frames: [
                    {
                      filename: "https://example.com/view/example-blueprint",
                      function: "HTMLInputElement.onchange",
                      lineno: 100,
                      colno: 3,
                    },
                    {
                      filename: "https://example.com/view/example-blueprint",
                      lineno: 60,
                      colno: 10,
                    },
                  ],
                },
              },
            ],
          },
          request: { url: "https://example.com/view/example-blueprint" },
        },
      },
      {
        issueId: "FACTORIO-PRINTS-1JR",
        event: {
          exception: {
            values: [
              {
                type: "UnhandledRejection",
                value:
                  "Non-Error promise rejection captured with value: Object Not Found Matching Id:2, MethodName:update, ParamCount:4",
                mechanism: { handled: false, type: "onunhandledrejection" },
              },
            ],
          },
          message: "Object Not Found Matching Id:2, MethodName:update, ParamCount:4",
        },
      },
    ];

    expect(
      cases.map(({ event, issueId }) => ({
        filtered: normalizeAndFilterThirdPartyNoise(event),
        fingerprint: event.fingerprint ?? null,
        issueId,
        tags: event.tags ?? null,
      })),
    ).toStrictEqual([
      {
        filtered: false,
        fingerprint: ["third-party-google-ads-inline-runtime"],
        issueId: "FACTORIO-PRINTS-1K2",
        tags: { external_runtime_noise: "third-party-google-ads-inline-runtime" },
      },
      {
        filtered: false,
        fingerprint: ["third-party-google-ads-inline-runtime"],
        issueId: "FACTORIO-PRINTS-1K3",
        tags: { external_runtime_noise: "third-party-google-ads-inline-runtime" },
      },
      {
        filtered: true,
        fingerprint: null,
        issueId: "FACTORIO-PRINTS-1JX",
        tags: null,
      },
      {
        filtered: true,
        fingerprint: null,
        issueId: "FACTORIO-PRINTS-1K5",
        tags: null,
      },
      {
        filtered: false,
        fingerprint: ["injected-crypto-runtime"],
        issueId: "FACTORIO-PRINTS-1KB",
        tags: { external_runtime_noise: "injected-crypto-runtime" },
      },
      {
        filtered: false,
        fingerprint: ["injected-crypto-runtime"],
        issueId: "FACTORIO-PRINTS-1KA",
        tags: { external_runtime_noise: "injected-crypto-runtime" },
      },
      {
        filtered: true,
        fingerprint: null,
        issueId: "FACTORIO-PRINTS-1JR",
        tags: null,
      },
    ]);
  });

  it("preserves similar first-party failures without external evidence", () => {
    const events: Event[] = [
      {
        exception: {
          values: [
            {
              type: "TypeError",
              value: "Failed to fetch",
              stacktrace: {
                frames: [
                  {
                    filename: "https://example.com/assets/application.js",
                    function: "loadBlueprint",
                    in_app: true,
                  },
                ],
              },
            },
          ],
        },
        request: { url: "https://example.com/view/example-blueprint" },
      },
      {
        exception: {
          values: [
            {
              type: "TypeError",
              value: "Cannot read properties of undefined (reading 'location')",
              stacktrace: {
                frames: [
                  {
                    filename: "https://example.com/assets/application.js",
                    function: "updateLocation",
                    in_app: true,
                  },
                ],
              },
            },
          ],
        },
        request: { url: "https://example.com/view/example-blueprint" },
      },
      {
        exception: {
          values: [
            {
              type: "Error",
              value: "Ba",
              mechanism: { handled: false, type: "onunhandledrejection" },
              stacktrace: {
                frames: [
                  {
                    filename: "https://example.com/assets/application.js",
                    function: "processBlueprint",
                    in_app: true,
                  },
                ],
              },
            },
          ],
        },
        contexts: chromeMobileIosContext,
        message: "Ba",
        request: { url: "https://example.com/view/example-blueprint" },
      },
      {
        exception: {
          values: [
            {
              type: "UnhandledRejection",
              value:
                "Non-Error promise rejection captured with value: Object Not Found Matching Id:2, MethodName:update, ParamCount:4",
              mechanism: { handled: false, type: "onunhandledrejection" },
              stacktrace: {
                frames: [
                  {
                    filename: "https://example.com/assets/application.js",
                    function: "update",
                    in_app: true,
                  },
                ],
              },
            },
          ],
        },
        message: "Object Not Found Matching Id:2, MethodName:update, ParamCount:4",
      },
      {
        exception: {
          values: [
            {
              value: "addEventListener ignored event='mouseout'",
              stacktrace: {
                frames: [
                  {
                    filename: "https://example.com/assets/application.js",
                    function: "registerEvents",
                    in_app: true,
                  },
                ],
              },
            },
          ],
        },
        extra: { arguments: ["addEventListener ignored event='mouseout'"] },
        level: "warning",
        logger: "console",
        message: "addEventListener ignored event='mouseout'",
      },
      {
        exception: {
          values: [{ value: "Crypto site not identified within timeout period" }],
        },
        extra: {
          arguments: ["Crypto site not identified within timeout period", "application"],
        },
        level: "error",
        logger: "console",
        message: "Crypto site not identified within timeout period",
      },
      {
        exception: {
          values: [
            {
              type: "Error",
              value: "ga",
              stacktrace: {
                frames: [
                  {
                    filename: "https://example.com/view/example-blueprint",
                    context_line: "</html>",
                  },
                ],
              },
            },
          ],
        },
        request: { url: "https://example.com/view/example-blueprint" },
      },
    ];
    const expectedEvents = structuredClone(events);

    expect(
      events.map((event) => ({
        event,
        filtered: normalizeAndFilterThirdPartyNoise(event),
      })),
    ).toStrictEqual(
      expectedEvents.map((event) => ({
        event,
        filtered: false,
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
