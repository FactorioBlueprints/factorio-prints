import { describe, expect, it } from "vite-plus/test";
import mainSource from "./main.tsx?raw";

describe("Sentry startup configuration", () => {
  it("keeps the startup and before-send safeguards narrowly configured", () => {
    expect({
      attachesRouterDiagnostics:
        mainSource.includes('eventMessage.includes("_nonReactive")') &&
        mainSource.includes("router: getRouterDiagnostics()"),
      filtersAllFetchTypeErrors: mainSource.includes(
        'error instanceof TypeError && error.message === "Failed to fetch"',
      ),
      importsSentryNamespace: mainSource.includes("import * as Sentry"),
      includesFeedbackIntegration: mainSource.includes("feedbackIntegration"),
      includesReplayIntegration: mainSource.includes("replayIntegration"),
      normalizesThirdPartyNoiseBeforeSending: mainSource.includes(
        "if (normalizeAndFilterThirdPartyNoise(event))",
      ),
      tracesSampleRate: mainSource.includes("tracesSampleRate: 0.1"),
    }).toStrictEqual({
      attachesRouterDiagnostics: true,
      filtersAllFetchTypeErrors: false,
      importsSentryNamespace: false,
      includesFeedbackIntegration: false,
      includesReplayIntegration: false,
      normalizesThirdPartyNoiseBeforeSending: true,
      tracesSampleRate: true,
    });
  });

  it("groups diagnosed mobile iOS inline recursion before sending", () => {
    expect(mainSource).toContain("groupMobileIosRecursion(event)");
  });
});
