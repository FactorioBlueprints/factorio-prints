import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import DocumentTitle          from 'react-document-title';

import {QueryClient, QueryClientProvider} from 'react-query';
import {ReactQueryDevtools}               from 'react-query/devtools';
import {connect}                          from 'react-redux';
import {BrowserRouter, Route, Switch}     from 'react-router-dom';
import {bindActionCreators}               from 'redux';

import UserContext        from '../context/userContext';
import {authStateChanged} from '../actions/actionCreators';
import {app}              from '../base';

import Account           from './Account';
import BlueprintGrid     from './BlueprintGrid';
import BlueprintTitles   from './BlueprintTitles';
import Contact           from './Contact';
import Create            from './Create';
import EditBlueprint     from './EditBlueprint';
import Header            from './Header';
import Intro             from './Intro';
import MostFavoritedGrid from './MostFavoritedGrid';
import FavoritesGrid     from './MyFavoritesGrid';
import NoMatch           from './NoMatch';
import SingleBlueprint   from './SingleBlueprint';
import UserGrid          from './UserGrid';

const queryClient = new QueryClient();

class Root extends PureComponent
{
	static propTypes = forbidExtraProps({
		authStateChanged: PropTypes.func.isRequired,
	});

	constructor(props)
	{
		super(props);
		this.state = {
			idToken: undefined,
		};
	}

	UNSAFE_componentWillMount()
	{
		app.auth().onAuthStateChanged(
			async (user) =>
			{
				if (!user)
				{
					this.props.authStateChanged(user, null);
					this.setState({idToken: undefined});
					return;
				}

				const idToken = await user.getIdToken();
				this.props.authStateChanged(user, idToken);
				this.setState({idToken});
			},
			(...args) => console.log('Root.componentWillMount', args),
		);
	}

	renderIntro = () => (
		<div>
			<Intro />
			<BlueprintGrid />
		</div>
	);

	renderTag   = (props) =>
	{
		const {pathname} = props.location;
		const tagId      = pathname.replace(/^\/tagged/, '');

		return <BlueprintGrid initialTag={tagId} />;
	};

	render()
	{
		return (
			<QueryClientProvider client={queryClient}>
				<UserContext.Provider value={{idToken: this.state.idToken}}>
					<DocumentTitle title='Factorio Prints'>
						<BrowserRouter>
							<div>
								<Route path='/' component={Header} />
								<Switch>
									<Route path='/' exact render={this.renderIntro} />
									<Route path='/blueprints' exact component={BlueprintGrid} />
									<Route path='/top' exact component={MostFavoritedGrid} />
									<Route path='/create' exact component={Create} />
									<Route path='/favorites' exact component={FavoritesGrid} />
									<Route path='/contact' exact component={Contact} />
									<Route path='/account' exact component={Account} />
									<Route path='/view/:blueprintId' component={SingleBlueprint} />
									<Route path='/edit/:blueprintId' component={EditBlueprint} />
									<Route path='/titles/:blueprintKey' component={BlueprintTitles} />
									<Route path='/user/:userId' component={UserGrid} />
									<Route path='/tagged/:tag' render={this.renderTag} />
									<Route component={NoMatch} />
								</Switch>
							</div>
						</BrowserRouter>
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
