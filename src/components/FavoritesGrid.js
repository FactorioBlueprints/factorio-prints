import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import BlueprintThumbnail from './BlueprintThumbnail';
import SearchForm from './SearchForm';

class FavoritesGrid extends PureComponent
{
	static propTypes = {
		blueprintSummaries: PropTypes.object.isRequired,
		userFavorites     : PropTypes.object.isRequired,
		user              : PropTypes.shape({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string,
		}),
	};

	state = {
		searchString: '',
	};

	handleSearchString = (event) =>
	{
		event.preventDefault();

		this.setState({searchString: event.target.value});
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
					<SearchForm
						searchString={this.state.searchString}
						onSearchString={this.handleSearchString}
					/>
				</Row>
				<Row>
					{
						Object.keys(this.props.userFavorites)
							.reverse()
							.filter(key => this.props.userFavorites[key])
							.filter(key => this.props.blueprintSummaries[key].title.toLowerCase().includes(this.state.searchString.toLowerCase()))
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
