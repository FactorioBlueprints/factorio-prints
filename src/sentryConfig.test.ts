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
      groupsMobileIosRecursion: mainSource.includes("groupMobileIosRecursion(event)"),
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
      groupsMobileIosRecursion: true,
      importsSentryNamespace: false,
      includesFeedbackIntegration: false,
      includesReplayIntegration: false,
      normalizesThirdPartyNoiseBeforeSending: true,
      tracesSampleRate: true,
    });
  });
});
