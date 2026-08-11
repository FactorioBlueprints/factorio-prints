import { render, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { getBlueprintTagsOptions } from "../hooks/useBlueprintTags";
import { blueprintQuery } from "../queries/blueprintQueries";
import type { EnrichedBlueprintSummary } from "../schemas";
import QueryProvider from "./QueryProvider";
import { queryClient, QUERY_CACHE_RETENTION_MILLISECONDS } from "./queryClient";

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  createIDBPersister: vi.fn(),
  createSyncStoragePersister: vi.fn(),
}));

vi.mock("@sentry/react", () => ({
  captureException: mocks.captureException,
  captureMessage: mocks.captureMessage,
}));

vi.mock("@tanstack/query-sync-storage-persister", () => ({
  createSyncStoragePersister: mocks.createSyncStoragePersister,
}));

vi.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => null,
}));

vi.mock("../hooks/useBlueprintCacheSync", () => ({
  default: vi.fn(),
}));

vi.mock("../hooks/useHighWatermarkSync", () => ({
  useHighWatermarkSync: vi.fn(),
}));

vi.mock("../localStorage", async (importOriginal) => {
  const localStorage = await importOriginal<typeof import("../localStorage")>();

  return {
    ...localStorage,
    CACHE_BUSTER: "test-cache-buster",
    STORAGE_KEYS: {
      QUERY_CACHE: "test-query-cache",
    },
    createIDBPersister: mocks.createIDBPersister,
  };
});

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function createPersister(
  restoreClient: Persister["restoreClient"] = vi.fn().mockResolvedValue(undefined),
): Persister {
  return {
    persistClient: vi.fn().mockResolvedValue(undefined),
    restoreClient: vi.fn(restoreClient),
    removeClient: vi.fn().mockResolvedValue(undefined),
  };
}

function createDeniedStorage(): Storage {
  const securityError = new DOMException("Test storage operation denied", "SecurityError");
  return {
    clear: () => undefined,
    getItem: () => {
      throw securityError;
    },
    key: () => null,
    length: 0,
    removeItem: () => {
      throw securityError;
    },
    setItem: () => {
      throw securityError;
    },
  };
}

function QueryConsumer({ queryFunction }: { queryFunction: () => Promise<string> }) {
  const query = useQuery({
    queryKey: ["query-provider-test"],
    queryFn: queryFunction,
  });

  return <div>{query.data ?? "waiting"}</div>;
}

function renderProvider(children: React.ReactNode) {
  return render(<QueryProvider>{children}</QueryProvider>);
}

