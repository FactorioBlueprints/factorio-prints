import {forbidExtraProps}          from 'airbnb-prop-types';
import PropTypes                   from 'prop-types';
import React, {PureComponent}      from 'react';
import DocumentTitle               from 'react-document-title';
import {connect}                   from 'react-redux';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {bindActionCreators}        from 'redux';

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

	renderTag = () =>
	{
		let pathname = window.location.pathname;
		let tagId    = pathname.replace(/^\/tagged/, '');
		return <BlueprintGrid initialTag={tagId} />;
	};

	render()
	{
		return (
			<DocumentTitle title='Factorio Prints'>
				<BrowserRouter>
					<div>
						<Header />
						<Routes>
							<Route path='/' element={this.renderIntro()} />
							<Route path='/blueprints' element={<BlueprintGrid />} />
							<Route path='/top' element={<MostFavoritedGrid />} />
							<Route path='/create' element={<Create />} />
							<Route path='/favorites' element={<FavoritesGrid />} />
							<Route path='/knownIssues' element={<KnownIssues />} />
							<Route path='/chat' element={<Chat />} />
							<Route path='/account' element={<Account />} />
							<Route path='/view/:blueprintId' element={<SingleBlueprint />} />
							<Route path='/edit/:blueprintId' element={<EditBlueprint />} />
							<Route path='/user/:userId' element={<UserGrid />} />
							<Route path='/tagged/:tag' element={this.renderTag()} />
							<Route path='*' element={<NoMatch />} />
						</Routes>
					</div>
				</BrowserRouter>
			</DocumentTitle>
		);
	}
}

const mapStateToProps = () => ({});

const mapDispatchToProps = dispatch => bindActionCreators({authStateChanged}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(Root);
