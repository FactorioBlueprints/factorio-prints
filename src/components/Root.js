import {forbidExtraProps} from 'airbnb-prop-types';

import PropTypes from 'prop-types';

import React, {PureComponent} from 'react';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import DocumentTitle from 'react-document-title';
import {connect} from 'react-redux';
import {BrowserRouter, Match, Miss} from 'react-router';
import {bindActionCreators} from 'redux';

import {
	authStateChanged,
	subscribeToBlueprintSummaries,
} from '../actions/actionCreators';

import {app} from '../base';
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
	static propTypes = forbidExtraProps({
		subscribeToBlueprintSummaries: PropTypes.func.isRequired,
		authStateChanged             : PropTypes.func.isRequired,
		blueprintSummaries           : PropTypes.objectOf(PropTypes.shape(forbidExtraProps({
			title            : PropTypes.string.isRequired,
			imgurId          : PropTypes.string.isRequired,
			imgurType        : PropTypes.string.isRequired,
			numberOfFavorites: PropTypes.number.isRequired,
		})).isRequired),
	});

	componentWillMount()
	{
		this.props.subscribeToBlueprintSummaries();

		app.auth().onAuthStateChanged((user) =>
		{
			this.props.authStateChanged(user);
			if (!user)
			{
				this.setState({
					user         : null,
				});
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

			}
		}, console.log);
	}

	renderIntro             = props =>
		<div>
			{this.state.user === null && <Intro />}
			{this.renderBlueprintGrid(props)}
		</div>;
	renderTag              = (props) =>
	{
		const {pathname} = props.location;
		const tagId = pathname.replace(/^\/tagged/, '');

		return <BlueprintGrid
			user={this.state.user}
			initialTag={tagId}
		/>
	};
	renderFavorites         = props =>
		<FavoritesGrid
			user={this.state.user}
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

const mapStateToProps = (state) =>
{
	const {
		blueprintSummaries: {
			data: blueprintSummariesData,
		},
	} = state;

	return {
		blueprintSummaries: blueprintSummariesData,
	};
};

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {
		subscribeToBlueprintSummaries,
		authStateChanged,
	};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(Root);
