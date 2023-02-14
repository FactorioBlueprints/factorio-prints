import {forbidExtraProps} from 'airbnb-prop-types';
import React              from 'react';
import {Helmet}           from 'react-helmet';

import {QueryClient, QueryClientProvider} from 'react-query';
import {ReactQueryDevtools}               from 'react-query/devtools';
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

// TODO: Add a top-level onError
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			cacheTime: 1000 * 60 * 60 * 1, // 1 hour
			staleTime: 1000 * 60 * 5, // 5 minutes
			retry: (failureCount, error: any) => error?.response?.status !== 410 && failureCount < 2
		},
	},
});

function Root()
{
	return (
		<QueryClientProvider client={queryClient}>
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
							<Route element={<NoMatch />} />
						</Routes>
					</QueryParamProvider>
				</BrowserRouter>
			</UserState>
			<ReactQueryDevtools initialIsOpen />
		</QueryClientProvider>
	);
}

Root.propTypes = forbidExtraProps({});

export default Root;
