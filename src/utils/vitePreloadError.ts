export const vitePreloadReloadStorageKey = "factorio-prints:vite-preload-reload-at";
export const vitePreloadReloadCooldownMs = 10 * 60 * 1000;

type ReloadStorage = Pick<Storage, "getItem" | "setItem">;

interface VitePreloadErrorHandlerOptions {
  getStorage?: () => ReloadStorage;
  now?: () => number;
}

/**
 * Reloads the page to pick up fresh chunk references after a deployment, at most once per cooldown
 * window per tab. When a reload is skipped (recent reload, or storage unavailable so a loop cannot
 * be ruled out), the rejected import is left alone so the error still reaches Sentry.
 */
export function createVitePreloadErrorHandler(
  reloadPage: () => void,
  { getStorage = () => window.sessionStorage, now = Date.now }: VitePreloadErrorHandlerOptions = {},
): (event: VitePreloadErrorEvent) => void {
  return () => {
    const currentTime = now();
    try {
      const storage = getStorage();
      const lastReloadAt = Number(storage.getItem(vitePreloadReloadStorageKey));
      if (lastReloadAt && currentTime - lastReloadAt < vitePreloadReloadCooldownMs) {
        return;
      }
      storage.setItem(vitePreloadReloadStorageKey, String(currentTime));
    } catch {
      return;
    }
    reloadPage();
  };
}
