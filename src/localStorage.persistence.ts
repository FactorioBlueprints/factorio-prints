import {del, get, set, type UseStore} from 'idb-keyval';
import {
	compressForStorageWithMetadata,
	decompressFromStorageWithMetadata,
	checkStorageQuota,
	type StoredData,
} from './utils/dataCompression';

export interface PersistResult {
	success: boolean;
	data:
		| {
				status: 'persisted';
				compressed: boolean;
				originalSize: number;
				storedSize: number;
		  }
		| {
				status: 'unchanged';
		  }
		| {
				status: 'insufficient-storage';
				requiredSize: number;
				availableSize: number;
				usedSize: number;
		  };
}

export interface RestoreResult {
	success: true;
	data?: {
		client: unknown;
		compressed: boolean;
		originalSize: number;
		storedSize: number;
	};
}

function extractPersistedQueryData(client: any): unknown {
	if (!client?.clientState) {
		return client;
	}

	return {
		queries: client.clientState.queries?.map((query: any) => ({
			queryKey: query.queryKey,
			queryHash: query.queryHash,
			data: query.state?.data,
			...(query.state?.error ? {error: query.state.error} : {}),
		})),
		mutations: client.clientState.mutations?.map((mutation: any) => ({
			mutationKey: mutation.mutationKey,
			state: mutation.state?.status,
			data: mutation.state?.data,
			error: mutation.state?.error,
		})),
	};
}

function createPersistenceFingerprint(client: unknown): string {
	return JSON.stringify(extractPersistedQueryData(client));
}

export class PersistenceStore {
	private lastPersistedFingerprint: string | undefined;

	constructor(private readonly store: UseStore) {}

	async persist(key: string, client: unknown): Promise<PersistResult> {
		const fingerprint = createPersistenceFingerprint(client);
		if (fingerprint === this.lastPersistedFingerprint) {
			return {
				success: true,
				data: {status: 'unchanged'},
			};
		}

		const {storedData, originalSize} = compressForStorageWithMetadata(client);
		const storedSize = storedData.data.length;
		const quota = await checkStorageQuota(storedSize);

		if (!quota.hasSpace) {
			await del(key, this.store);
			this.lastPersistedFingerprint = undefined;
			const quotaAfterClear = await checkStorageQuota(storedSize);
			if (!quotaAfterClear.hasSpace) {
				return {
					success: false,
					data: {
						status: 'insufficient-storage',
						requiredSize: storedSize,
						availableSize: quotaAfterClear.available ?? 0,
						usedSize: quotaAfterClear.used ?? 0,
					},
				};
			}
		}

		await set(key, storedData, this.store);
		this.lastPersistedFingerprint = fingerprint;

		return {
			success: true,
			data: {
				status: 'persisted',
				compressed: storedData.compressed,
				originalSize,
				storedSize,
			},
		};
	}

	async restore(key: string): Promise<RestoreResult> {
		const storedData = (await get(key, this.store)) as StoredData | unknown;
		if (storedData === undefined) {
			return {success: true};
		}

		const restored = decompressFromStorageWithMetadata(storedData);
		this.lastPersistedFingerprint = createPersistenceFingerprint(restored.data);

		return {
			success: true,
			data: {
				client: restored.data,
				compressed: restored.compressed,
				originalSize: restored.originalSize,
				storedSize: restored.storedSize,
			},
		};
	}

	async delete(key: string): Promise<void> {
		await del(key, this.store);
		this.lastPersistedFingerprint = undefined;
	}
}
