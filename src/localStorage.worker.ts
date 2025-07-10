import {createStore, get, set, del, UseStore} from 'idb-keyval';

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
	isConnectionClosing: boolean;
}

interface WorkerResponse {
	id?: number;
	result?: SuccessResult;
	error?: ErrorResult;
	success: boolean;
}

let store: UseStore | undefined;

interface WorkerGlobalScope {
	onmessage: ((this: WorkerGlobalScope, ev: MessageEvent<WorkerMessage>) => any) | null;
	postMessage(message: WorkerResponse): void;
}

declare const self: WorkerGlobalScope;

self.onmessage = async function (e: MessageEvent<WorkerMessage>): Promise<void> {
	const {type, key, data, id, storeConfig} = e.data;

	try {
		if (!store && storeConfig) {
			store = createStore(storeConfig.dbName, storeConfig.storeName);
		}

		let result: SuccessResult;

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
			errorMessage.includes('database connection is closing') || errorMessage.includes('IDBDatabase');

		if (isConnectionClosing) {
			console.warn('[IndexedDB Worker] Database connection closing, operation skipped:', type, key);
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
