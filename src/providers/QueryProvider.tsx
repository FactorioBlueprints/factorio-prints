import {createSyncStoragePersister}                     from '@tanstack/query-sync-storage-persister';
import {QueryClientProvider}                            from '@tanstack/react-query';
import {ReactQueryDevtools}                             from '@tanstack/react-query-devtools';
import {persistQueryClient}                             from '@tanstack/react-query-persist-client';
import React, {useEffect}                               from 'react';
import useBlueprintCacheSync                            from '../hooks/useBlueprintCacheSync';
import {CACHE_BUSTER, createIDBPersister, STORAGE_KEYS} from '../localStorage';
import {queryClient}                                    from './queryClient';


interface BlueprintCacheSyncProviderProps {
	children: React.ReactNode;
}

function BlueprintCacheSyncProvider({ children }: BlueprintCacheSyncProviderProps)
{
	useBlueprintCacheSync();
	return <>{children}</>;
}


interface QueryProviderProps {
	children: React.ReactNode;
}

function QueryProvider({ children }: QueryProviderProps)
{
	useEffect(() =>
	{
		if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined')
		{
			const idbPersister = createIDBPersister();

			persistQueryClient({
				queryClient: queryClient as any,
				persister  : idbPersister,
				maxAge     : Infinity,
				buster     : CACHE_BUSTER,
			});
		}
		else if (typeof window !== 'undefined' && window.localStorage)
		{
			// Fallback to localStorage if IndexedDB isn't available
			const localStoragePersister = createSyncStoragePersister({
				storage     : window.localStorage,
				key         : STORAGE_KEYS.QUERY_CACHE,
				throttleTime: 1000,
			});

			persistQueryClient({
				queryClient: queryClient as any,
				persister  : localStoragePersister,
				maxAge     : Infinity,
				buster     : CACHE_BUSTER,
			});
		}
	}, []);

	return (
		<QueryClientProvider client={queryClient}>
			<BlueprintCacheSyncProvider>
				{children}
			</BlueprintCacheSyncProvider>
			{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
		</QueryClientProvider>
	);
}


export default QueryProvider;
