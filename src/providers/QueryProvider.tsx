import {createSyncStoragePersister} from '@tanstack/query-sync-storage-persister';
import {QueryClientProvider} from '@tanstack/react-query';
import {ReactQueryDevtools} from '@tanstack/react-query-devtools';
import {persistQueryClient} from '@tanstack/react-query-persist-client';
import * as Sentry from '@sentry/react';
import type React from 'react';
import {useEffect} from 'react';
import useBlueprintCacheSync from '../hooks/useBlueprintCacheSync';
import {useHighWatermarkSync} from '../hooks/useHighWatermarkSync';
import {CACHE_BUSTER, createIDBPersister, STORAGE_KEYS} from '../localStorage';
import {queryClient} from './queryClient';

interface BlueprintCacheSyncProviderProps {
	children: React.ReactNode;
}

function BlueprintCacheSyncProvider({children}: BlueprintCacheSyncProviderProps) {
	useBlueprintCacheSync();
	useHighWatermarkSync();
	return <>{children}</>;
}

interface QueryProviderProps {
	children: React.ReactNode;
}

function QueryProvider({children}: QueryProviderProps) {
	useEffect(() => {
		const initializePersistence = async () => {
			if (typeof window === 'undefined') {
				return;
			}

			// Try IndexedDB first if available
			if (typeof window.indexedDB !== 'undefined') {
				try {
					const idbPersister = createIDBPersister();

					// Validate persister has required methods
					if (idbPersister && typeof idbPersister.restoreClient === 'function') {
						await persistQueryClient({
							queryClient: queryClient as any,
							persister: idbPersister,
							maxAge: Infinity,
							buster: CACHE_BUSTER,
						});

						return; // Successfully initialized IndexedDB persistence
					} else {
						console.error('[QueryProvider] Invalid IDB persister - missing restoreClient method');
						Sentry.captureMessage('Invalid IDB persister - missing restoreClient method', {
							level: 'error',
							tags: {
								component: 'QueryProvider',
								errorType: 'invalid-persister',
							},
						});
					}
				} catch (error) {
					console.warn(
						'[QueryProvider] Failed to initialize IndexedDB persistence, falling back to localStorage:',
						error,
					);
				}
			}

			// Fallback to localStorage
			if (window.localStorage) {
				try {
					// Check if localStorage is actually accessible
					const testKey = '__test_localStorage__';
					window.localStorage.setItem(testKey, 'test');
					window.localStorage.removeItem(testKey);

					const localStoragePersister = createSyncStoragePersister({
						storage: window.localStorage,
						key: STORAGE_KEYS.QUERY_CACHE,
						throttleTime: 1000,
					});

					// Validate persister has required methods
					if (localStoragePersister && typeof localStoragePersister.restoreClient === 'function') {
						await persistQueryClient({
							queryClient: queryClient as any,
							persister: localStoragePersister,
							maxAge: Infinity,
							buster: CACHE_BUSTER,
						});
					} else {
						console.error('[QueryProvider] Invalid localStorage persister - missing restoreClient method');
						Sentry.captureMessage('Invalid localStorage persister - missing restoreClient method', {
							level: 'error',
							tags: {
								component: 'QueryProvider',
								errorType: 'invalid-persister',
							},
						});
					}
				} catch (error) {
					console.error('[QueryProvider] Failed to initialize localStorage persistence:', error);
					Sentry.captureException(error, {
						tags: {
							component: 'QueryProvider',
							errorType: 'localStorage-access',
						},
					});
				}
			}
		};

		initializePersistence().catch((error) => {
			console.error('[QueryProvider] Unexpected error during persistence initialization:', error);
			Sentry.captureException(error, {
				tags: {
					component: 'QueryProvider',
					errorType: 'persistence-init',
				},
			});
		});
	}, []);

	return (
		<QueryClientProvider client={queryClient}>
			<BlueprintCacheSyncProvider>{children}</BlueprintCacheSyncProvider>
			{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
		</QueryClientProvider>
	);
}

export default QueryProvider;