describe("QueryProvider", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => [...values.keys()][index] ?? null,
        get length() {
          return values.size;
        },
        removeItem: (key: string) => {
          values.delete(key);
        },
        setItem: (key: string, value: string) => values.set(key, value),
      } satisfies Storage,
    });
    queryClient.clear();
    mocks.captureException.mockReset();
    mocks.captureMessage.mockReset();
    mocks.createIDBPersister.mockReset();
    mocks.createSyncStoragePersister.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("uses a finite retention below the browser timer limit", () => {
    expect(QUERY_CACHE_RETENTION_MILLISECONDS).toBe(24 * 24 * 60 * 60 * 1000);
    expect(QUERY_CACHE_RETENTION_MILLISECONDS).toBeLessThanOrEqual(2_147_483_647);

    const contentAddressedBlueprint = blueprintQuery(
      "blueprint-id",
      {} as EnrichedBlueprintSummary,
    );
    const blueprintTags = getBlueprintTagsOptions("blueprint-id");
    expect({
      defaultGarbageCollectionTime: queryClient.getDefaultOptions().queries?.gcTime,
      contentAddressedBlueprintGarbageCollectionTime: contentAddressedBlueprint.gcTime,
      contentAddressedBlueprintStaleTime: contentAddressedBlueprint.staleTime,
      blueprintTagsGarbageCollectionTime: blueprintTags.gcTime,
      blueprintTagsStaleTime: blueprintTags.staleTime,
    }).toStrictEqual({
      defaultGarbageCollectionTime: QUERY_CACHE_RETENTION_MILLISECONDS,
      contentAddressedBlueprintGarbageCollectionTime: QUERY_CACHE_RETENTION_MILLISECONDS,
      contentAddressedBlueprintStaleTime: QUERY_CACHE_RETENTION_MILLISECONDS,
      blueprintTagsGarbageCollectionTime: QUERY_CACHE_RETENTION_MILLISECONDS,
      blueprintTagsStaleTime: QUERY_CACHE_RETENTION_MILLISECONDS,
    });
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
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          value: createDeniedStorage(),
        });
      },
    ],
  ])("uses quiet no-op persistence for %s", (_description, configureStorage) => {
    configureStorage();
    mocks.createIDBPersister.mockReturnValue(createPersister());

    renderProvider(<div>application</div>);

    expect({
      content: screen.getByText("application").textContent,
      syncPersisterCalls: mocks.createSyncStoragePersister.mock.calls,
      captureExceptionCalls: mocks.captureException.mock.calls,
      captureMessageCalls: mocks.captureMessage.mock.calls,
    }).toStrictEqual({
      content: "application",
      syncPersisterCalls: [],
      captureExceptionCalls: [],
      captureMessageCalls: [],
    });
  });

  it("discards persisted caches older than the retention period", async () => {
    const expiredClient: PersistedClient = {
      buster: "test-cache-buster",
      timestamp: Date.now() - QUERY_CACHE_RETENTION_MILLISECONDS - 1,
      clientState: {
        mutations: [],
        queries: [],
      },
    };
    const persister = createPersister(vi.fn().mockResolvedValue(expiredClient));
    mocks.createIDBPersister.mockReturnValue(persister);

    renderProvider(<div>application</div>);

    await waitFor(() => expect(persister.removeClient).toHaveBeenCalledTimes(1));
  });

  it("holds queries idle until persistence restoration finishes and unsubscribes on unmount", async () => {
    const restore = createDeferred<PersistedClient | undefined>();
    const persister = createPersister(() => restore.promise);
    mocks.createIDBPersister.mockReturnValue(persister);
    const queryFunction = vi.fn().mockResolvedValue("loaded");

    const view = renderProvider(<QueryConsumer queryFunction={queryFunction} />);

    expect(screen.getByText("waiting")).toBeInTheDocument();
    expect(queryFunction).not.toHaveBeenCalled();

    restore.resolve(undefined);

    await waitFor(() => expect(screen.getByText("loaded")).toBeInTheDocument());
    expect(queryFunction).toHaveBeenCalledTimes(1);

    vi.mocked(persister.persistClient).mockClear();
    queryClient.setQueryData(["subscription-check"], "first");
    await waitFor(() => expect(persister.persistClient).toHaveBeenCalledTimes(2));

    view.unmount();
    queryClient.setQueryData(["subscription-check"], "second");

    expect(persister.persistClient).toHaveBeenCalledTimes(2);
  });

  it("falls back to localStorage when IndexedDB restoration fails", async () => {
    const indexedDbError = new Error("IndexedDB unavailable");
    const indexedDbPersister = createPersister(vi.fn().mockRejectedValue(indexedDbError));
    const localStorageRestore = createDeferred<PersistedClient | undefined>();
    const localStoragePersister = createPersister(() => localStorageRestore.promise);
    mocks.createIDBPersister.mockReturnValue(indexedDbPersister);
    mocks.createSyncStoragePersister.mockReturnValue(localStoragePersister);
    const queryFunction = vi.fn().mockResolvedValue("loaded");

    renderProvider(<QueryConsumer queryFunction={queryFunction} />);

    await waitFor(() => expect(localStoragePersister.restoreClient).toHaveBeenCalledTimes(1));
    expect(queryFunction).not.toHaveBeenCalled();

    localStorageRestore.resolve(undefined);

    await waitFor(() => expect(screen.getByText("loaded")).toBeInTheDocument());
    expect(mocks.captureException).toHaveBeenCalledWith(indexedDbError, {
      tags: {
        component: "QueryProvider",
        errorType: "indexeddb-restore",
      },
    });
  });

  it("unblocks queries and reports the error when all restoration attempts fail", async () => {
    const restoreError = new Error("Stored cache is corrupt");
    const indexedDbPersister = createPersister(vi.fn().mockRejectedValue(restoreError));
    const localStoragePersister = createPersister(vi.fn().mockRejectedValue(restoreError));
    mocks.createIDBPersister.mockReturnValue(indexedDbPersister);
    mocks.createSyncStoragePersister.mockReturnValue(localStoragePersister);
    const queryFunction = vi.fn().mockResolvedValue("loaded");

    renderProvider(<QueryConsumer queryFunction={queryFunction} />);

    await waitFor(() => expect(screen.getByText("loaded")).toBeInTheDocument());
    expect(mocks.captureMessage).toHaveBeenCalledWith("Failed to restore persisted query cache", {
      level: "error",
      tags: {
        component: "QueryProvider",
        errorType: "persistence-restore",
      },
    });
  });
});
