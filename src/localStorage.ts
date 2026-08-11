import { addBreadcrumb, captureException } from "@sentry/react";
import { createStore, del } from "idb-keyval";
import {
  PersistenceStore,
  type PersistResult,
  type RestoreResult,
} from "./localStorage.persistence";
import LocalStorageWorker from "./localStorage.worker.wrapper";

function logIndexedDbDebug(message: string): void {
  if (import.meta.env.DEV) {
    console.debug(message);
  }
}

export const STORAGE_KEYS = {
  QUERY_CACHE: "FACTORIO_PRINTS_QUERY_CACHE",
  CREATE_FORM: "factorio-blueprint-create-form",
  HIGH_WATERMARK: "factorio-prints-high-watermark",
} as const;

export const CACHE_BUSTER = "7";

const storageCapabilityTestKey = "__factorio_prints_storage_test__";

function isStorage(value: unknown): value is Storage {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const storage = value as Partial<Storage>;
  return (
    typeof storage.clear === "function" &&
    typeof storage.getItem === "function" &&
    typeof storage.key === "function" &&
    typeof storage.removeItem === "function" &&
    typeof storage.setItem === "function"
  );
}

function getLocalStorageCapability(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const storage = window.localStorage;
    return isStorage(storage) ? storage : undefined;
  } catch {
    return undefined;
  }
}

