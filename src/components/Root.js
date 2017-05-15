import React, {Component} from 'react';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import {BrowserRouter, Match, Miss} from 'react-router';
import base from '../base';
import App from './App';
import BlueprintGrid from './BlueprintGrid';
import MostFavoritedGrid from './MostFavoritedGrid';
import UserGrid from './UserGrid';
import FavoritesGrid from './FavoritesGrid';
import Create from './Create';
import SingleBlueprint from './SingleBlueprint';
import EditBlueprint from './EditBlueprint';
import Intro from './Intro';
import NoMatch from './NoMatch';
import Contact from './Contact';

class Root extends Component
{
	static propTypes = {};

	state = {
		blueprintSummaries: {},
		user              : null,
		userFavorites     : {},
		isModerator       : false,
	};

	componentWillMount()
	{
		this.ref = base.syncState('blueprintSummaries', {
			context: this,
			state  : 'blueprintSummaries',
		});

		base.auth().onAuthStateChanged((user) =>
		{
			if (!user)
			{
				this.setState({
					user         : null,
					userFavorites: {},
					isModerator  : false,
				});
				this.unbindUserFavs();
			}
			else
			{
				const {uid, email, photoURL, emailVerified, providerData} = user;
				const providerId = providerData && providerData.length && providerData[0].providerId;
				const providerDisplayName = providerId ? providerData[0].displayName : undefined;

				const newState = {};

				const buildUserInformation = (existingUser) =>
				{
					const existingUserInitialized = existingUser || {};
					const displayName = existingUserInitialized.displayName || providerDisplayName;
					return {
						...existingUserInitialized,
						displayName,
						photoURL,
						email,
						emailVerified,
						providerId,
					};
				};

				const userInformationState = ({snapshot}) =>
				{
					newState.user = snapshot.val();
					newState.user.userId = uid;
				};

				const eraseState = (error) =>
				{
					newState.user = null;
					newState.userFavorites = {};
					newState.isModerator = false;

					if (error)
					{
						console.log(error);
					}
				};

				base.database()
					.ref(`/users/${uid}/`)
					.transaction(buildUserInformation)
					.then(userInformationState)
					.then(() => base.database().ref(`/moderators/${uid}`).once('value'))
					.then(snapshot => newState.isModerator = snapshot.val())
					.then(() => this.setState(newState))
					.catch(eraseState);

				this.unbindUserFavs();
				this.userFavoritesRef = base.syncState(`/users/${uid}/favorites`, {
					context: this,
					state  : 'userFavorites',
				});
			}
		}, console.log);
	}

	componentWillUnmount()
	{
		base.removeBinding(this.ref);
		this.unbindUserFavs();
	}

	unbindUserFavs = () =>
	{
		if (this.userFavoritesRef)
		{
			base.removeBinding(this.userFavoritesRef);
			this.userFavoritesRef = null;
		}
	};

	renderIntro             = props =>
		<div>
			{this.state.user === null && <Intro />}
			{this.renderBlueprintGrid(props)}
		</div>;
	renderBlueprintGrid     = props =>
		<BlueprintGrid
			{...props}
			blueprintSummaries={this.state.blueprintSummaries}
			userFavorites={this.state.userFavorites}
			user={this.state.user}
		/>;
	renderMostFavoritedGrid = props =>
		<MostFavoritedGrid
			{...props}
			blueprintSummaries={this.state.blueprintSummaries}
			userFavorites={this.state.userFavorites}
			user={this.state.user}
		/>;
	renderCreate            = props =>
		<Create
			{...props}
			user={this.state.user}
		/>;
	renderSingleBlueprint   = (props) =>
	{
		const {blueprintId} = props.params;

		return (
			<SingleBlueprint
				{...props}
				id={blueprintId}
				user={this.state.user}
				isModerator={this.state.isModerator}
			/>
		);
	};
	renderEditBlueprint     = (props) =>
	{
		const {blueprintId} = props.params;

		if (Object.keys(this.state.blueprintSummaries).length === 0)
		{
			return <Jumbotron><h1>{'Loading data'}</h1></Jumbotron>;
		}
		return <EditBlueprint
			{...props}
			id={blueprintId}
			user={this.state.user}
			isModerator={this.state.isModerator}
		/>;
	};
	renderUser              = props =>
		<UserGrid
			{...props}
			id={props.params.userId}
			blueprintSummaries={this.state.blueprintSummaries}
			userFavorites={this.state.userFavorites}
		/>;
	renderFavorites         = props =>
		<FavoritesGrid
			{...props}
			user={this.state.user}
			blueprintSummaries={this.state.blueprintSummaries}
			userFavorites={this.state.userFavorites}
		/>;

	render()
	{
		return <shell className='app-shell primary-content'>
			<BrowserRouter>
				<App user={this.state.user}>
					<div>
						<Match pattern='/' exactly render={this.renderIntro} />
						<Match pattern='/blueprints' exactly render={this.renderBlueprintGrid} />
						<Match pattern='/top' exactly render={this.renderMostFavoritedGrid} />
						<Match pattern='/create' exactly component={this.renderCreate} />
						<Match pattern='/view/:blueprintId' component={this.renderSingleBlueprint} />
						<Match pattern='/edit/:blueprintId' component={this.renderEditBlueprint} />
						<Match pattern='/user/:userId' component={this.renderUser} />
						<Match pattern='/favorites' exactly component={this.renderFavorites} />
						<Match pattern='/contact' extactly component={Contact} />
						<Miss component={NoMatch} />
					</div>
				</App>
			</BrowserRouter>
		</shell>;
	}
}

export default Root;
