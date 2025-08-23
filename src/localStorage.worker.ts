import {createStore, del, get, set, type UseStore} from 'idb-keyval';

interface StoreConfig {
	dbName: string;
	storeName: string;
}

interface WorkerMessage {
	type: 'set' | 'get' | 'delete' | 'init' | 'healthCheck';
	key?: string;
	data?: any;
	id?: number;
	storeConfig?: StoreConfig;
}

interface SuccessResult {
	success: true;
	data?: any;
}

interface ErrorResult {
	message: string;
	stack?: string;
	isConnectionClosing?: boolean;
	isUncaught?: boolean;
	isUnhandledRejection?: boolean;
	details?: any;
	reason?: string;
}

interface WorkerResponse {
	id?: number;
	result?: SuccessResult;
	error?: ErrorResult;
	success: boolean;
	type?: 'error';
}

let store: UseStore | undefined;
let storeConfig: StoreConfig | undefined;
let isStoreInitialized = false;

declare const self: DedicatedWorkerGlobalScope;

function resetStore() {
	store = undefined;
	isStoreInitialized = false;
	console.log('[IndexedDB Worker] Store reset for reconnection');
}

async function initializeStore(): Promise<void> {
	if (!storeConfig) {
		throw new Error('Store configuration not provided');
	}

	try {
		store = createStore(storeConfig.dbName, storeConfig.storeName);
		isStoreInitialized = true;
		console.log('[IndexedDB Worker] Store initialized successfully');
	} catch (error) {
		console.error('[IndexedDB Worker] Failed to initialize store:', error);
		throw new Error(`Failed to create IndexedDB store: ${error instanceof Error ? error.message : String(error)}`);
	}
}

async function ensureStoreConnection(): Promise<void> {
	if (!isStoreInitialized || !store) {
		await initializeStore();
	}
}

// Global error handler for uncaught errors in the worker
self.addEventListener('error', (event: ErrorEvent) => {
	console.error('[IndexedDB Worker] Uncaught error:', event);

	const errorInfo = {
		message: event.message || 'Unknown error',
		filename: event.filename,
		lineno: event.lineno,
		colno: event.colno,
		error: event.error ? String(event.error) : undefined,
		stack: event.error?.stack,
	};

	// Send error info to main thread for proper logging
	self.postMessage({
		type: 'error',
		error: {
			message: `Uncaught worker error: ${errorInfo.message}`,
			stack: errorInfo.stack,
			isUncaught: true,
			details: errorInfo,
		},
		success: false,
	});
});

// Global handler for unhandled promise rejections in the worker
self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
	console.error('[IndexedDB Worker] Unhandled promise rejection:', event.reason);

	const errorMessage = event.reason instanceof Error ? event.reason.message : String(event.reason);

	const errorStack = event.reason instanceof Error ? event.reason.stack : undefined;

	// Send error info to main thread for proper logging
	self.postMessage({
		type: 'error',
		error: {
			message: `Unhandled promise rejection: ${errorMessage}`,
			stack: errorStack,
			isUnhandledRejection: true,
			reason: String(event.reason),
		},
		success: false,
	});
});

self.onmessage = async (e: MessageEvent<WorkerMessage>): Promise<void> => {
	const {type, key, data: requestData, id} = e.data;

	try {
		if (type === 'init' && e.data.storeConfig) {
			if (!storeConfig) {
				storeConfig = e.data.storeConfig;
			}
			await initializeStore();
			const response: WorkerResponse = {id, result: {success: true}, success: true};
			self.postMessage(response);
			return;
		}

		let result: SuccessResult;

		// Ensure store is initialized for operations that need it
		if (type === 'set' || type === 'get' || type === 'delete' || type === 'healthCheck') {
			await ensureStoreConnection();
			if (!store) {
				throw new Error(
					'IndexedDB store not initialized. This may indicate a browser compatibility issue or storage restrictions.',
				);
			}
		}

		switch (type) {
			case 'set':
				if (key === undefined) {
					throw new Error('Key is required for set operation');
				}
				await set(key, requestData, store);
				result = {success: true};
				break;
			case 'get':
				if (key === undefined) {
					throw new Error('Key is required for get operation');
				}
				const getStart = Date.now();
				const data = await get(key, store);
				const getDuration = Date.now() - getStart;

				if (getDuration > 1000 && data) {
					const dataSize =
						typeof data === 'object' && data.data ? data.data.length : JSON.stringify(data).length;
					console.log(
						`[IndexedDB Worker] Slow read detected: ${getDuration}ms for ${(dataSize / 1024).toFixed(2)}KB`,
					);
				}

				result = {success: true, data};
				break;
			case 'delete':
				if (key === undefined) {
					throw new Error('Key is required for delete operation');
				}
				await del(key, store);
				result = {success: true};
				break;
			case 'healthCheck':
				// Perform a simple operation to check connection health
				try {
					const testKey = '__health_check__';
					await set(testKey, Date.now(), store);
					await del(testKey, store);
					result = {success: true, data: 'healthy'};
				} catch (healthError) {
					console.warn('[IndexedDB Worker] Health check failed:', healthError);
					resetStore();
					throw new Error('Health check failed - connection may be lost');
				}
				break;
			default:
				throw new Error('Unknown operation type');
		}

		const response: WorkerResponse = {id, result, success: true};
		self.postMessage(response);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const errorStack = error instanceof Error ? error.stack : undefined;

		const isConnectionClosing =
			errorMessage.includes('database connection is closing') ||
			errorMessage.includes('IDBDatabase') ||
			errorMessage.includes('backing store') ||
			errorMessage.includes('Connection to Indexed Database server lost') ||
			errorMessage.includes('InvalidStateError') ||
			errorMessage.includes('Failed to execute') ||
			errorMessage.includes('TransactionInactiveError') ||
			errorMessage.includes('AbortError');

		if (isConnectionClosing) {
			console.warn('[IndexedDB Worker] Database connection issue detected:', type, key, errorMessage);
			// Reset the store to force reconnection on next operation
			resetStore();
		}

		const response: WorkerResponse = {
			id,
			error: {
				message: errorMessage,
				stack: errorStack,
				isConnectionClosing,
			},
			success: false,
		};
		self.postMessage(response);
	}
};
