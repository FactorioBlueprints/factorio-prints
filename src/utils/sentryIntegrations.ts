import type { BrowserOptions } from "@sentry/react";
import {
  breadcrumbsIntegration,
  browserTracingIntegration,
  captureConsoleIntegration,
  contextLinesIntegration,
} from "@sentry/react";

type SentryIntegration = Extract<NonNullable<BrowserOptions["integrations"]>, unknown[]>[number];

// Console breadcrumbs come from the default Console integration in Sentry v11.
export function sentryIntegrations(): SentryIntegration[] {
  return [
    browserTracingIntegration(),
    captureConsoleIntegration({
      levels: ["error", "warn"],
    }),
    // Sentry v11 lowered the default from 7 to 5 lines.
    contextLinesIntegration({ frameContextLines: 7 }),
    breadcrumbsIntegration({
      dom: true,
      fetch: true,
      history: true,
      sentry: true,
      xhr: true,
    }),
  ];
}
