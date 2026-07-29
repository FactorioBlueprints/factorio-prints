import { createStore, get, set } from "idb-keyval";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { compressForStorage, decompressFromStorage } from "./utils/dataCompression";

interface WorkerResponse {
  id?: number;
  result?: {
    success: boolean;
    data?: unknown;
  };
  success: boolean;
}

class TestWorkerScope {
  onmessage?: (event: MessageEvent) => Promise<void>;
  readonly responses: WorkerResponse[] = [];

  addEventListener(): void {}

  postMessage(response: WorkerResponse): void {
    this.responses.push(response);
  }

  async dispatch(data: unknown): Promise<WorkerResponse> {
    if (!this.onmessage) {
      throw new Error("Worker message handler is not installed");
    }

    await this.onmessage({ data } as MessageEvent);
    const response = this.responses.at(-1);
    if (!response) {
      throw new Error("Worker did not post a response");
    }
    return response;
  }
}

const storeName = "query-cache-test-store";
const cacheKey = "FACTORIO_PRINTS_QUERY_CACHE_TEST";

function createPersistedClient(marker = "alice") {
  return {
    timestamp: 946_684_800_000,
    buster: "test-buster",
    clientState: {
      mutations: [],
      queries: [
        {
          queryHash: '["blueprint","alice"]',
          queryKey: ["blueprint", marker],
          state: {
            data: Array.from({ length: 500 }, (_, index) => ({
              id: index,
              name: `${marker}-blueprint-${index}`,
              description: `Test blueprint ${index} for ${marker}. `.repeat(4),
            })),
            status: "success",
          },
        },
      ],
    },
  };
}

async function loadWorker(databaseName: string): Promise<TestWorkerScope> {
  const workerScope = new TestWorkerScope();
  vi.stubGlobal("self", workerScope);
  vi.resetModules();
  await import("./localStorage.worker");
  await workerScope.dispatch({
    type: "init",
    storeConfig: { dbName: databaseName, storeName },
  });
  return workerScope;
}

describe("localStorage worker persistence protocol", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("compresses, stores, and restores a persisted client entirely through worker messages", async () => {
    const databaseName = "factorio-prints-worker-round-trip-test-db";
    const workerScope = await loadWorker(databaseName);
    const persistedClient = createPersistedClient();

    const persistResponse = await workerScope.dispatch({
      type: "persist",
      id: 100,
      key: cacheKey,
      data: persistedClient,
    });
    const storedData = await get(cacheKey, createStore(databaseName, storeName));
    const expectedStoredData = compressForStorage(persistedClient);
    const restoreResponse = await workerScope.dispatch({
      type: "restore",
      id: 200,
      key: cacheKey,
    });

    expect(persistResponse).toStrictEqual({
      id: 100,
      result: {
        success: true,
        data: {
          status: "persisted",
          compressed: true,
          originalSize: JSON.stringify(persistedClient).length,
          storedSize: (storedData as { data: string }).data.length,
        },
      },
      success: true,
    });
    expect(storedData).toStrictEqual(expectedStoredData);
    expect(decompressFromStorage(storedData)).toStrictEqual(persistedClient);
    expect(restoreResponse).toStrictEqual({
      id: 200,
      result: {
        success: true,
        data: {
          client: persistedClient,
          compressed: true,
          originalSize: JSON.stringify(persistedClient).length,
          storedSize: (storedData as { data: string }).data.length,
        },
      },
      success: true,
    });
  });

  it("restores records written by the existing compression format", async () => {
    const databaseName = "factorio-prints-worker-existing-compressed-test-db";
    const persistedClient = createPersistedClient("bob");
    const existingStoredData = compressForStorage(persistedClient);
    await set(cacheKey, existingStoredData, createStore(databaseName, storeName));
    const workerScope = await loadWorker(databaseName);

    const response = await workerScope.dispatch({
      type: "restore",
      id: 300,
      key: cacheKey,
    });

    expect(response).toStrictEqual({
      id: 300,
      result: {
        success: true,
        data: {
          client: persistedClient,
          compressed: true,
          originalSize: JSON.stringify(persistedClient).length,
          storedSize: existingStoredData.data.length,
        },
      },
      success: true,
    });
  });

  it("restores existing uncompressed storage envelopes", async () => {
    const databaseName = "factorio-prints-worker-existing-uncompressed-test-db";
    const persistedClient = {
      timestamp: 946_684_800_000,
      buster: "test-buster",
      clientState: { mutations: [], queries: [] },
    };
    const existingStoredData = {
      compressed: false,
      data: JSON.stringify(persistedClient),
    };
    await set(cacheKey, existingStoredData, createStore(databaseName, storeName));
    const workerScope = await loadWorker(databaseName);

    const response = await workerScope.dispatch({
      type: "restore",
      id: 350,
      key: cacheKey,
    });

    expect(response).toStrictEqual({
      id: 350,
      result: {
        success: true,
        data: {
          client: persistedClient,
          compressed: false,
          originalSize: existingStoredData.data.length,
          storedSize: existingStoredData.data.length,
        },
      },
      success: true,
    });
  });

  it("skips an unchanged write after restoring the existing record", async () => {
    const databaseName = "factorio-prints-worker-unchanged-test-db";
    const persistedClient = createPersistedClient("charlie");
    const existingStoredData = compressForStorage(persistedClient);
    await set(cacheKey, existingStoredData, createStore(databaseName, storeName));
    const workerScope = await loadWorker(databaseName);
    await workerScope.dispatch({ type: "restore", id: 400, key: cacheKey });

    const response = await workerScope.dispatch({
      type: "persist",
      id: 500,
      key: cacheKey,
      data: persistedClient,
    });
    const storedData = await get(cacheKey, createStore(databaseName, storeName));

    expect(response).toStrictEqual({
      id: 500,
      result: {
        success: true,
        data: {
          status: "unchanged",
        },
      },
      success: true,
    });
    expect(storedData).toStrictEqual(existingStoredData);
  });
});
