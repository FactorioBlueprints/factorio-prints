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

class Root extends Component {
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
			if (user)
			{
				const {uid, displayName, email, photoURL} = user;

				this.setState({
					user: {
						userId: uid,
						displayName,
						photoURL,
					},
				});

				const userRef = base.database().ref(`/users/${uid}`);
				userRef.update({
					displayName,
					email,
					photoURL,
				});

				const moderatorRef = base.database().ref(`/moderators/${uid}`);
				moderatorRef.once('value').then((snapshot) =>
				{
					const newState = {isModerator: snapshot.val()};
					this.setState(newState);
				});

				this.userFavoritesRef = base.syncState(`/users/${uid}/favorites`, {
					context: this,
					state  : 'userFavorites',
				});
			}
			else
			{
				this.setState({
					user         : null,
					userFavorites: {},
					isModerator  : false,
				});

				base.removeBinding(this.userFavoritesRef);
			}
		}, error => console.error({error}));
	}

	componentWillUnmount()
	{
		base.removeBinding(this.ref);
	}

	renderIntro             = props =>
		<div>
			{this.state.user === null && <Intro />}
			{this.renderBlueprintGrid(props)}
		</div>;
	renderBlueprintGrid     = props =>
		<BlueprintGrid
			{...props}
			blueprintSummaries={this.state.blueprintSummaries}
		/>;
	renderMostFavoritedGrid = props =>
		<MostFavoritedGrid
			{...props}
			blueprintSummaries={this.state.blueprintSummaries}
		/>;
	renderCreate            = props =>
		<Create
			{...props}
			user={this.state.user}
		/>;
	renderSingleBlueprint   = (props) =>
	{
		const blueprintId = props.params.blueprintId;

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
		const blueprintId = props.params.blueprintId;

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
						<Miss component={NoMatch} />
					</div>
				</App>
			</BrowserRouter>
		</shell>;
	}
}

export default Root;
