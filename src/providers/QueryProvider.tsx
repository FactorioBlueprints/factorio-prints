import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  PersistQueryClientProvider,
  type PersistedClient,
  type Persister,
} from "@tanstack/react-query-persist-client";
import { captureException, captureMessage } from "@sentry/react";
import type React from "react";
import { useMemo } from "react";
import useBlueprintCacheSync from "../hooks/useBlueprintCacheSync";
import { useHighWatermarkSync } from "../hooks/useHighWatermarkSync";
import { CACHE_BUSTER, createIDBPersister, STORAGE_KEYS } from "../localStorage";
import { queryClient, QUERY_CACHE_RETENTION_MILLISECONDS } from "./queryClient";

interface BlueprintCacheSyncProviderProps {
  children: React.ReactNode;
}

function BlueprintCacheSyncProvider({ children }: BlueprintCacheSyncProviderProps) {
  useBlueprintCacheSync();
  useHighWatermarkSync();
  return <>{children}</>;
}

interface QueryProviderProps {
  children: React.ReactNode;
}

const noOpPersister: Persister = {
  persistClient: () => undefined,
  restoreClient: () => undefined,
  removeClient: () => undefined,
};

function createLocalStoragePersister(): Persister | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const storage = window.localStorage;
    const testKey = "__factorio_prints_storage_test__";
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);

    return createSyncStoragePersister({
      storage,
      key: STORAGE_KEYS.QUERY_CACHE,
      throttleTime: 1000,
    });
  } catch (error) {
    captureException(error, {
      tags: {
        component: "QueryProvider",
        errorType: "localStorage-access",
      },
    });
    return undefined;
  }
}

function createFallbackPersister(
  indexedDbPersister: Persister,
  localStoragePersister: Persister,
): Persister {
  let activePersister = indexedDbPersister;

  return {
    persistClient: (client: PersistedClient) => activePersister.persistClient(client),
    restoreClient: async () => {
      try {
        const indexedDbClient = await indexedDbPersister.restoreClient();
        if (indexedDbClient !== undefined) {
          return indexedDbClient;
        }
      } catch (error) {
        activePersister = localStoragePersister;
        captureException(error, {
          tags: {
            component: "QueryProvider",
            errorType: "indexeddb-restore",
          },
        });
      }

      return localStoragePersister.restoreClient();
    },
    removeClient: async () => {
      await Promise.all([indexedDbPersister.removeClient(), localStoragePersister.removeClient()]);
    },
  };
}

function createQueryCachePersister(): Persister {
  const localStoragePersister = createLocalStoragePersister() ?? noOpPersister;

  if (typeof window === "undefined" || typeof window.indexedDB === "undefined") {
    return localStoragePersister;
  }

  try {
    return createFallbackPersister(createIDBPersister(), localStoragePersister);
  } catch (error) {
    captureException(error, {
      tags: {
        component: "QueryProvider",
        errorType: "indexeddb-initialization",
      },
    });
    return localStoragePersister;
  }
}

function handlePersistenceRestoreError() {
  captureMessage("Failed to restore persisted query cache", {
    level: "error",
    tags: {
      component: "QueryProvider",
      errorType: "persistence-restore",
    },
  });
}

function QueryProvider({ children }: QueryProviderProps) {
  const persister = useMemo(createQueryCachePersister, []);
  const persistOptions = useMemo(
    () => ({
      persister,
      maxAge: QUERY_CACHE_RETENTION_MILLISECONDS,
      buster: CACHE_BUSTER,
    }),
    [persister],
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onError={handlePersistenceRestoreError}
    >
      <BlueprintCacheSyncProvider>{children}</BlueprintCacheSyncProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  );
}

export default QueryProvider;