function createSafeStorage(storage: Storage): Storage {
  return {
    clear: () => {
      try {
        storage.clear();
      } catch {}
    },
    getItem: (key) => {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    key: (index) => {
      try {
        return storage.key(index);
      } catch {
        return null;
      }
    },
    get length() {
      try {
        return storage.length;
      } catch {
        return 0;
      }
    },
    removeItem: (key) => {
      try {
        storage.removeItem(key);
      } catch {}
    },
    setItem: (key, value) => {
      try {
        storage.setItem(key, value);
      } catch {}
    },
  };
}

export function getSafeLocalStorage(): Storage | undefined {
  const storage = getLocalStorageCapability();
  if (!storage) {
    return undefined;
  }

  try {
    storage.setItem(storageCapabilityTestKey, storageCapabilityTestKey);
    storage.removeItem(storageCapabilityTestKey);
    return createSafeStorage(storage);
  } catch {
    return undefined;
  }
}

const indexedDbStore = createStore("factorio-prints-db", "query-cache-store");

interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  cancel(): void;
  flush(): ReturnType<T>;
  pending(): boolean;
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: DebounceOptions = {},
): DebouncedFunction<T> {
  let lastArgs: Parameters<T> | undefined;
  let lastThis: ThisParameterType<T> | undefined;
  let maxWait: number;
  let result: ReturnType<T>;
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;
  const leading = !!options.leading;
  const trailing = "trailing" in options ? !!options.trailing : true;
  const maxing = "maxWait" in options;
  maxWait = maxing ? Math.max(options.maxWait || 0, wait) : 0;

  function invokeFunc(time: number): ReturnType<T> {
    const args = lastArgs!;
    const thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    if (!args) {
      throw new Error("invokeFunc called without arguments");
    }
    result = func.apply(thisArg, args);
    return result;
  }

  function startTimer(pendingFunc: () => void, wait: number): ReturnType<typeof setTimeout> {
    return setTimeout(pendingFunc, wait);
  }

  function cancelTimer(id: ReturnType<typeof setTimeout>): void {
    clearTimeout(id);
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxing && timeSinceLastInvoke >= maxWait)
    );
  }

  function trailingEdge(time: number): ReturnType<T> {
    timerId = undefined;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function leadingEdge(time: number): ReturnType<T> {
    lastInvokeTime = time;
    timerId = startTimer(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return maxing ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
  }

  function timerExpired(): void {
    const time = Date.now();

    if (shouldInvoke(time)) {
      trailingEdge(time);
      return;
    }

    timerId = startTimer(timerExpired, remainingWait(time));
  }

  function debounced(this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T> {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this; // oxlint-disable-line @typescript-eslint/no-this-alias
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        timerId = startTimer(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = startTimer(timerExpired, wait);
    }
    return result;
  }

  debounced.cancel = (): void => {
    if (timerId !== undefined) {
      cancelTimer(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  };

  debounced.flush = (): ReturnType<T> =>
    timerId === undefined ? result : trailingEdge(Date.now());

  debounced.pending = (): boolean => timerId !== undefined;

  return debounced;
}

let worker: Worker | undefined;
let operationCounter = 0;
interface PendingOperation {
  resolve: (result: WorkerOperationResult) => void;
  operationType: StorageOperation;
  timeoutHandle: ReturnType<typeof setTimeout>;
}

const pendingOperations = new Map<number, PendingOperation>();
let workerReconnectAttempts = 0;
const maxWorkerReconnectAttempts = 5;
let lastWorkerResetTime = 0;
const workerResetCooldown = 30000;
let isWorkerInitializing = false;
let isWorkerDisabledForSession = false;
let workerInitPromise: Promise<void> | undefined;

function clearPendingOperation(id: number): PendingOperation | undefined {
  const pendingOperation = pendingOperations.get(id);
  if (pendingOperation) {
    clearTimeout(pendingOperation.timeoutHandle);
    pendingOperations.delete(id);
  }
  return pendingOperation;
}

function clearAllPendingOperations(): PendingOperation[] {
  const operations = [...pendingOperations.values()];
  for (const operation of operations) {
    clearTimeout(operation.timeoutHandle);
  }
  pendingOperations.clear();
  return operations;
}

function settlePendingOperationsAfterTermination(): void {
  for (const operation of clearAllPendingOperations()) {
    operation.resolve(
      operation.operationType === "restore" ? { success: true } : { success: false },
    );
  }
}

function resetWorkerIfNeeded() {
  const now = Date.now();
  if (now - lastWorkerResetTime > workerResetCooldown) {
    workerReconnectAttempts = 0;
    lastWorkerResetTime = now;
  }
}

function terminateWorker() {
  if (worker) {
    try {
      worker.terminate();
    } catch (error) {
      console.warn("[IndexedDB Worker] Error terminating worker:", error);
    }
    worker = undefined;
  }
  isWorkerInitializing = false;
  workerInitPromise = undefined;
  settlePendingOperationsAfterTermination();
}

function disableWorkerForSession() {
  isWorkerDisabledForSession = true;
  terminateWorker();
}

async function getWorker(): Promise<Worker | undefined> {
  if (isWorkerDisabledForSession) {
    return undefined;
  }

  // If worker is being initialized, wait for it
  if (isWorkerInitializing && workerInitPromise) {
    try {
      await workerInitPromise;
      return worker;
    } catch (error) {
      logIndexedDbDebug(
        `[IndexedDB Worker] Failed to wait for worker initialization: ${String(error)}`,
      );
      return undefined;
    }
  }

  if (!worker && !isWorkerInitializing) {
    resetWorkerIfNeeded();

    if (workerReconnectAttempts >= maxWorkerReconnectAttempts) {
      return undefined;
    }

    isWorkerInitializing = true;

    workerInitPromise = new Promise<void>((resolve, reject) => {
      let initializationTimeout: ReturnType<typeof setTimeout> | undefined;
      const clearInitializationTimeout = (): void => {
        if (initializationTimeout !== undefined) {
          clearTimeout(initializationTimeout);
          initializationTimeout = undefined;
        }
      };

      try {
        workerReconnectAttempts++;
        logIndexedDbDebug(
          `[IndexedDB Worker] Creating worker (attempt ${workerReconnectAttempts})`,
        );

        worker = new LocalStorageWorker();
        logIndexedDbDebug("[IndexedDB Worker] Successfully created worker using Vite import");

        worker.onerror = (event) => {
          clearInitializationTimeout();
          let errorToCapture: Error | null;
          let errorMessage: string;

          // Handle null/undefined event (shouldn't happen but being defensive)
          if (!event) {
            errorMessage = "Worker error: null or undefined event";
            errorToCapture = new Error(errorMessage);
            errorToCapture.name = "WorkerError";

            captureException(errorToCapture, {
              tags: {
                component: "indexeddb-worker",
                operation: "worker-error",
                reconnectAttempt: workerReconnectAttempts,
              },
              extra: {
                eventIsNull: true,
              },
            });

            disableWorkerForSession();
            reject(errorToCapture);
            return;
          }

          if (event instanceof ErrorEvent) {
            errorMessage = event.message || "Unknown worker error";
            if (event.error instanceof Error) {
              errorToCapture = event.error;
            } else {
              errorToCapture = new Error(errorMessage);
              errorToCapture.name = "WorkerError";
            }

            captureException(errorToCapture, {
              tags: {
                component: "indexeddb-worker",
                operation: "worker-error",
                reconnectAttempt: workerReconnectAttempts,
              },
              extra: {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                message: errorMessage,
                errorType: event.error ? event.error.constructor.name : "Unknown",
              },
            });
          } else {
            // Safari sometimes emits a plain Event instead of ErrorEvent
            const genericEvent = event as Event;
            const eventType =
              genericEvent && typeof genericEvent === "object" && genericEvent !== null
                ? Object.prototype.toString.call(genericEvent).slice(8, -1)
                : "Unknown";

            // Detect Safari browser
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

            // Extract any available properties from the event
            const eventProperties: Record<string, unknown> = {};
            if (genericEvent && typeof genericEvent === "object") {
              // Attempt to extract standard Event properties
              if ("type" in genericEvent) eventProperties.type = genericEvent.type;
              if ("target" in genericEvent)
                eventProperties.hasTarget = genericEvent.target !== null;
              if ("currentTarget" in genericEvent)
                eventProperties.hasCurrentTarget = genericEvent.currentTarget !== null;
              if ("defaultPrevented" in genericEvent)
                eventProperties.defaultPrevented = genericEvent.defaultPrevented;
              if ("bubbles" in genericEvent) eventProperties.bubbles = genericEvent.bubbles;
              if ("cancelable" in genericEvent)
                eventProperties.cancelable = genericEvent.cancelable;
              if ("timeStamp" in genericEvent) eventProperties.timeStamp = genericEvent.timeStamp;
              if ("isTrusted" in genericEvent) eventProperties.isTrusted = genericEvent.isTrusted;

              // Try to get any custom properties
              try {
                const allKeys = Object.keys(genericEvent);
                if (allKeys.length > 0) {
                  eventProperties.availableKeys = allKeys;
                }
              } catch {
                // Ignore if we can't enumerate keys
              }
            }

            // Create a more descriptive error message
            if (isSafari && eventType === "Event") {
              errorMessage = `Safari worker initialization error: The worker script may have failed to load or encountered a syntax error`;
            } else {
              errorMessage = `Worker error (${eventType}): Unable to extract error details from event object`;
            }

            // Log Safari worker issues as info level since they're expected
            if (isSafari && eventType === "Event") {
              addBreadcrumb({
                message: "Safari worker initialization issue",
                category: "indexeddb",
                level: "info",
                data: {
                  eventType,
                  eventProperties,
                  userAgent: navigator.userAgent,
                },
              });
              // Don't capture Safari worker init issues as exceptions
              errorToCapture = null;
            } else {
              errorToCapture = new Error(errorMessage);
              errorToCapture.name = "WorkerError";
            }

            if (errorToCapture) {
              captureException(errorToCapture, {
                tags: {
                  component: "indexeddb-worker",
                  operation: "worker-error",
                  reconnectAttempt: workerReconnectAttempts,
                  browser: isSafari ? "safari" : "other",
                },
                extra: {
                  eventType,
                  eventProperties,
                  eventString: String(event),
                  isSafari,
                  userAgent: navigator.userAgent,
                  currentUrl: window.location.href,
                },
              });
            }
          }

          disableWorkerForSession();
          reject(new Error(errorMessage));
        };

        worker.onmessage = (e) => {
          const { id, result, error, success } = e.data;

          if (e.data.type === "error" && error?.isUncaught) {
            const uncaughtError = new Error(error.message);
            uncaughtError.name = "WorkerUncaughtError";

            captureException(uncaughtError, {
              tags: {
                component: "indexeddb-worker",
                operation: "worker-runtime",
                errorType: "uncaught-error",
              },
              extra: {
                details: error.details,
                stack: error.stack,
              },
            });
            return;
          }

          if (e.data.type === "error" && error?.isUnhandledRejection) {
            const rejectionError = new Error(error.message);
            rejectionError.name = "WorkerUnhandledRejection";

            captureException(rejectionError, {
              tags: {
                component: "indexeddb-worker",
                operation: "worker-runtime",
                errorType: "unhandled-rejection",
              },
              extra: {
                reason: error.reason,
                stack: error.stack,
              },
            });
            return;
          }

          const pendingOp = clearPendingOperation(id);

          if (pendingOp) {
            if (success) {
              pendingOp.resolve(result);
            } else {
              if (error?.isConnectionClosing) {
                // Connection lost - reset worker for next operation
                terminateWorker();
                console.warn(
                  "[IndexedDB] Operation failed due to closing connection, resolving with undefined",
                );

                // 📊 Log as breadcrumb for debugging (error is already handled gracefully)
                addBreadcrumb({
                  message: "IndexedDB connection closing - handled gracefully",
                  category: "indexeddb",
                  level: "warning",
                  data: {
                    errorMessage: error.message,
                    operationType: e.data.type,
                    key: e.data.key,
                  },
                });
                // Return a safe fallback result based on the operation type
                pendingOp.resolve(
                  pendingOp.operationType === "restore" ? { success: true } : { success: false },
                );
              } else {
                // 🛡️ Handle blob write failures specifically
                const isBlobWriteError =
                  error.message.includes("Failed to write blobs") ||
                  error.message.includes("IOError") ||
                  error.message.includes("blob") ||
                  error.message.includes("Blob");

                if (isBlobWriteError) {
                  console.warn("[IndexedDB] Blob write failure detected:", error.message);

                  // 📊 Log to Sentry for monitoring with specific context
                  try {
                    const blobError = new Error(`IndexedDB blob write failed: ${error.message}`);
                    blobError.name = "IndexedDBBlobWriteError";

                    captureException(blobError, {
                      level: "warning",
                      tags: {
                        component: "localStorage",
                        errorType: "blob-write-failure",
                        operationType: e.data.type || "unknown",
                      },
                      extra: {
                        errorMessage: error.message,
                        key: e.data.key,
                      },
                    });
                  } catch (sentryError) {
                    console.warn("[IndexedDB] Failed to log blob error to Sentry:", sentryError);
                  }
                } else {
                  // For other errors, log but don't throw
                  console.warn("[IndexedDB] Operation failed, using fallback:", error.message);
                }

                // Always resolve with fallback instead of rejecting to prevent cache persistence failure
                // This allows the app to continue functioning even if caching fails
                pendingOp.resolve(
                  pendingOp.operationType === "restore" ? { success: true } : { success: false },
                );
              }
            }
          }
        };

        // Wait for initialization confirmation
        initializationTimeout = setTimeout(() => {
          initializationTimeout = undefined;
          addBreadcrumb({
            message: "IndexedDB worker initialization timed out; using main-thread persistence",
            category: "indexeddb",
            level: "info",
          });
          disableWorkerForSession();
          reject(new Error("Worker initialization timeout"));
        }, 5000);

        const originalOnMessage = worker.onmessage;
        worker.onmessage = (e) => {
          if (!e.data.id && e.data.success) {
            clearInitializationTimeout();
            worker!.onmessage = originalOnMessage;
            workerReconnectAttempts = 0;
            isWorkerInitializing = false;
            logIndexedDbDebug("[IndexedDB Worker] Worker initialized successfully");
            resolve();
          } else if (originalOnMessage && worker) {
            originalOnMessage.call(worker, e);
          }
        };

        worker.postMessage({
          type: "init",
          storeConfig: {
            dbName: "factorio-prints-db",
            storeName: "query-cache-store",
          },
        });
      } catch (error) {
        clearInitializationTimeout();
        disableWorkerForSession();

        captureException(error, {
          tags: {
            component: "indexeddb-worker",
            operation: "worker-creation",
            reconnectAttempt: workerReconnectAttempts,
          },
        });

        reject(error);
      }
    });

    try {
      await workerInitPromise;
    } catch (error) {
      logIndexedDbDebug(`[IndexedDB Worker] Worker initialization failed: ${String(error)}`);
      return undefined;
    }
  }

  return worker;
}

type StorageOperation = "persist" | "restore" | "delete";
type WorkerOperationResult = { success: boolean; data?: any };

let fallbackPersistenceStore: PersistenceStore | undefined;

function getFallbackPersistenceStore(): PersistenceStore {
  fallbackPersistenceStore ??= new PersistenceStore(indexedDbStore);
  return fallbackPersistenceStore;
}

async function workerOperation(
  type: StorageOperation,
  key: string,
  data: any = null,
  retryCount = 0,
): Promise<WorkerOperationResult> {
  const maxRetries = type === "persist" ? 3 : 4;
  const baseDelay = type === "persist" ? 1000 : 500;

  try {
    const worker = await getWorker();

    if (!worker) {
      try {
        switch (type) {
          case "persist": {
            const persistenceStore = await getFallbackPersistenceStore();
            return await persistenceStore.persist(key, data);
          }
          case "restore": {
            const persistenceStore = await getFallbackPersistenceStore();
            return await persistenceStore.restore(key);
          }
          case "delete":
            await (await getFallbackPersistenceStore()).delete(key);
            return { success: true };
        }
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes("Connection to Indexed Database server lost") ||
            error.message.includes("database connection is closing") ||
            error.message.includes("IDBDatabase") ||
            error.message.includes("TransactionInactiveError") ||
            error.message.includes("AbortError"))
        ) {
          if (retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount);
            console.warn(
              `[IndexedDB] Connection lost, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            return workerOperation(type, key, data, retryCount + 1);
          }

          console.error("[IndexedDB] Connection lost after max retries, returning fallback");
          return type === "restore" ? { success: true } : { success: false };
        }
        throw error;
      }
    }

    return new Promise((resolve, reject) => {
      const id = operationCounter++;
      const baseTimeout = type === "persist" ? 30000 : type === "delete" ? 5000 : 20000;
      const retryMultiplier = Math.min(retryCount + 1, 3);
      const timeoutDuration = baseTimeout * retryMultiplier;
      const startTime = Date.now();

      if (retryCount > 0) {
        logIndexedDbDebug(
          `[IndexedDB] Operation ${type} with retry ${retryCount}, timeout increased to ${timeoutDuration}ms`,
        );
      }

      const timeoutHandle = setTimeout(() => {
        if (pendingOperations.has(id)) {
          pendingOperations.delete(id);
          const duration = Date.now() - startTime;

          // Log timeout errors to Sentry with rate limiting
          try {
            const expectedMaxDuration = timeoutDuration + 5000;
            const isExpectedTimeout = duration < expectedMaxDuration;

            if (!isExpectedTimeout) {
              const timeoutError = new Error(
                `IndexedDB operation timeout: ${type} ${key} after ${duration}ms`,
              );
              timeoutError.name = "IndexedDBTimeoutError";

              captureException(timeoutError, {
                level: duration > 60000 ? "error" : "warning",
                tags: {
                  component: "localStorage",
                  errorType: "timeout",
                  operationType: type,
                  database: "FACTORIO_PRINTS_QUERY_CACHE",
                  timeoutRange:
                    duration < 20000
                      ? "10-20s"
                      : duration < 40000
                        ? "20-40s"
                        : duration < 60000
                          ? "40-60s"
                          : "60s+",
                },
                extra: {
                  operationType: type,
                  key: key,
                  configuredTimeout: timeoutDuration,
                  baseTimeout: baseTimeout,
                  retryMultiplier: retryMultiplier,
                  actualDuration: duration,
                  retryCount: retryCount,
                  maxRetries: maxRetries,
                  userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
                },
              });
            } else {
              console.warn(
                `[IndexedDB] Operation timeout (expected range): ${type} ${key} after ${duration}ms`,
              );
            }
          } catch (sentryError) {
            // Silently ignore Sentry errors to prevent secondary errors
            console.warn("[IndexedDB] Failed to log timeout to Sentry:", sentryError);
          }

          if (type === "restore" && key === STORAGE_KEYS.QUERY_CACHE) {
            del(key, indexedDbStore).catch((err) =>
              console.error("[IndexedDB] Failed to clear cache after timeout:", err),
            );
          }

          resolve(type === "restore" ? { success: true } : { success: false });
        }
      }, timeoutDuration);

      pendingOperations.set(id, { resolve, operationType: type, timeoutHandle });

      try {
        worker.postMessage({ type, key, data, id });
      } catch (error) {
        clearPendingOperation(id);
        reject(error);
      }
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Connection to Indexed Database server lost") ||
        error.message.includes("Failed to execute") ||
        error.message.includes("InvalidStateError") ||
        error.message.includes("TransactionInactiveError") ||
        error.message.includes("AbortError"))
    ) {
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.warn(
          `[IndexedDB] Worker operation failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`,
        );
        // Reset worker to force reconnection
        terminateWorker();
        await new Promise((resolve) => setTimeout(resolve, delay));
        return workerOperation(type, key, data, retryCount + 1);
      }
    }

    console.error("[IndexedDB] Worker operation failed:", error);
    captureException(error, {
      tags: {
        component: "localStorage",
        errorType: "worker-operation-error",
        operationType: type,
      },
      extra: {
        operationType: type,
        key: key,
        retryCount: retryCount,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    return type === "restore" ? { success: true } : { success: false };
  }
}

interface Persister {
  persistClient: (client: any) => Promise<void>;
  restoreClient: () => Promise<any>;
  removeClient: () => Promise<void>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 Bytes";
  }
  const kilobyte = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const sizeIndex = Math.floor(Math.log(bytes) / Math.log(kilobyte));
  return `${parseFloat((bytes / Math.pow(kilobyte, sizeIndex)).toFixed(2))} ${sizes[sizeIndex]}`;
}

export function createIDBPersister(idbValidKey: string = STORAGE_KEYS.QUERY_CACHE): Persister {
  const debouncedPersist = debounce(
    async (client: any) => {
      try {
        const result = await workerOperation("persist", idbValidKey, client);
        const persistenceData = result.data as PersistResult["data"] | undefined;

        if (persistenceData?.status === "unchanged") {
          logIndexedDbDebug("[IndexedDB] Cache state unchanged, skipping persistence");
          return;
        }

        if (
          result.success &&
          persistenceData?.status === "persisted" &&
          persistenceData.compressed
        ) {
          logIndexedDbDebug(
            `[IndexedDB] Compressed cache: ${formatBytes(persistenceData.originalSize)} → ${formatBytes(persistenceData.storedSize)}`,
          );
        }

        if (!result.success && persistenceData?.status === "insufficient-storage") {
          console.warn("[IndexedDB] Insufficient storage space available");

          const quotaError = new Error(
            `IndexedDB quota exceeded: need ${formatBytes(persistenceData.requiredSize)}, available ${formatBytes(persistenceData.availableSize)}`,
          );
          quotaError.name = "IndexedDBQuotaError";

          captureException(quotaError, {
            level: "warning",
            tags: {
              component: "localStorage",
              errorType: "quota-exceeded",
            },
            extra: {
              requiredSize: persistenceData.requiredSize,
              availableSpace: persistenceData.availableSize,
              usedSpace: persistenceData.usedSize,
            },
          });
        }

        if (!result.success) {
          addBreadcrumb({
            message: "IndexedDB persistence failed gracefully",
            category: "indexeddb",
            level: "info",
            data: { key: idbValidKey },
          });
        }
      } catch (error) {
        console.error("[IndexedDB] Error persisting to IndexedDB:", error);

        try {
          captureException(error, {
            level: "warning",
            tags: {
              component: "localStorage",
              operation: "persist",
            },
            extra: {
              key: idbValidKey,
              errorMessage: error instanceof Error ? error.message : String(error),
            },
          });
        } catch (sentryError) {
          console.warn("[IndexedDB] Failed to log to Sentry:", sentryError);
        }
      }
    },
    2000,
    { maxWait: 10000 },
  );

  const persister: Persister = {
    persistClient: async (client: any) => {
      if (!client) {
        console.warn("[IndexedDB] Attempted to persist null/undefined client");
        return;
      }
      try {
        return await debouncedPersist(client);
      } catch (error) {
        console.warn("[IndexedDB] Failed to persist client:", error);
      }
    },
    restoreClient: async () => {
      try {
        const startTime = Date.now();

        if (typeof performance !== "undefined" && performance.mark) {
          performance.mark("indexeddb-restore-start");
        }

        const result = await workerOperation("restore", idbValidKey);
        const restoreData = result.data as RestoreResult["data"] | undefined;

        if (restoreData) {
          const totalDuration = Date.now() - startTime;
          const formattedSize = formatBytes(restoreData.originalSize);
          const formattedCompressedSize = formatBytes(restoreData.storedSize);

          if (typeof performance !== "undefined" && performance.mark) {
            performance.mark("indexeddb-restore-end");
            try {
              performance.measure(
                "indexeddb-restore",
                "indexeddb-restore-start",
                "indexeddb-restore-end",
              );
            } catch {
              // Ignore performance API errors
            }
          }

          if (totalDuration > 2000 || restoreData.originalSize > 1048576) {
            logIndexedDbDebug(
              `[IndexedDB] Restore performance: Total ${totalDuration}ms, ` +
                `Size: ${formattedCompressedSize} → ${formattedSize} (${restoreData.compressed ? "compressed" : "uncompressed"})`,
            );
          }

          if (totalDuration > 5000) {
            try {
              const slowRestoreError = new Error(
                `IndexedDB slow restore: took ${totalDuration}ms to restore ${formattedSize}`,
              );
              slowRestoreError.name = "IndexedDBSlowRestoreError";

              captureException(slowRestoreError, {
                level: "info",
                tags: {
                  component: "localStorage",
                  errorType: "slow-restore",
                },
                extra: {
                  totalDuration: totalDuration,
                  dataSize: restoreData.originalSize,
                  compressedSize: restoreData.storedSize,
                  formattedSize: formattedSize,
                  formattedCompressedSize: formattedCompressedSize,
                  compressionRatio:
                    restoreData.storedSize > 0
                      ? (restoreData.originalSize / restoreData.storedSize).toFixed(2)
                      : "N/A",
                },
              });
            } catch (sentryError) {
              // Silently ignore Sentry errors to prevent secondary errors
              console.warn("[IndexedDB] Failed to log slow restore to Sentry:", sentryError);
            }
          }

          return restoreData.client;
        }
        return undefined;
      } catch (error) {
        console.error("[IndexedDB] Error restoring from IndexedDB:", error);

        try {
          captureException(error, {
            tags: {
              component: "localStorage",
              errorType: "restore-error",
            },
            extra: {
              key: idbValidKey,
            },
          });
        } catch (sentryError) {
          console.warn("[IndexedDB] Failed to log to Sentry:", sentryError);
        }

        try {
          await workerOperation("delete", idbValidKey);
        } catch (deleteError) {
          console.error("[IndexedDB] Failed to clear cache:", deleteError);
        }

        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await workerOperation("delete", idbValidKey);
      } catch (error) {
        console.error("[IndexedDB] Error removing from IndexedDB:", error);
      }
    },
  };

  // Validate the persister object before returning
  if (!persister.restoreClient || typeof persister.restoreClient !== "function") {
    throw new Error("[IndexedDB] Failed to create valid persister - restoreClient method missing");
  }

  return persister;
}

export const saveToStorage = (
  key: string,
  data: any,
  retryWithoutBlueprintString = true,
): boolean => {
  try {
    const storage = getLocalStorageCapability();
    if (!storage) {
      return false;
    }

    const serializedData = JSON.stringify(data);
    storage.setItem(key, serializedData);
    return true;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "QuotaExceededError" &&
      retryWithoutBlueprintString
    ) {
      if (data && typeof data === "object" && "blueprintString" in data) {
        const dataWithoutBlueprintString = { ...data };
        delete dataWithoutBlueprintString.blueprintString;
        return saveToStorage(key, dataWithoutBlueprintString, false);
      }
    }

    return false;
  }
};

export const loadFromStorage = <T = any>(key: string, defaultValue: T | null = null): T | null => {
  try {
    const serializedData = getLocalStorageCapability()?.getItem(key);
    if (serializedData === null) {
      return defaultValue;
    }
    if (serializedData === undefined) {
      return defaultValue;
    }
    return JSON.parse(serializedData) as T;
  } catch {
    return defaultValue;
  }
};

export const removeFromStorage = (key: string): void => {
  try {
    getLocalStorageCapability()?.removeItem(key);
  } catch {}
};

interface HighWatermarkData {
  lastUpdatedDate: number;
  lastChecked: number;
}

export const getHighWatermark = (): HighWatermarkData | null => {
  return loadFromStorage<HighWatermarkData>(STORAGE_KEYS.HIGH_WATERMARK);
};

const setHighWatermark = (lastUpdatedDate: number): boolean => {
  const watermarkData: HighWatermarkData = {
    lastUpdatedDate,
    lastChecked: Date.now(),
  };
  return saveToStorage(STORAGE_KEYS.HIGH_WATERMARK, watermarkData);
};

export const updateHighWatermark = (lastUpdatedDate: number): boolean => {
  const currentWatermark = getHighWatermark();

  if (!currentWatermark || lastUpdatedDate > currentWatermark.lastUpdatedDate) {
    const result = setHighWatermark(lastUpdatedDate);
    return result;
  }

  return true;
};
