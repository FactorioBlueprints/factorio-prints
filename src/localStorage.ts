import * as Sentry from '@sentry/react';
import {createStore, del, get, set} from 'idb-keyval';

export const STORAGE_KEYS = {
	QUERY_CACHE: 'FACTORIO_PRINTS_QUERY_CACHE',
	CREATE_FORM: 'factorio-blueprint-create-form',
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
		const args = lastArgs;
		const thisArg = lastThis;

		lastArgs = lastThis = undefined;
		lastInvokeTime = time;
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

function getWorker() {
	if (!worker) {
		try {
			worker = new Worker(new URL('./localStorage.worker.ts', import.meta.url), {type: 'module'});

			worker.onerror = (error) => {
				console.error('[IndexedDB Worker] Failed to initialize worker:', error);
				Sentry.captureException(error instanceof ErrorEvent ? error.error || error : error, {
					tags: {
						component: 'indexeddb-worker',
						operation: 'worker-initialization',
					},
					extra: {
						filename: error instanceof ErrorEvent ? error.filename : undefined,
						lineno: error instanceof ErrorEvent ? error.lineno : undefined,
						colno: error instanceof ErrorEvent ? error.colno : undefined,
						message: error instanceof ErrorEvent ? error.message : String(error),
					},
				});
				worker = undefined;
			};

			worker.onmessage = (e) => {
				const {id, result, error, success} = e.data;
				const pendingOp = pendingOperations.get(id);

				if (pendingOp) {
					if (success) {
						pendingOp.resolve(result);
					} else {
						// 🛡️ Handle connection closing errors gracefully
						if (error?.isConnectionClosing) {
							console.warn(
								'[IndexedDB] Operation failed due to closing connection, resolving with undefined',
							);
							// 📊 Log to Sentry for monitoring
							Sentry.captureMessage('IndexedDB connection closing', {
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
							pendingOp.resolve(undefined);
						} else {
							pendingOp.reject(new Error(error.message));
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
		} catch (error) {
			console.error('[IndexedDB Worker] Failed to create worker:', error);
			worker = undefined;
		}
	}

	return worker;
}

async function workerOperation(type: string, key: string, data = null) {
	const worker = getWorker();

	// Fallback to direct idb-keyval if worker fails
	if (!worker) {
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
				console.warn('[IndexedDB] Operation timed out:', type, key, `after ${duration}ms`);

				Sentry.captureMessage('IndexedDB operation timeout', {
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

				if (type === 'get' && key === STORAGE_KEYS.QUERY_CACHE) {
					console.warn('[IndexedDB] Query cache timeout - clearing cache');
					del(key, indexedDbStore).catch((err) =>
						console.error('[IndexedDB] Failed to clear cache after timeout:', err),
					);
				}

				resolve(type === 'get' ? {data: undefined} : {success: false});
			}
		}, timeoutDuration);
	});
}

function formatBytes(bytes: number) {
	if (bytes > 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	} else if (bytes > 1024) {
		return `${(bytes / 1024).toFixed(2)} KB`;
	} else {
		return `${bytes} bytes`;
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
				const dataSize = JSON.stringify(client).length;
				const formattedSize = formatBytes(dataSize);
				console.log(`[IndexedDB] Persisting client data of size: ${formattedSize}`);

				await workerOperation('set', idbValidKey, client);

				console.log('[IndexedDB] Persistence complete');
			} catch (error) {
				console.error('[IndexedDB] Error persisting to IndexedDB:', error);
				throw error;
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
					const dataSize = JSON.stringify(result.data).length;
					const formattedSize = formatBytes(dataSize);
					console.log(`[IndexedDB] Restored data size: ${formattedSize} in ${duration}ms`);

					if (duration > 5000) {
						Sentry.captureMessage('IndexedDB slow restore', {
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
					}
				}

				return result?.data;
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
					console.log('[IndexedDB] Cleared cache after restore error');
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
