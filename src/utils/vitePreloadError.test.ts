import { describe, expect, it, vi } from "vite-plus/test";
import {
  createVitePreloadErrorHandler,
  vitePreloadReloadCooldownMs,
  vitePreloadReloadStorageKey,
} from "./vitePreloadError";

function createPreloadErrorEvent(): VitePreloadErrorEvent {
  return Object.assign(new Event("vite:preloadError", { cancelable: true }), {
    payload: new TypeError("Failed to fetch dynamically imported module"),
  });
}

function createMemoryStorage(initial: Record<string, string> = {}): {
  entries: Map<string, string>;
  storage: Pick<Storage, "getItem" | "setItem">;
} {
  const entries = new Map(Object.entries(initial));
  return {
    entries,
    storage: {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => {
        entries.set(key, value);
      },
    },
  };
}

describe("Vite preload error recovery", () => {
  it("reloads once without suppressing the rejected dynamic import", () => {
    const reloadPage = vi.fn();
    const { entries, storage } = createMemoryStorage();
    const event = createPreloadErrorEvent();

    createVitePreloadErrorHandler(reloadPage, { getStorage: () => storage, now: () => 1_000 })(
      event,
    );

    expect({
      defaultPrevented: event.defaultPrevented,
      reloadCalls: reloadPage.mock.calls,
      storedEntries: Object.fromEntries(entries),
    }).toStrictEqual({
      defaultPrevented: false,
      reloadCalls: [[]],
      storedEntries: { [vitePreloadReloadStorageKey]: "1000" },
    });
  });

  it("does not reload again within the cooldown after an automatic reload", () => {
    const reloadPage = vi.fn();
    const { entries, storage } = createMemoryStorage({ [vitePreloadReloadStorageKey]: "1000" });
    const event = createPreloadErrorEvent();

    createVitePreloadErrorHandler(reloadPage, {
      getStorage: () => storage,
      now: () => 1_000 + vitePreloadReloadCooldownMs - 1,
    })(event);

    expect({
      defaultPrevented: event.defaultPrevented,
      reloadCalls: reloadPage.mock.calls,
      storedEntries: Object.fromEntries(entries),
    }).toStrictEqual({
      defaultPrevented: false,
      reloadCalls: [],
      storedEntries: { [vitePreloadReloadStorageKey]: "1000" },
    });
  });

  it("reloads again once the cooldown has elapsed", () => {
    const reloadPage = vi.fn();
    const { entries, storage } = createMemoryStorage({ [vitePreloadReloadStorageKey]: "1000" });
    const reloadAt = 1_000 + vitePreloadReloadCooldownMs;

    createVitePreloadErrorHandler(reloadPage, { getStorage: () => storage, now: () => reloadAt })(
      createPreloadErrorEvent(),
    );

    expect({
      reloadCalls: reloadPage.mock.calls,
      storedEntries: Object.fromEntries(entries),
    }).toStrictEqual({
      reloadCalls: [[]],
      storedEntries: { [vitePreloadReloadStorageKey]: String(reloadAt) },
    });
  });

  it("does not reload when session storage is unavailable", () => {
    const reloadPage = vi.fn();
    const event = createPreloadErrorEvent();

    createVitePreloadErrorHandler(reloadPage, {
      getStorage: () => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
      now: () => 1_000,
    })(event);

    expect({
      defaultPrevented: event.defaultPrevented,
      reloadCalls: reloadPage.mock.calls,
    }).toStrictEqual({
      defaultPrevented: false,
      reloadCalls: [],
    });
  });

  it("does not reload when recording the reload fails", () => {
    const reloadPage = vi.fn();

    createVitePreloadErrorHandler(reloadPage, {
      getStorage: () => ({
        getItem: () => null,
        setItem: () => {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        },
      }),
      now: () => 1_000,
    })(createPreloadErrorEvent());

    expect(reloadPage.mock.calls).toStrictEqual([]);
  });
});
