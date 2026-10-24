import type { Event, StackFrame } from "@sentry/react";

const firebaseAuthDatabaseClosingMessage = "Database is closing/hidden";
const googleAdsPairFingerprint = "third-party-google-ads-inline-runtime";
const injectedCryptoPairFingerprint = "injected-crypto-runtime";
const mobileIosRecursionMessage = /^Maximum call stack size exceeded\.?$/;
const mobileIosRecursionFingerprint = "mobile-ios-inline-document-recursion";
const maximumFrameSamples = 6;
const minimumRepeatedFrameCount = 4;
const minimumRepeatedStackLength = 8;

function getExceptionFrames(event: Event): StackFrame[] {
  return (event.exception?.values ?? []).flatMap((exception) => exception.stacktrace?.frames ?? []);
}

function getEventMessage(event: Event): string {
  if (typeof event.message === "string") {
    return event.message;
  }

  const exceptionValue = event.exception?.values?.[0]?.value;
  if (typeof exceptionValue === "string") {
    return exceptionValue;
  }

  const argumentsValue = event.extra?.arguments;
  if (Array.isArray(argumentsValue)) {
    return argumentsValue.map(String).join(" ");
  }

  return "";
}

function getFrameIdentity(frame: StackFrame): string {
  const functionName = frame.function ?? "<anonymous>";
  const filename = frame.filename ?? "<unknown>";
  const line = frame.lineno ?? 0;
  const column = frame.colno ?? 0;
  return `${functionName}@${filename}:${line}:${column}`;
}

function getRequestUrl(event: Event): URL | undefined {
  if (!event.request?.url || !URL.canParse(event.request.url)) {
    return undefined;
  }

  return new URL(event.request.url);
}

function isInlineDocumentFrame(frame: StackFrame, requestUrl: URL): boolean {
  if (!frame.filename || !URL.canParse(frame.filename, requestUrl)) {
    return false;
  }

  const frameUrl = new URL(frame.filename, requestUrl);
  const lastPathSegment = frameUrl.pathname.split("/").at(-1) ?? "";
  return frameUrl.origin === requestUrl.origin && !lastPathSegment.includes(".");
}

function isJavaScriptAssetFrame(frame: StackFrame, requestUrl: URL): boolean {
  if (!frame.filename || !URL.canParse(frame.filename, requestUrl)) {
    return false;
  }

  const frameUrl = new URL(frame.filename, requestUrl);
  return frameUrl.origin === requestUrl.origin && /\.(?:js|mjs)$/.test(frameUrl.pathname);
}

function getFrameSamples(frames: StackFrame[]): string[] {
  const frameCounts = new Map<string, number>();

  for (const frame of frames) {
    const identity = getFrameIdentity(frame);
    frameCounts.set(identity, (frameCounts.get(identity) ?? 0) + 1);
  }

  return [...frameCounts.entries()]
    .sort(([firstIdentity, firstCount], [secondIdentity, secondCount]) => {
      return secondCount - firstCount || firstIdentity.localeCompare(secondIdentity);
    })
    .slice(0, maximumFrameSamples)
    .map(([identity, count]) => `${identity} × ${count}`);
}

function hasRepeatedFramePattern(frames: StackFrame[]): boolean {
  if (frames.length < minimumRepeatedStackLength) {
    return false;
  }

  const frameCounts = new Map<string, number>();
  for (const frame of frames) {
    const identity = getFrameIdentity(frame);
    frameCounts.set(identity, (frameCounts.get(identity) ?? 0) + 1);
  }

  return [...frameCounts.values()].some((count) => count >= minimumRepeatedFrameCount);
}

function getEventRoute(event: Event, requestUrl: URL): string {
  return event.transaction ?? requestUrl.pathname;
}

function getFrameSource(frame: StackFrame): string {
  return [frame.context_line, ...(frame.pre_context ?? []), ...(frame.post_context ?? [])]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
}

function isGoogleAdsFrame(frame: StackFrame): boolean {
  const filename = frame.filename ?? "";
  return (
    /(?:^|\.)googlesyndication\.com(?:\/|$)/.test(filename) ||
    filename.includes("/pagead/js/adsbygoogle.js")
  );
}

