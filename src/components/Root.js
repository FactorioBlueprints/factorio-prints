import React, {Component} from 'react';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import {BrowserRouter, Match, Miss} from 'react-router';
import base from '../base';
import FontAwesome from 'react-fontawesome';
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
		blueprints   : {},
		user         : null,
		userFavorites: {},
		isModerator  : false,
	};

	componentWillMount()
	{
		this.ref = base.syncState('blueprints', {
			context: this,
			state  : 'blueprints',
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
			blueprints={this.state.blueprints}
		/>;
	renderMostFavoritedGrid = props =>
		<MostFavoritedGrid
			{...props}
			blueprints={this.state.blueprints}
		/>;
	renderCreate            = props =>
		<Create
			{...props}
			user={this.state.user}
		/>;
	renderSingleBlueprint   = (props) =>
	{
		const blueprintId = props.params.blueprintId;
		const blueprint   = this.state.blueprints[blueprintId];

		if (Object.keys(this.state.blueprints).length === 0)
		{
			return <Jumbotron>
				<h1>
					<FontAwesome name='cog' spin />
					{' Loading data'}
				</h1>
			</Jumbotron>;
		}
		return (
			<SingleBlueprint
				{...props}
				id={blueprintId}
				blueprint={blueprint}
				user={this.state.user}
				isModerator={this.state.isModerator}
			/>
		);
	};
	renderEditBlueprint     = (props) =>
	{
		const blueprintId = props.params.blueprintId;
		const blueprint   = this.state.blueprints[blueprintId];

		if (Object.keys(this.state.blueprints).length === 0)
		{
			return <Jumbotron><h1>{'Loading data'}</h1></Jumbotron>;
		}
		return <EditBlueprint
			{...props}
			id={blueprintId}
			blueprint={blueprint}
			user={this.state.user}
			isModerator={this.state.isModerator}
		/>;
	};
	renderUser              = props =>
		<UserGrid
			{...props}
			id={props.params.userId}
			blueprints={this.state.blueprints}
		/>;
	renderFavorites         = props =>
		<FavoritesGrid
			{...props}
			user={this.state.user}
			blueprints={this.state.blueprints}
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
