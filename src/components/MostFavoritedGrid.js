import get from 'lodash/get';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import Grid from 'react-bootstrap/lib/Grid';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import Row from 'react-bootstrap/lib/Row';

import base from '../base';

import BlueprintThumbnail from './BlueprintThumbnail';
import SearchForm from './SearchForm';

class MostFavoritedGrid extends Component
{
	static propTypes = {
		blueprintSummaries: PropTypes.object.isRequired,
		userFavorites     : PropTypes.object.isRequired,
		user              : PropTypes.shape({
			userId: PropTypes.string.isRequired,
		}),
	};

	state = {
		blueprints  : {},
		loading     : true,
		searchString: '',
	};

	componentWillMount()
	{
		this.syncState(this.props);
	}

	componentWillReceiveProps(nextProps)
	{
		const oldUserId = get(this.props, 'user.userId');
		const newUserId = get(nextProps, 'user.userId');
		if (oldUserId !== newUserId)
		{
			this.syncState(nextProps);
		}
	}

	componentWillUnmount()
	{
		if (this.blueprintsRef)
		{
			base.removeBinding(this.blueprintsRef);
		}
	}

	syncState = (props) =>
	{
		if (this.blueprintsRef)
		{
			base.removeBinding(this.blueprintsRef);
		}

		if (props.user)
		{
			this.blueprintsRef = base.syncState(`/users/${props.user.userId}/blueprints`, {
				context  : this,
				state    : 'blueprints',
				then     : () => this.setState({loading: false}),
				onFailure: () => this.setState({loading: false}),
			});
		}
	};

	compareNumberOfFavorites = (a, b) =>
	{
		const numberOfFavoritesA = this.props.blueprintSummaries[a].numberOfFavorites;
		const numberOfFavoritesB = this.props.blueprintSummaries[b].numberOfFavorites;
		if (numberOfFavoritesA < numberOfFavoritesB)
		{
			return 1;
		}
		if (numberOfFavoritesA > numberOfFavoritesB)
		{
			return -1;
		}
		return 0;
	};

	handleSearchString = (event) =>
	{
		event.preventDefault();

		this.setState({searchString: event.target.value});
	};

	render()
	{
		return <Grid>
			<Row>
				<PageHeader>{'Viewing Most Favorited'}</PageHeader>
			</Row>
			<Row>
				<SearchForm
					searchString={this.state.searchString}
					onSearchString={this.handleSearchString}
				/>
			</Row>
			<Row>
				{
					Object.keys(this.props.blueprintSummaries)
						.filter(key => this.props.blueprintSummaries[key].numberOfFavorites > 0)
						.filter(key => this.props.blueprintSummaries[key].title.toLowerCase().includes(this.state.searchString.toLowerCase()))
						.sort(this.compareNumberOfFavorites)
						.map((key) =>
						{
							const isMine = this.state.blueprints[key] === true;
							return (
								<BlueprintThumbnail
									key={key}
									id={key}
									isFavorite={this.props.userFavorites[key] === true}
									isMine={isMine}
									{...this.props.blueprintSummaries[key]}
								/>);
						})
				}
			</Row>
		</Grid>;
	}
}

export default MostFavoritedGrid;
