import {createStore, del, get, set, type UseStore} from 'idb-keyval';

interface StoreConfig {
	dbName: string;
	storeName: string;
}

interface WorkerMessage {
	type: 'set' | 'get' | 'delete' | 'init';
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

declare const self: DedicatedWorkerGlobalScope;

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
	const {type, key, data, id, storeConfig} = e.data;

	try {
		if (!store && storeConfig) {
			try {
				store = createStore(storeConfig.dbName, storeConfig.storeName);
			} catch (storeError) {
				console.error('[IndexedDB Worker] Failed to create store:', storeError);
				throw new Error(
					`Failed to create IndexedDB store: ${storeError instanceof Error ? storeError.message : String(storeError)}`,
				);
			}
		}

		let result: SuccessResult;

		// Ensure store is initialized for operations that need it
		if ((type === 'set' || type === 'get' || type === 'delete') && !store) {
			throw new Error(
				'IndexedDB store not initialized. This may indicate a browser compatibility issue or storage restrictions.',
			);
		}

		switch (type) {
			case 'set':
				if (key === undefined) {
					throw new Error('Key is required for set operation');
				}
				await set(key, data, store);
				result = {success: true};
				break;
			case 'get':
				if (key === undefined) {
					throw new Error('Key is required for get operation');
				}
				result = {success: true, data: await get(key, store)};
				break;
			case 'delete':
				if (key === undefined) {
					throw new Error('Key is required for delete operation');
				}
				await del(key, store);
				result = {success: true};
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
			errorMessage.includes('Failed to execute');

		if (isConnectionClosing) {
			console.warn('[IndexedDB Worker] Database connection issue detected:', type, key, errorMessage);
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
