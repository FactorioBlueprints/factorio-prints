import { createStore, set } from "idb-keyval";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { compressForStorage } from "./utils/dataCompression";

const workerState = vi.hoisted(() => ({
  messages: [] as Array<{ type: string; id?: number; key?: string; data?: unknown }>,
  response: "success" as
    | "success"
    | "error"
    | "initialization-error"
    | "null-initialization-error"
    | "connection-closing"
    | "data-clone-error"
    | "out-of-memory"
    | "payload-too-large",
  throwDuringConstruction: false,
  constructionCount: 0,
  restoreMessageCount: 0,
}));

const sentryState = vi.hoisted(() => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@sentry/react", () => ({
  addBreadcrumb: sentryState.addBreadcrumb,
  captureException: sentryState.captureException,
}));

vi.mock("./localStorage.worker.wrapper", () => ({
  default: class TestLocalStorageWorker {
    onerror: ((event: ErrorEvent) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;

    constructor() {
      workerState.constructionCount++;
      if (workerState.throwDuringConstruction) {
        throw new Error("Test worker construction failure");
      }
    }

    postMessage(message: { type: string; id?: number; key?: string; data?: unknown }): void {
      workerState.messages.push(message);

      if (message.type === "persist" && workerState.response === "data-clone-error") {
        throw new DOMException("Test worker payload could not be cloned", "DataCloneError");
      }

      if (message.type === "persist" && workerState.response === "out-of-memory") {
        throw new Error(
          "Failed to execute 'postMessage' on 'Worker': Test data cannot be cloned, out of memory",
        );
      }

      if (message.type === "persist" && workerState.response === "payload-too-large") {
        this.onmessage?.({
          data: {
            id: message.id,
            success: true,
            result: {
              success: false,
              data: {
                status: "payload-rejected",
                reason: "payload-too-large",
                serializedCharacters: 9_000_000,
                maximumCharacters: 8_388_608,
              },
            },
          },
        } as MessageEvent);
        return;
      }

      if (message.type === "init") {
        if (workerState.response === "null-initialization-error") {
          this.onerror?.(undefined as unknown as ErrorEvent);
          return;
        }
        if (workerState.response === "initialization-error") {
          this.onerror?.(
            new ErrorEvent("error", {
              error: new Error("Test worker initialization failure"),
              message: "Test worker initialization failure",
            }),
          );
          return;
        }
        this.onmessage?.({ data: { success: true, result: { success: true } } } as MessageEvent);
        return;
      }

      if (message.type === "get" || message.type === "restore") {
        workerState.restoreMessageCount++;
        if (workerState.response === "connection-closing") {
          if (workerState.restoreMessageCount === 1) {
            return;
          }
          this.onmessage?.({
            data: {
              id: message.id,
              success: false,
              error: {
                message: "Test worker database connection is closing",
                isConnectionClosing: true,
              },
            },
          } as MessageEvent);
          return;
        }

        if (workerState.response === "error") {
          this.onmessage?.({
            data: {
              id: message.id,
              success: false,
              error: { message: "Test worker storage failure" },
            },
          } as MessageEvent);
          return;
        }

        this.onmessage?.({
          data: {
            id: message.id,
            success: true,
            result: {
              success: true,
              data:
                message.type === "restore"
                  ? {
                      client: { buster: "test-buster", timestamp: 946_684_800_000 },
                      compressed: false,
                      originalSize: 55,
                      storedSize: 55,
                    }
                  : { buster: "test-buster", timestamp: 946_684_800_000 },
            },
          },
        } as MessageEvent);
        return;
      }

      this.onmessage?.({
        data: {
          id: message.id,
          success: true,
          result: { success: true },
        },
      } as MessageEvent);
    }

    terminate(): void {}
  },
}));

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");

function createTestStorage(): Storage {
  const values = new Map<string, string>();

  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => values.set(key, value),
  };
}

