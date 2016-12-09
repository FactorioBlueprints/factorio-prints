import React, {Component, PropTypes} from 'react';

import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';

import BlueprintThumbnail from './BlueprintThumbnail';
import base from '../base';

class FavoritesGrid extends Component {
	static propTypes = {
		user      : PropTypes.shape({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string.isRequired,
		}),
		blueprints: PropTypes.object.isRequired,
	};

	state = {
		keys: {},
	};

	componentWillMount()
	{
		if (this.props.user)
		{
			this.ref = base.syncState(`/users/${this.props.user.userId}/favorites/`, {
				context: this,
				state  : 'keys',
			});
		}
	}

	componentWillUnmount()
	{
		if (this.ref)
		{
			base.removeBinding(this.ref);
		}
	}

	render()
	{
		if (!this.props.user)
		{
			return (
				<Jumbotron>
					<h1>{'My Favorites'}</h1>
					<p>{'Please log in with Google, Facebook, Twitter, or GitHub in order to view your favorite blueprints.'}</p>
				</Jumbotron>
			);
		}

		return (
			<Grid>
				<Row>
					<PageHeader>{'My Favorites'}</PageHeader>
				</Row>
				<Row>
					{
						Object.keys(this.state.keys)
							.filter(key => this.state.keys[key])
							.map(key => <BlueprintThumbnail key={key} id={key} {...this.props.blueprints[key]} />)
					}
				</Row>
			</Grid>
		);
	}
}

export default FavoritesGrid;