function isFirstPartyAssetFrame(frame: StackFrame, requestUrl: URL | undefined): boolean {
  if (frame.in_app === true) {
    return true;
  }
  if (!requestUrl || !frame.filename || !URL.canParse(frame.filename, requestUrl)) {
    return false;
  }

  const frameUrl = new URL(frame.filename, requestUrl);
  return (
    frameUrl.origin === requestUrl.origin && /\.(?:js|jsx|mjs|ts|tsx)$/.test(frameUrl.pathname)
  );
}

function setNoiseFingerprint(event: Event, fingerprint: string): void {
  event.fingerprint = [fingerprint];
  event.tags = {
    ...event.tags,
    external_runtime_noise: fingerprint,
  };
}

function isGoogleAdsFetchFailure(event: Event, message: string): boolean {
  if (message !== "Failed to fetch" && message !== "TypeError: Failed to fetch") {
    return false;
  }

  const frames = getExceptionFrames(event);
  return (
    frames.some(isGoogleAdsFrame) &&
    !frames.some((frame) => isFirstPartyAssetFrame(frame, getRequestUrl(event)))
  );
}

function isGoogleAdsInlinePair(event: Event, message: string): boolean {
  const frames = getExceptionFrames(event);
  if (message === "Ba") {
    return (
      frames.length === 0 &&
      event.contexts?.browser?.name === "Chrome Mobile iOS" &&
      event.exception?.values?.[0]?.mechanism?.type === "onunhandledrejection"
    );
  }

  return message === "ga" && frames.some((frame) => getFrameSource(frame).includes("adsbygoogle"));
}

function isCryptoInjectionPair(event: Event, message: string): boolean {
  if (message === "Crypto site not identified within timeout period") {
    return (
      event.logger === "console" &&
      Array.isArray(event.extra?.arguments) &&
      event.extra.arguments.length === 1 &&
      event.extra.arguments[0] === message
    );
  }

  if (message !== "Cannot read properties of undefined (reading 'location')") {
    return false;
  }

  const requestUrl = getRequestUrl(event);
  const frames = getExceptionFrames(event);
  return (
    requestUrl !== undefined &&
    frames.length > 0 &&
    frames.every((frame) => isInlineDocumentFrame(frame, requestUrl)) &&
    frames.some((frame) => frame.function === "HTMLInputElement.onchange")
  );
}

function isMonkeypatchedBrowserApiWarning(event: Event, message: string): boolean {
  return (
    /^addEventListener ignored event='[a-z]+'$/.test(message) &&
    event.logger === "console" &&
    event.level === "warning" &&
    Array.isArray(event.extra?.arguments) &&
    event.extra.arguments.length === 1 &&
    event.extra.arguments[0] === message &&
    getExceptionFrames(event).some(
      (frame) => frame.function === "window.addEventListener" && frame.filename === "<anonymous>",
    )
  );
}

function isStacklessNativeBridgeRejection(event: Event, message: string): boolean {
  return (
    /^Object Not Found Matching Id:\d+, MethodName:[A-Za-z][A-Za-z0-9_]*, ParamCount:\d+$/.test(
      message,
    ) &&
    event.exception?.values?.[0]?.mechanism?.type === "onunhandledrejection" &&
    getExceptionFrames(event).length === 0
  );
}

export function normalizeAndFilterThirdPartyNoise(event: Event): boolean {
  const message = getEventMessage(event);

  if (isGoogleAdsInlinePair(event, message)) {
    setNoiseFingerprint(event, googleAdsPairFingerprint);
    return false;
  }

  if (isCryptoInjectionPair(event, message)) {
    setNoiseFingerprint(event, injectedCryptoPairFingerprint);
    return false;
  }

  return (
    isGoogleAdsFetchFailure(event, message) ||
    isMonkeypatchedBrowserApiWarning(event, message) ||
    isStacklessNativeBridgeRejection(event, message)
  );
}