describe("safe local-storage capability", () => {
  beforeEach(() => {
    sentryState.addBreadcrumb.mockReset();
    sentryState.captureException.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(window, "localStorage", originalLocalStorageDescriptor);
    }
    vi.restoreAllMocks();
  });

  it.each([
    [
      "a throwing getter",
      () => {
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          get: () => {
            throw new DOMException("Test storage access denied", "SecurityError");
          },
        });
      },
    ],
    [
      "a null object",
      () => {
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          value: null,
        });
      },
    ],
    [
      "a nonconforming object",
      () => {
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          value: { getItem: () => null },
        });
      },
    ],
    [
      "denied operations",
      () => {
        const storage = createTestStorage();
        const securityError = new DOMException("Test storage operation denied", "SecurityError");
        storage.getItem = () => {
          throw securityError;
        };
        storage.removeItem = () => {
          throw securityError;
        };
        storage.setItem = () => {
          throw securityError;
        };
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          value: storage,
        });
      },
    ],
  ])("returns defaults without diagnostics for %s", async (_description, configureStorage) => {
    configureStorage();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { getSafeLocalStorage, loadFromStorage, removeFromStorage, saveToStorage } =
      await import("./localStorage");

    const result = {
      storage: getSafeLocalStorage(),
      saved: saveToStorage("test-storage-key", { value: "test-value" }),
      loaded: loadFromStorage("test-storage-key", { value: "default-value" }),
      removed: removeFromStorage("test-storage-key"),
      captureExceptionCalls: sentryState.captureException.mock.calls,
      consoleErrorCalls: consoleError.mock.calls,
    };

    expect(result).toStrictEqual({
      storage: undefined,
      saved: false,
      loaded: { value: "default-value" },
      removed: undefined,
      captureExceptionCalls: [],
      consoleErrorCalls: [],
    });
  });
});

