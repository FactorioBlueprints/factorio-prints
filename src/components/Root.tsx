import {forbidExtraProps} from 'airbnb-prop-types';
import React              from 'react';
import {Helmet}           from 'react-helmet';

import {QueryClient, QueryClientProvider} from 'react-query';
import {ReactQueryDevtools}               from 'react-query/devtools';
import {BrowserRouter, Route, Routes}     from 'react-router-dom';

import Account                from './Account';
import Contact                from './Contact';
import EfficientEditBlueprint from './EfficientEditBlueprint';
import BlueprintGrid          from './grid/BlueprintGrid';
import MostFavoritedGrid      from './grid/MostFavoritedGrid';
import MyFavoritesGrid        from './grid/MyFavoritesGrid';
import UserGrid               from './grid/UserGrid';
import Header                 from './Header';
import Intro                  from './Intro';
import NoMatch                from './NoMatch';
import ScrollToTop            from './ScrollToTop';
import SearchState            from './search/SearchState';
import SingleBlueprint        from './single/EfficientSingleBlueprint';
import UserState              from './user/UserState';

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
				<SearchState>
					<BrowserRouter>
						<ScrollToTop />
						<Header />
						<Routes>
							<Route path='/' element={<div><Intro /><BlueprintGrid /></div>} />
							<Route path='/blueprints' element={<BlueprintGrid />} />
							<Route path='/top' element={<MostFavoritedGrid />} />
							{/* <Route path='/create' element={<Create />} /> */}
							<Route path='/favorites' element={<MyFavoritesGrid />} />
							<Route path='/contact' element={<Contact />} />
							<Route path='/account' element={<Account />} />
							<Route path='/view/:blueprintId' element={<SingleBlueprint />} />
							<Route path='/edit/:blueprintId' element={<EfficientEditBlueprint />} />
							<Route path='/user/:userId' element={<UserGrid />} />
							<Route element={<NoMatch />} />
						</Routes>
					</BrowserRouter>
				</SearchState>
			</UserState>
			<ReactQueryDevtools initialIsOpen />
		</QueryClientProvider>
	);
}

Root.propTypes = forbidExtraProps({});

export default Root;
