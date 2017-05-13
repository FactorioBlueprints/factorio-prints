import React, {Component, PropTypes} from 'react';
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import BlueprintThumbnail from './BlueprintThumbnail';

class FavoritesGrid extends Component
{
	static propTypes = {
		user              : PropTypes.shape({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string,
		}),
		blueprintSummaries: PropTypes.object.isRequired,
		userFavorites     : PropTypes.object.isRequired,
	};

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
					<PageHeader>{'Viewing My Favorites'}</PageHeader>
				</Row>
				<Row>
					{
						Object.keys(this.props.userFavorites)
							.reverse()
							.filter(key => this.props.userFavorites[key])
							.map(key =>
								<BlueprintThumbnail
									key={key}
									id={key} {...this.props.blueprintSummaries[key]}
									isFavorite={false}
									isMine={false}
								/>)
					}
				</Row>
			</Grid>
		);
	}
}

export default FavoritesGrid;
