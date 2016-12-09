import React, {Component} from 'react';
import App from './App';
import BlueprintGrid from './BlueprintGrid';
import UserGrid from './UserGrid';
import FavoritesGrid from './FavoritesGrid';
import Create from './Create';
import SingleBlueprint from './SingleBlueprint';
import Intro from './Intro';
import NoMatch from './NoMatch';
import base from '../base';
import {BrowserRouter, Match, Miss} from 'react-router';

class Root extends Component {
	static propTypes = {};

	state = {
		blueprints           : {},
		showKeyboardShortcuts: false,
		user                 : null,
		authData             : null,
	};

	componentWillMount()
	{
		this.ref = base.syncState('blueprints', {
			context: this,
			state  : 'blueprints',
		});
	}

	componentWillUnmount()
	{
		base.removeBinding(this.ref);
	}

	handleHideKeyboardShortcuts = () =>
	{
		this.setState({showKeyboardShortcuts: false});
	};

	handleToggleKeyboardShortcuts = () =>
	{
		this.setState({showKeyboardShortcuts: !this.state.showKeyboardShortcuts});
	};

	handleLogin = (authData) =>
	{
		const {uid, displayName, email, photoURL} = authData.user;

		this.setState({
			authData,
			user: {
				userId: uid,
				displayName,
			},
		});
		const userRef = base.database().ref(`/users/${uid}`);
		userRef.update({
			displayName,
			email,
			photoURL,
		});
	};

	handleLogout = () =>
	{
		this.setState({
			authData: null,
			user    : null,
		});
	};

	renderIntro           = props =>
		<div>
			{this.state.authData === null && <Intro />}
			{this.renderBlueprintGrid(props)}
		</div>;
	renderBlueprintGrid   = props =>
		<BlueprintGrid
			{...props}
			blueprints={this.state.blueprints}
		/>;
	renderCreate          = props =>
		<Create
			{...props}
			user={this.state.user}
		/>;
	renderSingleBlueprint = (props) =>
	{
		const blueprintId = props.params.blueprintId;
		const blueprint   = this.state.blueprints[blueprintId];
		return (
			<SingleBlueprint
				{...props}
				id={blueprintId}
				blueprint={blueprint}
				user={this.state.user}
			/>
		);
	};
	renderUser            = props =>
		<UserGrid
			{...props}
			id={props.params.userId}
			blueprints={this.state.blueprints}
		/>;
	renderFavorites       = props =>
		<FavoritesGrid
			{...props}
			user={this.state.user}
			blueprints={this.state.blueprints}
		/>;

	render()
	{
		return <shell className='app-shell primary-content'>
			<BrowserRouter>
				<App
					onLogin={this.handleLogin}
					onLogout={this.handleLogout}
					authData={this.state.authData}
					onHideKeyboardShortcuts={this.handleHideKeyboardShortcuts}
					onToggleKeyboardShortcuts={this.handleToggleKeyboardShortcuts}
					showKeyboardShortcuts={this.state.showKeyboardShortcuts}>
					<div>
						<Match pattern='/' exactly render={this.renderIntro} />
						<Match pattern='/blueprints' exactly render={this.renderBlueprintGrid} />
						<Match pattern='/create' exactly component={this.renderCreate} />
						<Match pattern='/view/:blueprintId' component={this.renderSingleBlueprint} />
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
