import * as Sentry from '@sentry/react';
import {createStore, del, get, set} from 'idb-keyval';
import {compressForStorage, decompressFromStorage, formatBytes, checkStorageQuota} from './utils/dataCompression';

export const STORAGE_KEYS = {
	QUERY_CACHE: 'FACTORIO_PRINTS_QUERY_CACHE',
	CREATE_FORM: 'factorio-blueprint-create-form',
	HIGH_WATERMARK: 'factorio-prints-high-watermark',
} as const;

export const CACHE_BUSTER = '7';

export const indexedDbStore = createStore('factorio-prints-db', 'query-cache-store');

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
	const trailing = 'trailing' in options ? !!options.trailing : true;
	const maxing = 'maxWait' in options;
	maxWait = maxing ? Math.max(options.maxWait || 0, wait) : 0;

	function invokeFunc(time: number): ReturnType<T> {
		const args = lastArgs!;
		const thisArg = lastThis;

		lastArgs = lastThis = undefined;
		lastInvokeTime = time;
		if (!args) {
			throw new Error('invokeFunc called without arguments');
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
		lastThis = this; // eslint-disable-line @typescript-eslint/no-this-alias
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

	debounced.flush = (): ReturnType<T> => (timerId === undefined ? result : trailingEdge(Date.now()));

	debounced.pending = (): boolean => timerId !== undefined;

	return debounced;
}

let worker: Worker | undefined;
let operationCounter = 0;
const pendingOperations = new Map();
let workerReconnectAttempts = 0;
const maxWorkerReconnectAttempts = 3;
let lastWorkerResetTime = 0;
const workerResetCooldown = 60000;

function resetWorkerIfNeeded() {
	const now = Date.now();
	if (now - lastWorkerResetTime > workerResetCooldown) {
		workerReconnectAttempts = 0;
		lastWorkerResetTime = now;
	}
}

function getWorker() {
	if (!worker) {
		resetWorkerIfNeeded();

		if (workerReconnectAttempts >= maxWorkerReconnectAttempts) {
			return undefined;
		}

		try {
			workerReconnectAttempts++;
			console.log(`[IndexedDB Worker] Creating worker (attempt ${workerReconnectAttempts})`);
			worker = new Worker(new URL('./localStorage.worker.ts', import.meta.url), {type: 'module'});

			worker.onerror = (event) => {
				let errorToCapture: Error;
				let errorMessage: string;

				// Handle null/undefined event (shouldn't happen but being defensive)
				if (!event) {
					errorMessage = 'Worker error: null or undefined event';
					console.error('[IndexedDB Worker] Received null/undefined error event');
					errorToCapture = new Error(errorMessage);
					errorToCapture.name = 'WorkerError';

					Sentry.captureException(errorToCapture, {
						tags: {
							component: 'indexeddb-worker',
							operation: 'worker-error',
							reconnectAttempt: workerReconnectAttempts,
						},
						extra: {
							eventIsNull: true,
						},
					});

					if (worker) {
						worker.terminate();
						worker = undefined;
					}

					pendingOperations.forEach((op) => {
						op.reject(errorToCapture);
					});
					pendingOperations.clear();

					return;
				}

				if (event instanceof ErrorEvent) {
					errorMessage = event.message || 'Unknown worker error';
					console.error('[IndexedDB Worker] Worker error:', errorMessage);
					if (event.error instanceof Error) {
						errorToCapture = event.error;
					} else {
						errorToCapture = new Error(errorMessage);
						errorToCapture.name = 'WorkerError';
					}

					Sentry.captureException(errorToCapture, {
						tags: {
							component: 'indexeddb-worker',
							operation: 'worker-error',
							reconnectAttempt: workerReconnectAttempts,
						},
						extra: {
							filename: event.filename,
							lineno: event.lineno,
							colno: event.colno,
							message: errorMessage,
							errorType: event.error ? event.error.constructor.name : 'Unknown',
						},
					});
				} else {
					// Safari sometimes emits a plain Event instead of ErrorEvent
					const genericEvent = event as Event;
					const eventType =
						genericEvent && typeof genericEvent === 'object' && genericEvent !== null
							? Object.prototype.toString.call(genericEvent).slice(8, -1)
							: 'Unknown';

					// Detect Safari browser
					const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

					// Extract any available properties from the event
					const eventProperties: Record<string, unknown> = {};
					if (genericEvent && typeof genericEvent === 'object') {
						// Attempt to extract standard Event properties
						if ('type' in genericEvent) eventProperties.type = genericEvent.type;
						if ('target' in genericEvent) eventProperties.hasTarget = genericEvent.target !== null;
						if ('currentTarget' in genericEvent)
							eventProperties.hasCurrentTarget = genericEvent.currentTarget !== null;
						if ('defaultPrevented' in genericEvent)
							eventProperties.defaultPrevented = genericEvent.defaultPrevented;
						if ('bubbles' in genericEvent) eventProperties.bubbles = genericEvent.bubbles;
						if ('cancelable' in genericEvent) eventProperties.cancelable = genericEvent.cancelable;
						if ('timeStamp' in genericEvent) eventProperties.timeStamp = genericEvent.timeStamp;
						if ('isTrusted' in genericEvent) eventProperties.isTrusted = genericEvent.isTrusted;

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
					if (isSafari && eventType === 'Event') {
						errorMessage = `Safari worker initialization error: The worker script may have failed to load or encountered a syntax error`;
					} else {
						errorMessage = `Worker error (${eventType}): Unable to extract error details from event object`;
					}

					console.error('[IndexedDB Worker] Worker error:', errorMessage, {
						eventType,
						eventProperties,
						isSafari,
						userAgent: navigator.userAgent,
						workerUrl: './localStorage.worker.ts',
					});
					errorToCapture = new Error(errorMessage);
					errorToCapture.name = 'WorkerError';

					Sentry.captureException(errorToCapture, {
						tags: {
							component: 'indexeddb-worker',
							operation: 'worker-error',
							reconnectAttempt: workerReconnectAttempts,
							browser: isSafari ? 'safari' : 'other',
						},
						extra: {
							eventType,
							eventProperties,
							eventString: String(event),
							isSafari,
							userAgent: navigator.userAgent,
							workerUrl: './localStorage.worker.ts',
							currentUrl: window.location.href,
						},
					});
				}

				if (worker) {
					worker.terminate();
					worker = undefined;
				}

				pendingOperations.forEach((op) => {
					op.resolve({data: undefined, success: false});
				});
				pendingOperations.clear();
			};

			worker.onmessage = (e) => {
				const {id, result, error, success} = e.data;

				if (e.data.type === 'error' && error?.isUncaught) {
					const uncaughtError = new Error(error.message);
					uncaughtError.name = 'WorkerUncaughtError';

					Sentry.captureException(uncaughtError, {
						tags: {
							component: 'indexeddb-worker',
							operation: 'worker-runtime',
							errorType: 'uncaught-error',
						},
						extra: {
							details: error.details,
							stack: error.stack,
						},
					});
					return;
				}

				if (e.data.type === 'error' && error?.isUnhandledRejection) {
					const rejectionError = new Error(error.message);
					rejectionError.name = 'WorkerUnhandledRejection';

					Sentry.captureException(rejectionError, {
						tags: {
							component: 'indexeddb-worker',
							operation: 'worker-runtime',
							errorType: 'unhandled-rejection',
						},
						extra: {
							reason: error.reason,
							stack: error.stack,
						},
					});
					return;
				}

				const pendingOp = pendingOperations.get(id);

				if (pendingOp) {
					if (success) {
						pendingOp.resolve(result);
					} else {
						if (error?.isConnectionClosing) {
							console.warn(
								'[IndexedDB] Operation failed due to closing connection, resolving with undefined',
							);

							// 📊 Log to Sentry for monitoring
							try {
								const connectionError = new Error(`IndexedDB connection closing: ${error.message}`);
								connectionError.name = 'IndexedDBConnectionError';

								Sentry.captureException(connectionError, {
									level: 'info',
									tags: {
										component: 'localStorage',
										errorType: 'connection-closing',
									},
									extra: {
										errorMessage: error.message,
										operationType: e.data.type,
										key: e.data.key,
									},
								});
							} catch (sentryError) {
								// Silently ignore Sentry errors to prevent secondary errors
								console.warn('[IndexedDB] Failed to log to Sentry:', sentryError);
							}
							pendingOp.resolve(undefined);
						} else {
							// 🛡️ Handle blob write failures specifically
							const isBlobWriteError =
								error.message.includes('Failed to write blobs') ||
								error.message.includes('IOError') ||
								error.message.includes('blob') ||
								error.message.includes('Blob');

							if (isBlobWriteError) {
								console.warn('[IndexedDB] Blob write failure detected:', error.message);

								// 📊 Log to Sentry for monitoring with specific context
								try {
									const blobError = new Error(`IndexedDB blob write failed: ${error.message}`);
									blobError.name = 'IndexedDBBlobWriteError';

									Sentry.captureException(blobError, {
										level: 'warning',
										tags: {
											component: 'localStorage',
											errorType: 'blob-write-failure',
											operationType: e.data.type || 'unknown',
										},
										extra: {
											errorMessage: error.message,
											key: e.data.key,
											dataSize: e.data.data ? JSON.stringify(e.data.data).length : 0,
										},
									});
								} catch (sentryError) {
									console.warn('[IndexedDB] Failed to log blob error to Sentry:', sentryError);
								}

								// Resolve with undefined instead of rejecting to prevent cache persistence failure
								// This allows the app to continue functioning even if caching fails
								pendingOp.resolve(undefined);
							} else {
								pendingOp.reject(new Error(error.message));
							}
						}
					}
					pendingOperations.delete(id);
				}
			};

			worker.postMessage({
				type: 'init',
				storeConfig: {
					dbName: 'factorio-prints-db',
					storeName: 'query-cache-store',
				},
			});

			workerReconnectAttempts = 0;
		} catch (error) {
			console.error('[IndexedDB Worker] Failed to create worker:', error);
			worker = undefined;

			Sentry.captureException(error, {
				tags: {
					component: 'indexeddb-worker',
					operation: 'worker-creation',
					reconnectAttempt: workerReconnectAttempts,
				},
			});
		}
	}

	return worker;
}

type WorkerOperationResult = {success: true; data?: any} | {success: false} | {data: any};

async function workerOperation(
	type: string,
	key: string,
	data: any = null,
	retryCount = 0,
): Promise<WorkerOperationResult> {
	const maxRetries = 3;
	const baseDelay = 100;

	try {
		const worker = getWorker();

		if (!worker) {
			try {
				switch (type) {
					case 'set':
						await set(key, data, indexedDbStore);
						return {success: true};
					case 'get':
						return {data: await get(key, indexedDbStore)};
					case 'delete':
						await del(key, indexedDbStore);
						return {success: true};
					default:
						throw new Error('Unknown operation type');
				}
			} catch (error) {
				if (
					error instanceof Error &&
					(error.message.includes('Connection to Indexed Database server lost') ||
						error.message.includes('database connection is closing') ||
						error.message.includes('IDBDatabase'))
				) {
					if (retryCount < maxRetries) {
						const delay = baseDelay * Math.pow(2, retryCount);
						console.warn(
							`[IndexedDB] Connection lost, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`,
						);
						await new Promise((resolve) => setTimeout(resolve, delay));
						return workerOperation(type, key, data, retryCount + 1);
					}

					console.error('[IndexedDB] Connection lost after max retries, returning fallback');
					return type === 'get' ? {data: undefined} : {success: false};
				}
				throw error;
			}
		}

		return new Promise((resolve, reject) => {
			const id = operationCounter++;

			pendingOperations.set(id, {resolve, reject});

			worker.postMessage({type, key, data, id});

			const timeoutDuration = 10000;
			const startTime = Date.now();

			setTimeout(() => {
				if (pendingOperations.has(id)) {
					pendingOperations.delete(id);
					const duration = Date.now() - startTime;

					// Log timeout errors to Sentry
					try {
						const timeoutError = new Error(
							`IndexedDB operation timeout: ${type} ${key} after ${duration}ms`,
						);
						timeoutError.name = 'IndexedDBTimeoutError';

						Sentry.captureException(timeoutError, {
							level: 'warning',
							tags: {
								component: 'localStorage',
								errorType: 'timeout',
								operationType: type,
								database: 'FACTORIO_PRINTS_QUERY_CACHE',
							},
							extra: {
								operationType: type,
								key: key,
								timeout: timeoutDuration,
								actualDuration: duration,
								userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
							},
						});
					} catch (sentryError) {
						// Silently ignore Sentry errors to prevent secondary errors
						console.warn('[IndexedDB] Failed to log timeout to Sentry:', sentryError);
					}

					if (type === 'get' && key === STORAGE_KEYS.QUERY_CACHE) {
						del(key, indexedDbStore).catch((err) =>
							console.error('[IndexedDB] Failed to clear cache after timeout:', err),
						);
					}

					resolve(type === 'get' ? {data: undefined} : {success: false});
				}
			}, timeoutDuration);
		});
	} catch (error) {
		if (
			error instanceof Error &&
			(error.message.includes('Connection to Indexed Database server lost') ||
				error.message.includes('Failed to execute') ||
				error.message.includes('InvalidStateError'))
		) {
			if (retryCount < maxRetries) {
				const delay = baseDelay * Math.pow(2, retryCount);
				console.warn(
					`[IndexedDB] Worker operation failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`,
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
				return workerOperation(type, key, data, retryCount + 1);
			}
		}

		console.error('[IndexedDB] Worker operation failed:', error);
		Sentry.captureException(error, {
			tags: {
				component: 'localStorage',
				errorType: 'worker-operation-error',
				operationType: type,
			},
			extra: {
				operationType: type,
				key: key,
				retryCount: retryCount,
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});

		return type === 'get' ? {data: undefined} : {success: false};
	}
}

interface Persister {
	persistClient: (client: any) => Promise<void>;
	restoreClient: () => Promise<any>;
	removeClient: () => Promise<void>;
}

export function createIDBPersister(idbValidKey: string = STORAGE_KEYS.QUERY_CACHE): Persister {
	const debouncedPersist = debounce(
		async (client: any) => {
			try {
				// 🗜️ Compress data before storing
				const compressedData = compressForStorage(client);
				const originalSize = JSON.stringify(client).length;
				const compressedSize = compressedData.data.length;

				if (compressedData.compressed) {
					console.log(
						`[IndexedDB] Compressed cache: ${formatBytes(originalSize)} → ${formatBytes(compressedSize)}`,
					);
				}

				// 💾 Check storage quota before attempting to write
				const quotaCheck = await checkStorageQuota(compressedSize);
				if (!quotaCheck.hasSpace) {
					console.warn('[IndexedDB] Insufficient storage space available');

					// Log to Sentry for monitoring
					const quotaError = new Error(
						`IndexedDB quota exceeded: need ${formatBytes(compressedSize)}, available ${formatBytes(quotaCheck.available || 0)}`,
					);
					quotaError.name = 'IndexedDBQuotaError';

					Sentry.captureException(quotaError, {
						level: 'warning',
						tags: {
							component: 'localStorage',
							errorType: 'quota-exceeded',
						},
						extra: {
							requiredSize: compressedSize,
							availableSpace: quotaCheck.available,
							usedSpace: quotaCheck.used,
						},
					});

					// Try to clear old data and retry once
					console.log('[IndexedDB] Attempting to clear old cache data');
					await workerOperation('delete', idbValidKey);

					// Check quota again after clearing
					const quotaCheckAfterClear = await checkStorageQuota(compressedSize);
					if (!quotaCheckAfterClear.hasSpace) {
						console.error('[IndexedDB] Still insufficient space after clearing cache');
						return; // Give up
					}
				}

				const result = await workerOperation('set', idbValidKey, compressedData);

				if (result && 'success' in result && !result.success) {
					console.warn('[IndexedDB] Persistence operation did not succeed, but continuing gracefully');
				}
			} catch (error) {
				console.error('[IndexedDB] Error persisting to IndexedDB:', error);

				// Don't throw - allow the app to continue functioning
				Sentry.captureException(error, {
					level: 'warning',
					tags: {
						component: 'localStorage',
						operation: 'persist',
					},
					extra: {
						key: idbValidKey,
						errorMessage: error instanceof Error ? error.message : String(error),
					},
				});
			}
		},
		2000,
		{maxWait: 10000},
	);

	return {
		persistClient: async (client: any) => {
			return debouncedPersist(client);
		},
		restoreClient: async () => {
			try {
				const startTime = Date.now();
				const result = (await workerOperation('get', idbValidKey)) as {data?: any} | undefined;
				const duration = Date.now() - startTime;

				if (result?.data) {
					// 🎈 Decompress data if it was compressed
					const decompressedData = decompressFromStorage(result.data);
					const dataSize = JSON.stringify(decompressedData).length;
					const formattedSize = formatBytes(dataSize);

					if (duration > 5000) {
						// Log slow restore to Sentry
						try {
							const slowRestoreError = new Error(
								`IndexedDB slow restore: took ${duration}ms to restore ${formattedSize}`,
							);
							slowRestoreError.name = 'IndexedDBSlowRestoreError';

							Sentry.captureException(slowRestoreError, {
								level: 'info',
								tags: {
									component: 'localStorage',
									errorType: 'slow-restore',
								},
								extra: {
									duration: duration,
									dataSize: dataSize,
									formattedSize: formattedSize,
								},
							});
						} catch (sentryError) {
							// Silently ignore Sentry errors to prevent secondary errors
							console.warn('[IndexedDB] Failed to log slow restore to Sentry:', sentryError);
						}
					}
				}

				if (result?.data) {
					// 🎈 Decompress data if it was compressed
					const decompressedData = decompressFromStorage(result.data);
					return decompressedData;
				}
				return undefined;
			} catch (error) {
				console.error('[IndexedDB] Error restoring from IndexedDB:', error);

				Sentry.captureException(error, {
					tags: {
						component: 'localStorage',
						errorType: 'restore-error',
					},
					extra: {
						key: idbValidKey,
					},
				});

				try {
					await workerOperation('delete', idbValidKey);
				} catch (deleteError) {
					console.error('[IndexedDB] Failed to clear cache:', deleteError);
				}

				return undefined;
			}
		},
		removeClient: async () => {
			try {
				await workerOperation('delete', idbValidKey);
			} catch (error) {
				console.error('[IndexedDB] Error removing from IndexedDB:', error);
			}
		},
	};
}

export const saveToStorage = (key: string, data: any, retryWithoutBlueprintString = true): boolean => {
	try {
		const serializedData = JSON.stringify(data);
		localStorage.setItem(key, serializedData);
		return true;
	} catch (error) {
		if (error instanceof DOMException && error.name === 'QuotaExceededError' && retryWithoutBlueprintString) {
			if (data && typeof data === 'object' && 'blueprintString' in data) {
				const dataWithoutBlueprintString = {...data};
				delete dataWithoutBlueprintString.blueprintString;
				return saveToStorage(key, dataWithoutBlueprintString, false);
			}
		}

		console.error('Error saving to localStorage:', error);
		return false;
	}
};

export const loadFromStorage = <T = any>(key: string, defaultValue: T | null = null): T | null => {
	try {
		const serializedData = localStorage.getItem(key);
		if (serializedData === null) {
			return defaultValue;
		}
		return JSON.parse(serializedData) as T;
	} catch (error) {
		console.error('Error loading from localStorage:', error);
		return defaultValue;
	}
};

export const removeFromStorage = (key: string): void => {
	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.error('Error removing from localStorage:', error);
	}
};

interface HighWatermarkData {
	lastUpdatedDate: number;
	lastChecked: number;
}

export const getHighWatermark = (): HighWatermarkData | null => {
	return loadFromStorage<HighWatermarkData>(STORAGE_KEYS.HIGH_WATERMARK);
};

export const setHighWatermark = (lastUpdatedDate: number): boolean => {
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
