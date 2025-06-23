import { createStore, get, set, del } from 'idb-keyval';

export const STORAGE_KEYS = {
	QUERY_CACHE: 'FACTORIO_PRINTS_QUERY_CACHE',
	CREATE_FORM: 'factorio-blueprint-create-form',
};

/**
 * Cache buster for query persistence. Manually increment this number when making changes that break cache compatibility.
 */
export const CACHE_BUSTER = '5';

export const indexedDbStore = createStore('factorio-prints-db', 'query-cache-store');

function debounce(func, wait, options = {})
{
	let lastArgs; let lastThis; let maxWait; let result; let timerId; let lastCallTime;
	let lastInvokeTime = 0;
	let leading = !!options.leading;
	let trailing = 'trailing' in options ? !!options.trailing : true;
	let maxing = 'maxWait' in options;
	maxWait = maxing ? Math.max(options.maxWait || 0, wait) : 0;

	function invokeFunc(time)
	{
		const args = lastArgs;
		const thisArg = lastThis;

		lastArgs = lastThis = undefined;
		lastInvokeTime = time;
		result = func.apply(thisArg, args);
		return result;
	}

	function startTimer(pendingFunc, wait)
	{
		return setTimeout(pendingFunc, wait);
	}

	function cancelTimer(id)
	{
		clearTimeout(id);
	}

	function shouldInvoke(time)
	{
		const timeSinceLastCall = time - lastCallTime;
		const timeSinceLastInvoke = time - lastInvokeTime;

		return (lastCallTime === undefined || timeSinceLastCall >= wait
			|| timeSinceLastCall < 0 || (maxing && timeSinceLastInvoke >= maxWait));
	}

	function trailingEdge(time)
	{
		timerId = undefined;

		if (trailing && lastArgs)
		{
			return invokeFunc(time);
		}
		lastArgs = lastThis = undefined;
		return result;
	}

	function leadingEdge(time)
	{
		lastInvokeTime = time;
		timerId = startTimer(timerExpired, wait);
		return leading ? invokeFunc(time) : result;
	}

	function remainingWait(time)
	{
		const timeSinceLastCall = time - lastCallTime;
		const timeSinceLastInvoke = time - lastInvokeTime;
		const timeWaiting = wait - timeSinceLastCall;

		return maxing
			? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
			: timeWaiting;
	}

	function timerExpired()
	{
		const time = Date.now();

		if (shouldInvoke(time))
		{
			return trailingEdge(time);
		}

		timerId = startTimer(timerExpired, remainingWait(time));
	}

	function debounced(...args)
	{
		const time = Date.now();
		const isInvoking = shouldInvoke(time);

		lastArgs = args;
		lastThis = this;
		lastCallTime = time;

		if (isInvoking)
		{
			if (timerId === undefined)
			{
				return leadingEdge(lastCallTime);
			}
			if (maxing)
			{
				timerId = startTimer(timerExpired, wait);
				return invokeFunc(lastCallTime);
			}
		}
		if (timerId === undefined)
		{
			timerId = startTimer(timerExpired, wait);
		}
		return result;
	}

	debounced.cancel = function()
	{
		if (timerId !== undefined)
		{
			cancelTimer(timerId);
		}
		lastInvokeTime = 0;
		lastArgs = lastCallTime = lastThis = timerId = undefined;
	};

	debounced.flush = function()
	{
		return timerId === undefined ? result : trailingEdge(Date.now());
	};

	debounced.pending = function()
	{
		return timerId !== undefined;
	};

	return debounced;
}

const workerCode = `
  let idbKeyval;
  let createStore, get, set, del;
  let store;
  let idbAvailable = false;

  try {
    importScripts('https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js');
    ({ createStore, get, set, del } = idbKeyval);
    idbAvailable = true;
  } catch (error) {
    console.error('[Worker] Failed to load idb-keyval from CDN:', error);
  }

  self.onmessage = async function(e) {
    const { type, key, data, id, storeConfig } = e.data;

    if (!idbAvailable) {
      self.postMessage({
        id,
        error: { message: 'idb-keyval not available in worker', fallback: true },
        success: false
      });
      return;
    }

    try {
      // Initialize store if needed
      if (!store && storeConfig) {
        store = createStore(storeConfig.dbName, storeConfig.storeName);
      }

      let result;

      switch (type) {
        case 'set':
          await set(key, data, store);
          result = { success: true };
          break;
        case 'get':
          result = { data: await get(key, store) };
          break;
        case 'delete':
          await del(key, store);
          result = { success: true };
          break;
        default:
          throw new Error('Unknown operation type');
      }

      self.postMessage({ id, result, success: true });
    } catch (error) {
      self.postMessage({
        id,
        error: { message: error.message, stack: error.stack },
        success: false
      });
    }
  };
`;

