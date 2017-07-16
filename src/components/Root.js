import forOwn from 'lodash/forOwn';
import isArray from 'lodash/isArray';
import join from 'lodash/join';

import React, {PureComponent} from 'react';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import DocumentTitle from 'react-document-title';
import {BrowserRouter, Match, Miss} from 'react-router';

import base, {app} from '../base';
import App from './App';
import BlueprintGrid from './BlueprintGrid';
import Contact from './Contact';
import Create from './Create';
import EditBlueprint from './EditBlueprint';
import FavoritesGrid from './FavoritesGrid';
import Intro from './Intro';
import MostFavoritedGrid from './MostFavoritedGrid';
import NoMatch from './NoMatch';
import SingleBlueprint from './SingleBlueprint';
import UserGrid from './UserGrid';

class Root extends PureComponent
{
	static propTypes = {};

	state = {
		blueprintSummaries: {},
		tags              : [],
		tagHierarchy      : {},
		byTag             : {},
		user              : null,
		userFavorites     : {},
		isModerator       : false,
		loadingTags       : true,
	};

	componentWillMount()
	{
		this.blueprintSummariesRef = base.bindToState('blueprintSummaries', {
			context: this,
			state  : 'blueprintSummaries',
		});

		base.fetch('tags', {
			context  : this,
			then     : tagHierarchy =>
			{
				const tags = this.buildTagOptions(tagHierarchy);
				return this.setState({tags, tagHierarchy});
			},
			onFailure: console.log,
		});

		app.auth().onAuthStateChanged((user) =>
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
					const {displayName} = snapshot.val();
					newState.user = {userId: uid, displayName};
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

				app.database()
					.ref(`/users/${uid}/`)
					.transaction(buildUserInformation)
					.then(userInformationState)
					.then(() => app.database().ref(`/moderators/${uid}`).once('value'))
					.then(snapshot => newState.isModerator = snapshot.val())
					.then(() => this.setState(newState))
					.catch(eraseState);

				this.unbindUserFavs();
				this.userFavoritesRef = base.bindToState(`/users/${uid}/favorites`, {
					context: this,
					state  : 'userFavorites',
				});
			}
		}, console.log);
	}

	componentWillUnmount()
	{
		base.removeBinding(this.blueprintSummariesRef);
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

	lazilyFetchTaggedBlueprints = () =>
	{
		if (!this.taggedBlueprintsRef)
		{
			this.taggedBlueprintsRef = base.bindToState(`/byTag/`, {
				context  : this,
				state    : 'byTag',
				then     : () => this.setState({loadingTags: false}),
				onFailure: () => this.setState({loadingTags: false}),
			});
		}
	}

	buildTagOptions = (tagHierarchy) =>
	{
		const result = [];
		this.buildTagOptionsRecursive(tagHierarchy, [], result);
		return result;
	};

	buildTagOptionsRecursive = (tagHierarchyNode, pathArray, result) =>
	{
		forOwn(tagHierarchyNode, (value, key) =>
		{
			if (isArray(value))
			{
				value.forEach(eachValue => result.push(`${join(pathArray, '/')}/${key}/${eachValue}/`));
			}
			else
			{
				const newPathArray = [...pathArray, key];
				this.buildTagOptionsRecursive(value, newPathArray, result);
			}
		});
	};

	renderIntro             = props =>
		<div>
			{this.state.user === null && <Intro />}
			{this.renderBlueprintGrid(props)}
		</div>;
	renderBlueprintGrid     = props =>
		<BlueprintGrid
			blueprintSummaries={this.state.blueprintSummaries}
			userFavorites={this.state.userFavorites}
			user={this.state.user}
			tags={this.state.tags}
			lazilyFetchTaggedBlueprints={this.lazilyFetchTaggedBlueprints}
			byTag={this.state.byTag}
			loadingTags={this.state.loadingTags}
		/>;
	renderMostFavoritedGrid = props =>
		<MostFavoritedGrid
			blueprintSummaries={this.state.blueprintSummaries}
			userFavorites={this.state.userFavorites}
			user={this.state.user}
			tags={this.state.tags}
			lazilyFetchTaggedBlueprints={this.lazilyFetchTaggedBlueprints}
			byTag={this.state.byTag}
			loadingTags={this.state.loadingTags}
		/>;
	renderCreate            = props =>
		<Create
			tags={this.state.tags}
			user={this.state.user}
		/>;
	renderSingleBlueprint   = (props) =>
	{
		const {blueprintId} = props.params;

		return (
			<SingleBlueprint
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
			id={blueprintId}
			tags={this.state.tags}
			user={this.state.user}
			isModerator={this.state.isModerator}
		/>;
	};
	renderUser              = props =>
		<UserGrid
			id={props.params.userId}
			blueprintSummaries={this.state.blueprintSummaries}
			userFavorites={this.state.userFavorites}
		/>;
	renderTag              = (props) =>
	{
		const {pathname} = props.location;
		const tagId = pathname.replace(/^\/tagged/, '');
		this.lazilyFetchTaggedBlueprints();

		return <BlueprintGrid
			blueprintSummaries={this.state.blueprintSummaries}
			userFavorites={this.state.userFavorites}
			user={this.state.user}
			tags={this.state.tags}
			lazilyFetchTaggedBlueprints={this.lazilyFetchTaggedBlueprints}
			byTag={this.state.byTag}
			loadingTags={this.state.loadingTags}
			initiallySelectedTags={[tagId]}
		/>
	};
	renderFavorites         = props =>
		<FavoritesGrid
			user={this.state.user}
			blueprintSummaries={this.state.blueprintSummaries}
			userFavorites={this.state.userFavorites}
		/>;

	render()
	{
		return <shell className='app-shell primary-content'>
			<BrowserRouter>
				<DocumentTitle title='Factorio Prints'>
				<App user={this.state.user}>
					<div>
						<Match pattern='/' exactly render={this.renderIntro} />
						<Match pattern='/blueprints' exactly render={this.renderBlueprintGrid} />
						<Match pattern='/top' exactly render={this.renderMostFavoritedGrid} />
						<Match pattern='/create' exactly component={this.renderCreate} />
						<Match pattern='/view/:blueprintId' component={this.renderSingleBlueprint} />
						<Match pattern='/edit/:blueprintId' component={this.renderEditBlueprint} />
						<Match pattern='/user/:userId' component={this.renderUser} />
						<Match pattern='/tagged/:tag' component={this.renderTag} />
						<Match pattern='/favorites' exactly component={this.renderFavorites} />
						<Match pattern='/contact' extactly component={Contact} />
						<Miss component={NoMatch} />
					</div>
				</App>
				</DocumentTitle>
			</BrowserRouter>
		</shell>;
	}
}

export default Root;
