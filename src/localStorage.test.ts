import { createStore, set } from "idb-keyval";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { compressForStorage } from "./utils/dataCompression";

const workerState = vi.hoisted(() => ({
  messages: [] as Array<{ type: string; id?: number; key?: string; data?: unknown }>,
  response: "success" as
    | "success"
    | "error"
    | "initialization-error"
    | "null-initialization-error"
    | "connection-closing",
  throwDuringConstruction: false,
  constructionCount: 0,
  restoreMessageCount: 0,
}));

vi.mock("@sentry/react", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
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
      }
    }

    terminate(): void {}
  },
}));

describe("IndexedDB worker orchestration", () => {
  beforeEach(() => {
    workerState.messages.length = 0;
    workerState.response = "success";
    workerState.throwDuringConstruction = false;
    workerState.constructionCount = 0;
    workerState.restoreMessageCount = 0;
    vi.resetModules();
  });

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
