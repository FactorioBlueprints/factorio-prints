import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import DocumentTitle          from 'react-document-title';

import {QueryClient, QueryClientProvider} from 'react-query';
import {ReactQueryDevtools}               from 'react-query/devtools';
import {connect}                          from 'react-redux';
import {bindActionCreators}               from 'redux';
import {authStateChanged}                 from '../actions/actionCreators';
import {app}                              from '../base';

import UserContext from '../context/userContext';
import Routes      from './Routes';
import SearchState from './search/SearchState';

// TODO: Add a top-level onError
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			cacheTime: 1000 * 60 * 60 * 1, // 1 hour
			staleTime: 1000 * 60 * 5, // 5 minutes
		},
	},
});
queryClient.getQueryDefaults()

class Root extends PureComponent
{
	static propTypes = forbidExtraProps({
		authStateChanged: PropTypes.func.isRequired,
	});

	constructor(props)
	{
		super(props);
		this.state = {
			user: undefined,
		};
	}

	UNSAFE_componentWillMount()
	{
		app.auth().onAuthStateChanged(
			async (user) =>
			{
				this.props.authStateChanged(user);
				this.setState({user});
			},
			(...args) => console.log('Root.componentWillMount', args),
		);
	}

	render()
	{
		return (
			<QueryClientProvider client={queryClient}>
				<UserContext.Provider value={this.state.user}>
					<DocumentTitle title='Factorio Prints'>
						<SearchState>
							<Routes />
						</SearchState>
					</DocumentTitle>
				</UserContext.Provider>
				<ReactQueryDevtools initialIsOpen />
			</QueryClientProvider>
		);
	}
}

const mapStateToProps = () => ({});

const mapDispatchToProps = dispatch => bindActionCreators({authStateChanged}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(Root);
