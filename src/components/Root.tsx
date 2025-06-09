import {forbidExtraProps} from 'airbnb-prop-types';
import React              from 'react';
import {Helmet}           from 'react-helmet';

import {QueryClient}                                   from '@tanstack/react-query';
import {ReactQueryDevtools}                            from '@tanstack/react-query-devtools';
import {PersistQueryClientProvider, removeOldestQuery} from '@tanstack/react-query-persist-client';
import {createSyncStoragePersister}                    from '@tanstack/query-sync-storage-persister';

import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {QueryParamProvider}           from 'use-query-params';
import {ReactRouter6Adapter}          from 'use-query-params/adapters/react-router-6';

import Header      from './Header';
import ScrollToTop from './ScrollToTop';
import UserState   from './user/UserState';

import { Suspense } from "react";



const Account                = React.lazy(() => import('./Account'));
const BlueprintGrid          = React.lazy(() => import('./grid/BlueprintGrid'));
const Chat                   = React.lazy(() => import('./Chat'));
const Contributors           = React.lazy(() => import('./Contributors'));
const DuplicateBlueprintGrid = React.lazy(() => import('./grid/DuplicateBlueprintGrid'));
const EfficientEditBlueprint = React.lazy(() => import('./EfficientEditBlueprint'));
const Intro                  = React.lazy(() => import('./Intro'));
const MostFavoritedGrid      = React.lazy(() => import('./grid/MostFavoritedGrid'));
const MyFavoritesGrid        = React.lazy(() => import('./grid/MyFavoritesGrid'));
const NoMatch                = React.lazy(() => import('./NoMatch'));
const Search                 = React.lazy(() => import('./search/Search'));
const SingleBlueprint        = React.lazy(() => import('./single/EfficientSingleBlueprint'));
const UserGrid               = React.lazy(() => import('./grid/UserGrid'));

// TODO: Add a top-level onError
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime              : 1000 * 60 * 60 * 24, // 24 hours
			staleTime           : 1000 * 60 * 60 * 1, // 1 hour
			retry               : (failureCount, error: any) => error?.response?.status !== 410 && failureCount < 2,
			refetchOnMount      : true,
			refetchOnWindowFocus: true,
			refetchOnReconnect  : true,
		},
	},
});

const localStoragePersister = createSyncStoragePersister({
	storage: window.localStorage,
	retry  : removeOldestQuery
});

function Root()
{
	return (
		<PersistQueryClientProvider client={queryClient} persistOptions={{persister: localStoragePersister}}>
			<Helmet>
				<title>Factorio Prints</title>
			</Helmet>
			<UserState>
				<BrowserRouter>
					<QueryParamProvider adapter={ReactRouter6Adapter}>
						<ScrollToTop />
						<Header />
						<Suspense fallback={<div>Loading...</div>}>
							<Routes>
								<Route path='/' element={<div><Intro /><BlueprintGrid /></div>} />
								<Route path='/blueprints' element={<BlueprintGrid />} />
								<Route path='/duplicates' element={<DuplicateBlueprintGrid />} />
								<Route path='/top' element={<MostFavoritedGrid />} />
								{/* <Route path='/create' element={<Create />} /> */}
								<Route path='/favorites' element={<MyFavoritesGrid />} />
								<Route path='/chat' element={<Chat />} />
								<Route path='/account' element={<Account />} />
								<Route path='/view/:blueprintId' element={<SingleBlueprint />} />
								<Route path='/edit/:blueprintId' element={<EfficientEditBlueprint />} />
								<Route path='/user/:userId' element={<UserGrid />} />
								<Route path='/contributors' element={<Contributors />} />
								<Route path='/search' element={<Search />} />
								<Route element={<NoMatch />} />
							</Routes>
						</Suspense>
					</QueryParamProvider>
				</BrowserRouter>
			</UserState>
			<ReactQueryDevtools initialIsOpen />
		</PersistQueryClientProvider>
	);
}

Root.propTypes = forbidExtraProps({});

export default Root;
