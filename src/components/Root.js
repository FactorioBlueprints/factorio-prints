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

import BlueprintGrid from './BlueprintGrid';
import Chat          from './Chat';
import Create        from './Create';
import EditBlueprint from './EditBlueprint';
import Header        from './Header';
import Intro         from './Intro';
import KnownIssues   from './KnownIssues';
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

	componentDidMount()
	{
		app.auth().onAuthStateChanged(
			(user) =>
			{
				if (user)
				{
					const {uid, email, photoURL, emailVerified, providerData} = user;

					const providerId          = providerData && providerData.length && providerData[0].providerId;
					const providerDisplayName = providerId ? providerData[0].displayName : undefined;

					const buildUserInformation = (existingUser) =>
					{
						const existingUserInitialized = existingUser || {};
						const displayName             = existingUserInitialized.displayName || providerDisplayName;
						return {
							...existingUserInitialized,
							displayName,
							providerDisplayName,
							photoURL,
							email,
							emailVerified,
							providerId,
						};
					};

					app.database()
						.ref(`/users/${uid}/`)
						.transaction(buildUserInformation);
				}
				this.props.authStateChanged(user);
			},
			(...args) => console.log('Root.componentDidMount', args)
		);
	}

	renderIntro = () => (
		<div>
			<KnownIssues />
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
						<Route path='/' render={() => <Header />} />
						<Switch>
							<Route path='/' exact render={this.renderIntro} />
							<Route path='/blueprints' exact render={props => <BlueprintGrid {...props} />} />
							<Route path='/top' exact render={props => <MostFavoritedGrid {...props} />} />
							<Route path='/create' exact render={props => <Create {...props} />} />
							<Route path='/favorites' exact render={props => <FavoritesGrid {...props} />} />
							<Route path='/knownIssues' exact render={props => <KnownIssues {...props} />} />
							<Route path='/chat' exact render={props => <Chat {...props} />} />
							<Route path='/account' exact render={props => <Account {...props} />} />
							<Route path='/view/:blueprintId' render={props => <SingleBlueprint {...props} />} />
							<Route path='/edit/:blueprintId' render={props => <EditBlueprint {...props} />} />
							<Route path='/user/:userId' render={props => <UserGrid {...props} />} />
							<Route path='/tagged/:tag' render={this.renderTag} />
							<Route render={props => <NoMatch {...props} />} />
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
