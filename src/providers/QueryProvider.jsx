import {createSyncStoragePersister}                     from '@tanstack/query-sync-storage-persister';
import {QueryCache, QueryClient, QueryClientProvider}   from '@tanstack/react-query';
import {ReactQueryDevtools}                             from '@tanstack/react-query-devtools';
import {persistQueryClient, removeOldestQuery}          from '@tanstack/react-query-persist-client';
import PropTypes                                        from 'prop-types';
import React, {useEffect}                               from 'react';
import useBlueprintCacheSync                            from '../hooks/useBlueprintCacheSync';
import {CACHE_BUSTER, createIDBPersister, STORAGE_KEYS} from '../localStorage';

const queryCache = new QueryCache({
	onSuccess: (data, query) =>
	{
		if (query.queryKey[0] === 'rawPaginatedBlueprintSummaries' && data?.pages)
		{
			data.pages.forEach(page =>
			{
				Object.entries(page.data).forEach(([blueprintId, summary]) =>
				{
					queryClient.setQueryData(
						['blueprintSummaries', 'blueprintId', blueprintId],
						summary,
					);
				});
			});
		}
	},
});

const queryClient = new QueryClient({
	queryCache,
	defaultOptions: {
		queries: {
			staleTime           : 1000 * 60 * 60,
			refetchOnWindowFocus: true,
			refetchOnMount      : true,
			retry               : 1,
			gcTime              : Infinity,
		},
		mutations: {
			retry: 1,
		},
	},
});

function BlueprintCacheSyncProvider({ children })
{
	useBlueprintCacheSync();
	return <>{children}</>;
}

BlueprintCacheSyncProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

function QueryProvider({ children })
{
	useEffect(() =>
	{
		if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined')
		{
			const idbPersister = createIDBPersister();

			persistQueryClient({
				queryClient,
				persister: idbPersister,
				maxAge   : Infinity,
				buster   : CACHE_BUSTER,
				retry    : removeOldestQuery,
			});
		}
		else if (typeof window !== 'undefined' && window.localStorage)
		{
			// Fallback to localStorage if IndexedDB isn't available
			const localStoragePersister = createSyncStoragePersister({
				storage     : window.localStorage,
				key         : STORAGE_KEYS.QUERY_CACHE,
				throttleTime: 1000,
				retry       : removeOldestQuery,
			});

			persistQueryClient({
				queryClient,
				persister: localStoragePersister,
				maxAge   : Infinity,
				buster   : CACHE_BUSTER,
				retry    : removeOldestQuery,
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

QueryProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

export default QueryProvider;
