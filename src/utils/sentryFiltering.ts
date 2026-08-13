export function isUnactionableError(message: string): boolean {
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
