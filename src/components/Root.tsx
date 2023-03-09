import {forbidExtraProps} from 'airbnb-prop-types';
import React              from 'react';
import {Helmet}           from 'react-helmet';

import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ReactQueryDevtools}               from '@tanstack/react-query-devtools';
import { persistQueryClient, removeOldestQuery } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'

import {BrowserRouter, Route, Routes}     from 'react-router-dom';
import { QueryParamProvider } from 'use-query-params';
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';

import Account                from './Account';
import Chat                   from './Chat';
import EfficientEditBlueprint from './EfficientEditBlueprint';
import BlueprintGrid          from './grid/BlueprintGrid';
import MostFavoritedGrid      from './grid/MostFavoritedGrid';
import MyFavoritesGrid        from './grid/MyFavoritesGrid';
import UserGrid               from './grid/UserGrid';
import Header                 from './Header';
import Intro                  from './Intro';
import NoMatch                from './NoMatch';
import ScrollToTop            from './ScrollToTop';
import SingleBlueprint        from './single/EfficientSingleBlueprint';
import UserState              from './user/UserState';
import DuplicateBlueprintGrid from "./grid/DuplicateBlueprintGrid";
import Contributors from "./Contributors";
import Search       from "./search/Search";

// TODO: Add a top-level onError
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			cacheTime: 1000 * 60 * 60 * 24, // 24 hours
			staleTime: 1000 * 60 * 60 * 1, // 1 hour
			retry: (failureCount, error: any) => error?.response?.status !== 410 && failureCount < 2,
			refetchOnMount: true,
			refetchOnWindowFocus: true,
			refetchOnReconnect: true,
		},
	},
});

const localStoragePersister = createSyncStoragePersister({
	storage: window.localStorage,
	retry: removeOldestQuery
})

function Root()
{
	return (
		<PersistQueryClientProvider client={queryClient} persistOptions={{ persister: localStoragePersister }}>
			<Helmet>
				<title>Factorio Prints</title>
			</Helmet>
			<UserState>
				<BrowserRouter>
					<QueryParamProvider adapter={ReactRouter6Adapter}>
						<ScrollToTop />
						<Header />
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
					</QueryParamProvider>
				</BrowserRouter>
			</UserState>
			<ReactQueryDevtools initialIsOpen />
		</PersistQueryClientProvider>
	);
}

Root.propTypes = forbidExtraProps({});

export default Root;