describe("IndexedDB worker orchestration", () => {
  beforeEach(() => {
    workerState.messages.length = 0;
    workerState.response = "success";
    workerState.throwDuringConstruction = false;
    workerState.constructionCount = 0;
    workerState.restoreMessageCount = 0;
    sentryState.addBreadcrumb.mockReset();
    sentryState.captureException.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("persists a payload through the worker without serializing it on the main thread", async () => {
    vi.useFakeTimers();
    const stringifySpy = vi.spyOn(JSON, "stringify");
    const { createIDBPersister } = await import("./localStorage");
    const cacheKey = "FACTORIO_PRINTS_QUERY_CACHE_MAIN_THREAD_TEST";
    const client = { data: "Test cache payload" };
    const persister = createIDBPersister(cacheKey);

    await persister.persistClient(client);
    await vi.advanceTimersByTimeAsync(2_000);
    const mainThreadSerializations = stringifySpy.mock.calls.filter(([value]) => value === client);
    stringifySpy.mockRestore();

    expect({
      mainThreadSerializations,
      messages: workerState.messages.map(({ data, ...message }) => ({
        ...message,
        data: data === client ? "client" : data,
      })),
      breadcrumbs: sentryState.addBreadcrumb.mock.calls,
      capturedExceptions: sentryState.captureException.mock.calls,
    }).toStrictEqual({
      mainThreadSerializations: [],
      messages: [
        {
          type: "init",
          storeConfig: {
            dbName: "factorio-prints-db",
            storeName: "query-cache-store",
          },
          data: undefined,
        },
        {
          type: "persist",
          id: 0,
          key: cacheKey,
          data: "client",
        },
      ],
      breadcrumbs: [],
      capturedExceptions: [],
    });
  });

  it("reports and deletes a worker-rejected payload once until a later persist succeeds", async () => {
    vi.useFakeTimers();
    workerState.response = "payload-too-large";
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { createIDBPersister } = await import("./localStorage");
    const cacheKey = "FACTORIO_PRINTS_QUERY_CACHE_OVERSIZED_PAYLOAD_TEST";
    const secondCacheKey = "FACTORIO_PRINTS_QUERY_CACHE_SECOND_OVERSIZED_PAYLOAD_TEST";
    const clientLabels = new Map<unknown, string>([
      [{ data: "Test first oversized payload" }, "first-oversized"],
      [{ data: "Test second oversized payload" }, "second-oversized"],
      [{ data: "Test other key oversized payload" }, "other-key-oversized"],
      [{ data: "Test bounded payload" }, "bounded"],
      [{ data: "Test third oversized payload" }, "third-oversized"],
    ]);
    const [firstOversized, secondOversized, otherKeyOversized, bounded, thirdOversized] = [
      ...clientLabels.keys(),
    ];
    const persister = createIDBPersister(cacheKey);
    const secondPersister = createIDBPersister(secondCacheKey);

    await persister.persistClient(firstOversized);
    await vi.advanceTimersByTimeAsync(2_000);
    await persister.persistClient(secondOversized);
    await vi.advanceTimersByTimeAsync(2_000);
    await secondPersister.persistClient(otherKeyOversized);
    await vi.advanceTimersByTimeAsync(2_000);
    workerState.response = "success";
    await persister.persistClient(bounded);
    await vi.advanceTimersByTimeAsync(2_000);
    workerState.response = "payload-too-large";
    await persister.persistClient(thirdOversized);
    await vi.advanceTimersByTimeAsync(2_000);

    const discardBreadcrumb = (key: string) => [
      {
        message: "IndexedDB worker persistence payload discarded",
        category: "indexeddb",
        level: "info",
        data: {
          key,
          reason: "payload-too-large",
          serializedCharacters: 9_000_000,
          maximumCharacters: 8_388_608,
        },
      },
    ];

    expect({
      messages: workerState.messages.map(({ data, ...message }) => ({
        ...message,
        data: clientLabels.get(data) ?? data,
      })),
      clearTimeoutCalls: clearTimeoutSpy.mock.calls.length,
      remainingTimers: vi.getTimerCount(),
      breadcrumbs: sentryState.addBreadcrumb.mock.calls,
      capturedExceptions: sentryState.captureException.mock.calls,
    }).toStrictEqual({
      messages: [
        {
          type: "init",
          storeConfig: {
            dbName: "factorio-prints-db",
            storeName: "query-cache-store",
          },
          data: undefined,
        },
        { type: "persist", id: 0, key: cacheKey, data: "first-oversized" },
        { type: "delete", id: 1, key: cacheKey, data: null },
        { type: "persist", id: 2, key: cacheKey, data: "second-oversized" },
        { type: "persist", id: 3, key: secondCacheKey, data: "other-key-oversized" },
        { type: "delete", id: 4, key: secondCacheKey, data: null },
        { type: "persist", id: 5, key: cacheKey, data: "bounded" },
        { type: "persist", id: 6, key: cacheKey, data: "third-oversized" },
        { type: "delete", id: 7, key: cacheKey, data: null },
      ],
      clearTimeoutCalls: 9,
      remainingTimers: 0,
      breadcrumbs: [
        discardBreadcrumb(cacheKey),
        discardBreadcrumb(secondCacheKey),
        discardBreadcrumb(cacheKey),
      ],
      capturedExceptions: [],
    });

    clearTimeoutSpy.mockRestore();
  });

  it.each(["data-clone-error", "out-of-memory"] as const)(
    "reports and deletes once across repeated synchronous %s postMessage failures",
    async (workerFailure) => {
      vi.useFakeTimers();
      workerState.response = workerFailure;
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const { createIDBPersister } = await import("./localStorage");
      const cacheKey = "FACTORIO_PRINTS_QUERY_CACHE_POST_MESSAGE_FAILURE_TEST";
      const clientLabels = new Map<unknown, string>([
        [{ data: "Test first rejected payload" }, "first-rejected"],
        [{ data: "Test second rejected payload" }, "second-rejected"],
        [{ data: "Test later payload" }, "later"],
      ]);
      const [firstRejected, secondRejected, later] = [...clientLabels.keys()];
      const persister = createIDBPersister(cacheKey);

      await persister.persistClient(firstRejected);
      await vi.advanceTimersByTimeAsync(2_000);
      await persister.persistClient(secondRejected);
      await vi.advanceTimersByTimeAsync(2_000);
      workerState.response = "success";
      await persister.persistClient(later);
      await vi.advanceTimersByTimeAsync(2_000);

      expect({
        messages: workerState.messages.map(({ data, ...message }) => ({
          ...message,
          data: clientLabels.get(data) ?? data,
        })),
        clearTimeoutCalls: clearTimeoutSpy.mock.calls.length,
        remainingTimers: vi.getTimerCount(),
        breadcrumbs: sentryState.addBreadcrumb.mock.calls,
        capturedExceptions: sentryState.captureException.mock.calls,
      }).toStrictEqual({
        messages: [
          {
            type: "init",
            storeConfig: {
              dbName: "factorio-prints-db",
              storeName: "query-cache-store",
            },
            data: undefined,
          },
          { type: "persist", id: 0, key: cacheKey, data: "first-rejected" },
          { type: "delete", id: 1, key: cacheKey, data: null },
          { type: "persist", id: 2, key: cacheKey, data: "second-rejected" },
          { type: "persist", id: 3, key: cacheKey, data: "later" },
        ],
        clearTimeoutCalls: 5,
        remainingTimers: 0,
        breadcrumbs: [
          [
            {
              message: "IndexedDB worker persistence payload discarded",
              category: "indexeddb",
              level: "info",
              data: {
                key: cacheKey,
                reason: "post-message-failed",
                serializedCharacters: undefined,
                maximumCharacters: 8_388_608,
              },
            },
          ],
        ],
        capturedExceptions: [],
      });

      clearTimeoutSpy.mockRestore();
    },
  );

  it("clears initialization and operation timers as soon as restoration succeeds", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { createIDBPersister } = await import("./localStorage");

    const restoredClient = await createIDBPersister(
      "FACTORIO_PRINTS_QUERY_CACHE_TEST",
    ).restoreClient();

    expect(restoredClient).toStrictEqual({
      buster: "test-buster",
      timestamp: 946_684_800_000,
    });
    expect(workerState.messages).toStrictEqual([
      {
        type: "init",
        storeConfig: {
          dbName: "factorio-prints-db",
          storeName: "query-cache-store",
        },
      },
      {
        type: "restore",
        id: 0,
        key: "FACTORIO_PRINTS_QUERY_CACHE_TEST",
        data: null,
      },
    ]);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

    clearTimeoutSpy.mockRestore();
  });

  it("clears initialization and operation timers when restoration returns an error", async () => {
    workerState.response = "error";
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { createIDBPersister } = await import("./localStorage");

    const restoredClient = await createIDBPersister(
      "FACTORIO_PRINTS_QUERY_CACHE_ERROR_TEST",
    ).restoreClient();

    expect(restoredClient).toBeUndefined();
    expect(workerState.messages).toStrictEqual([
      {
        type: "init",
        storeConfig: {
          dbName: "factorio-prints-db",
          storeName: "query-cache-store",
        },
      },
      {
        type: "restore",
        id: 0,
        key: "FACTORIO_PRINTS_QUERY_CACHE_ERROR_TEST",
        data: null,
      },
    ]);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

    clearTimeoutSpy.mockRestore();
  });

  it("clears the initialization timer when worker initialization fails", async () => {
    workerState.response = "initialization-error";
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { createIDBPersister } = await import("./localStorage");

    const persister = createIDBPersister("FACTORIO_PRINTS_QUERY_CACHE_INITIALIZATION_ERROR_TEST");
    const restoredClients = await Promise.all([
      persister.restoreClient(),
      persister.restoreClient(),
    ]);

    expect(restoredClients).toStrictEqual([undefined, undefined]);
    expect(workerState.messages).toStrictEqual([
      {
        type: "init",
        storeConfig: {
          dbName: "factorio-prints-db",
          storeName: "query-cache-store",
        },
      },
    ]);
    expect(workerState.constructionCount).toBe(1);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

    clearTimeoutSpy.mockRestore();
  });

  it("falls back promptly when worker initialization reports no error event", async () => {
    workerState.response = "null-initialization-error";
    const { createIDBPersister } = await import("./localStorage");

    const restoration = createIDBPersister(
      "FACTORIO_PRINTS_QUERY_CACHE_NULL_INITIALIZATION_ERROR_TEST",
    ).restoreClient();
    const outcome = await Promise.race([
      restoration.then((value) => ({ status: "restored", value })),
      new Promise<{ status: "stalled" }>((resolve) => {
        setTimeout(() => resolve({ status: "stalled" }), 100);
      }),
    ]);

    expect(outcome).toStrictEqual({ status: "restored", value: undefined });
    expect(workerState.messages).toStrictEqual([
      {
        type: "init",
        storeConfig: {
          dbName: "factorio-prints-db",
          storeName: "query-cache-store",
        },
      },
    ]);
  });

  it("settles concurrent operations and clears their timers when one closes the connection", async () => {
    workerState.response = "connection-closing";
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { createIDBPersister } = await import("./localStorage");
    const persister = createIDBPersister("FACTORIO_PRINTS_QUERY_CACHE_CONCURRENT_TEST");

    const restoredClients = await Promise.all([
      persister.restoreClient(),
      persister.restoreClient(),
    ]);

    expect(restoredClients).toStrictEqual([undefined, undefined]);
    expect(workerState.messages).toStrictEqual([
      {
        type: "init",
        storeConfig: {
          dbName: "factorio-prints-db",
          storeName: "query-cache-store",
        },
      },
      {
        type: "restore",
        id: 0,
        key: "FACTORIO_PRINTS_QUERY_CACHE_CONCURRENT_TEST",
        data: null,
      },
      {
        type: "restore",
        id: 1,
        key: "FACTORIO_PRINTS_QUERY_CACHE_CONCURRENT_TEST",
        data: null,
      },
    ]);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(3);

    clearTimeoutSpy.mockRestore();
  });

  it("restores the compressed cache through IndexedDB when worker construction fails", async () => {
    workerState.throwDuringConstruction = true;
    const cacheKey = "FACTORIO_PRINTS_QUERY_CACHE_FALLBACK_TEST";
    const persistedClient = {
      buster: "test-buster",
      timestamp: 946_684_800_000,
      clientState: {
        mutations: [],
        queries: [
          {
            queryHash: '["blueprint","fallback"]',
            queryKey: ["blueprint", "fallback"],
            state: {
              data: "Fallback test data. ".repeat(1_000),
              status: "success",
            },
          },
        ],
      },
    };
    await set(
      cacheKey,
      compressForStorage(persistedClient),
      createStore("factorio-prints-db", "query-cache-store"),
    );
    const { createIDBPersister } = await import("./localStorage");
    const persister = createIDBPersister(cacheKey);

    const restoredClients = await Promise.all([
      persister.restoreClient(),
      persister.restoreClient(),
    ]);

    expect(restoredClients).toStrictEqual([persistedClient, persistedClient]);
    expect(workerState.messages).toStrictEqual([]);
    expect(workerState.constructionCount).toBe(1);
  });
});