export function groupMobileIosRecursion(event: Event): boolean {
  const browser = event.contexts?.browser;
  if (browser?.name !== "Chrome Mobile iOS") {
    return false;
  }

  const hasStackOverflow = (event.exception?.values ?? []).some(
    (exception) =>
      exception.type === "RangeError" && mobileIosRecursionMessage.test(exception.value ?? ""),
  );
  if (!hasStackOverflow) {
    return false;
  }

  const requestUrl = getRequestUrl(event);
  if (!requestUrl) {
    return false;
  }

  const frames = getExceptionFrames(event);
  const inlineDocumentFrames = frames.filter((frame) => isInlineDocumentFrame(frame, requestUrl));
  const inlineDocumentFrameCount = inlineDocumentFrames.length;
  const firstPartyAssetFrameCount = frames.filter((frame) =>
    isJavaScriptAssetFrame(frame, requestUrl),
  ).length;
  const repeatedFramePattern = hasRepeatedFramePattern(inlineDocumentFrames);
  const inlineDocumentSignature = inlineDocumentFrameCount > 0 && firstPartyAssetFrameCount === 0;

  if (!repeatedFramePattern && !inlineDocumentSignature) {
    return false;
  }

  event.fingerprint = [mobileIosRecursionFingerprint];
  event.tags = {
    ...event.tags,
    mobile_ios_recursion: "inline-document",
  };
  event.contexts = {
    ...event.contexts,
    mobile_ios_recursion: {
      browser: `${String(browser.name)} ${typeof browser.version === "string" ? browser.version : "unknown"}`,
      candidate_sources: [
        "first-party-rendering",
        "generated-inline-bootstrap",
        "advertising-script",
        "injected-script",
      ],
      first_party_asset_frame_count: firstPartyAssetFrameCount,
      frame_count: frames.length,
      frame_samples: getFrameSamples(frames),
      inline_document_frame_count: inlineDocumentFrameCount,
      release: event.release ?? "unknown",
      repeated_frame_pattern: repeatedFramePattern,
      route: getEventRoute(event, requestUrl),
    },
  };

  return true;
}

export function isFirebaseAuthDatabaseClosingError(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : reason;
  return message === firebaseAuthDatabaseClosingMessage;
}

export function isUnactionableError(message: string): boolean {
  if (isFirebaseAuthDatabaseClosingError(message)) {
    return true;
  }

  const firebasePendingPopupPromiseAssertion =
    "INTERNAL ASSERTION FAILED: Pending promise was never set";
  const isFirebasePendingPopupPromiseAssertion =
    message === firebasePendingPopupPromiseAssertion ||
    (/^\[\d{4}-\d{2}-\d{2}T[^\]]+\]\s+@firebase\/auth: Auth \([^)]+\): /.test(message) &&
      message.endsWith(firebasePendingPopupPromiseAssertion));

  if (isFirebasePendingPopupPromiseAssertion) {
    return true;
  }

  const isExpectedFirebaseDisconnectWarning =
    message.includes("@firebase/database:") &&
    message.includes("FIREBASE WARNING: transaction at /users/") &&
    message.includes("failed: disconnect");

  if (isExpectedFirebaseDisconnectWarning) {
    return true;
  }

  const unactionablePatterns = [
    // Promise rejections with undefined/null values (third-party code)
    "Non-Error promise rejection captured with value: undefined",
    "Non-Error promise rejection captured with value: null",

    // DOM manipulation errors (browser extensions interfering with React)
    "Failed to execute 'insertBefore'",
    "Failed to execute 'removeChild'",
    "Failed to execute 'appendChild'",
    "NotFoundError",
    "The node to be removed is not a child",
    "The node before which the new node is to be inserted",
    "not a child of this node",

    // Cross-origin and security errors
    "Cannot get CSS styles from text's parentNode",
    "CSSStyleSheet.cssRules getter",
    "SecurityError",
    "cross-origin",
    "Blocked a frame with origin",

    // Mobile browser bridge errors
    "Java bridge",
    "Java object",
    "Method not found",

    // Third-party iframe/postMessage errors (e.g., Disqus RPC failures)
    "Error invoking",

    // IndexedDB and Firebase persistence errors
    "[IndexedDB] Persistence operation did not succeed",
    "@firebase/app: Firebase: Error thrown when",
    "IDBDatabase",
    "database connection is closing",
    "app/idb-",
    "Connection to Indexed Database server lost",
    "Internal error opening backing store",
    "IndexedDB connection closing",

    // Network errors (transient)
    "auth/network-request-failed",

    // Chunk loading errors (stale cache after deployment)
    "Loading chunk",
    "ChunkLoadError",
    "Failed to fetch dynamically imported module",
    "dynamically imported module",
    "Importing a module script failed",

    // Vite asset preload failures - the preload hint fails but the normal
    // <link>/<script> fetch still succeeds, so the page renders fine
    "Unable to preload CSS for",
    "Unable to preload the module",

    // Firebase Realtime Database internal transport error
    "scriptTagHolder is null",
  ];

  return unactionablePatterns.some((pattern) => message.includes(pattern));
}