const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);

let worker;
let operationCounter = 0;
const pendingOperations = new Map();

function getWorker()
{
	if (!worker)
	{
		try
		{
			worker = new Worker(workerUrl);

			worker.onerror = (error) =>
			{
				console.error('[IndexedDB Worker] Failed to initialize worker:', error);
				worker = null;
			};

			worker.onmessage = (e) =>
			{
				const { id, result, error, success } = e.data;
				const pendingOp = pendingOperations.get(id);

				if (pendingOp)
				{
					if (success)
					{
						pendingOp.resolve(result);
					}
					else
					{
						if (error.fallback)
						{
							console.warn('[IndexedDB Worker] idb-keyval CDN failed, falling back to direct usage');
							worker = null;
						}
						pendingOp.reject(new Error(error.message));
					}
					pendingOperations.delete(id);
				}
			};

			// Initialize store in worker
			worker.postMessage({
				type       : 'init',
				storeConfig: {
					dbName   : 'factorio-prints-db',
					storeName: 'query-cache-store',
				},
			});
		}
		catch (error)
		{
			console.error('[IndexedDB Worker] Failed to create worker:', error);
			worker = null;
		}
	}

	return worker;
}

async function workerOperation(type, key, data = null)
{
	const worker = getWorker();

	// Fallback to direct idb-keyval if worker fails
	if (!worker)
	{
		switch (type)
		{
			case 'set':
				await set(key, data, indexedDbStore);
				return { success: true };
			case 'get':
				return { data: await get(key, indexedDbStore) };
			case 'delete':
				await del(key, indexedDbStore);
				return { success: true };
			default:
				throw new Error('Unknown operation type');
		}
	}

	return new Promise((resolve, reject) =>
	{
		const id = operationCounter++;

		pendingOperations.set(id, { resolve, reject });

		worker.postMessage({ type, key, data, id });
	});
}

function formatBytes(bytes)
{
	if (bytes > 1024 * 1024)
	{
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}
	else if (bytes > 1024)
	{
		return `${(bytes / 1024).toFixed(2)} KB`;
	}
	else
	{
		return `${bytes} bytes`;
	}
}

export function createIDBPersister(idbValidKey = STORAGE_KEYS.QUERY_CACHE)
{
	// Create a debounced persist function that waits 2 seconds after changes
	// and limits executions to once every 10 seconds maximum
	const debouncedPersist = debounce(async (client) =>
	{
		try
		{
			const dataSize = JSON.stringify(client).length;
			const formattedSize = formatBytes(dataSize);
			console.log(`[IndexedDB] Persisting client data of size: ${formattedSize}`);

			await workerOperation('set', idbValidKey, client);

			console.log('[IndexedDB] Persistence complete');
		}
		catch (error)
		{
			console.error('[IndexedDB] Error persisting to IndexedDB:', error);
			throw error;
		}
	}, 2000, { maxWait: 10000 });

	return {
		persistClient: async (client) =>
		{
			// Use the debounced version for persistence
			return debouncedPersist(client);
		},
		restoreClient: async () =>
		{
			try
			{
				const result = await workerOperation('get', idbValidKey);

				if (result?.data)
				{
					const dataSize = JSON.stringify(result.data).length;
					const formattedSize = formatBytes(dataSize);
					console.log(`[IndexedDB] Restored data size: ${formattedSize}`);
				}

				return result?.data;
			}
			catch (error)
			{
				console.error('[IndexedDB] Error restoring from IndexedDB:', error);
				return undefined;
			}
		},
		removeClient: async () =>
		{
			try
			{
				await workerOperation('delete', idbValidKey);
			}
			catch (error)
			{
				console.error('[IndexedDB] Error removing from IndexedDB:', error);
			}
		},
	};
}

export const saveToStorage = (key, data) =>
{
	try
	{
		const serializedData = JSON.stringify(data);
		localStorage.setItem(key, serializedData);
		return true;
	}
	catch (error)
	{
		console.error('Error saving to localStorage:', error);
		return false;
	}
};

export const loadFromStorage = (key, defaultValue = null) =>
{
	try
	{
		const serializedData = localStorage.getItem(key);
		if (serializedData === null)
		{
			return defaultValue;
		}
		return JSON.parse(serializedData);
	}
	catch (error)
	{
		console.error('Error loading from localStorage:', error);
		return defaultValue;
	}
};

export const removeFromStorage = (key) =>
{
	try
	{
		localStorage.removeItem(key);
	}
	catch (error)
	{
		console.error('Error removing from localStorage:', error);
	}
};
