import {forbidExtraProps}             from 'airbnb-prop-types';
import PropTypes                      from 'prop-types';
import React, {PureComponent}         from 'react';
import DocumentTitle                  from 'react-document-title';
import {connect}                      from 'react-redux';
import {BrowserRouter, Route, Switch} from 'react-router-dom';
import {bindActionCreators}           from 'redux';

import {authStateChanged} from '../actions/actionCreators';
import {app}              from '../base';
import Account            from './Account';

import BlueprintGrid     from './BlueprintGrid';
import Contact           from './Contact';
import Header            from './Header';
import Intro             from './Intro';
import MostFavoritedGrid from './MostFavoritedGrid';
import FavoritesGrid     from './MyFavoritesGrid';
import NoMatch           from './NoMatch';
import SingleBlueprint   from './SingleBlueprint';
import UserGrid          from './UserGrid';

class Root extends PureComponent
{
	static propTypes = forbidExtraProps({
		authStateChanged: PropTypes.func.isRequired,
	});

	UNSAFE_componentWillMount()
	{
		app.auth().onAuthStateChanged(
			async (user) =>
			{
				if (!user)
				{
					this.props.authStateChanged(user, null);
					return;
				}

				const idToken = await user.getIdToken();
				this.props.authStateChanged(user, idToken);
			},
			(...args) => console.log('Root.componentWillMount', args)
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
			<DocumentTitle title='Factorio Prints'>
				<BrowserRouter>
					<div>
						<Route path='/ui' component={Header} />
						<Switch>
							<Route path='/ui/' exact render={this.renderIntro} />
							<Route path='/ui/blueprints' exact component={BlueprintGrid} />
							<Route path='/ui/top' exact component={MostFavoritedGrid} />
							<Route path='/ui/favorites' exact component={FavoritesGrid} />
							<Route path='/ui/contact' exact component={Contact} />
							<Route path='/ui/account' exact component={Account} />
							<Route path='/ui/view/:blueprintId' component={SingleBlueprint} />
							<Route path='/ui/user/:userId' component={UserGrid} />
							<Route path='/ui/tagged/:tag' render={this.renderTag} />
							<Route component={NoMatch} />
						</Switch>
					</div>
				</BrowserRouter>
			</DocumentTitle>
		);
	}
}

const mapStateToProps = () => ({});

const mapDispatchToProps = dispatch => bindActionCreators({authStateChanged}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(Root);
