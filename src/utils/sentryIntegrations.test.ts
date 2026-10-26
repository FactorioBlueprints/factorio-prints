import type { Breadcrumb, Event } from "@sentry/react";
import { getClient, init } from "@sentry/react";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { sentryIntegrations } from "./sentryIntegrations";

function findIntegration(name: string) {
  const integration = sentryIntegrations().find((candidate) => candidate.name === name);
  if (!integration) {
    throw new Error(`Missing integration ${name}`);
  }
  return integration;
}

describe("sentryIntegrations", () => {
  afterEach(async () => {
    await getClient()?.close();
  });

  it("configures the explicit integrations in order", () => {
    expect(sentryIntegrations().map((integration) => integration.name)).toStrictEqual([
      "BrowserTracing",
      "CaptureConsole",
      "ContextLines",
      "Breadcrumbs",
    ]);
  });

  it("attaches seven lines of inline-script context around each frame", () => {
    document.body.innerHTML = Array.from({ length: 30 }, (_, index) => `line ${index}`).join("\n");
    const contextLines = findIntegration("ContextLines");
    const event: Event = {
      exception: {
        values: [{ stacktrace: { frames: [{ filename: window.location.href, lineno: 13 }] } }],
      },
    };

    const processed = contextLines.processEvent?.(event, {}, undefined as never) as Event;
    const frame = processed.exception?.values?.[0]?.stacktrace?.frames?.[0];

    expect({
      pre: frame?.pre_context,
      context: frame?.context_line,
      post: frame?.post_context,
    }).toStrictEqual({
      pre: ["line 3", "line 4", "line 5", "line 6", "line 7", "line 8", "line 9"],
      context: "line 10",
      post: ["line 11", "line 12", "line 13", "line 14", "line 15", "line 16", "line 17"],
    });
  });

  it("records console calls as breadcrumbs", () => {
    const breadcrumbs: Breadcrumb[] = [];
    init({
      dsn: "https://public@example.ingest.sentry.io/1",
      integrations: sentryIntegrations(),
      beforeBreadcrumb: (breadcrumb) => {
        breadcrumbs.push(breadcrumb);
        return null;
      },
    });

    console.info("sentry integration console breadcrumb");

    expect(
      breadcrumbs
        .filter((breadcrumb) => breadcrumb.category === "console")
        .map(({ category, level, message }) => ({ category, level, message })),
    ).toStrictEqual([
      { category: "console", level: "info", message: "sentry integration console breadcrumb" },
    ]);
  });
});
