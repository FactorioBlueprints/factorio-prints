import {forbidExtraProps} from 'airbnb-prop-types';
import isEmpty from 'lodash/isEmpty';
import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';

import Grid from 'react-bootstrap/lib/Grid';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import Row from 'react-bootstrap/lib/Row';

import FontAwesome from 'react-fontawesome';
import ReactPaginate from 'react-paginate';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {filterOnTags, subscribeToBlueprintSummaries, subscribeToUser} from '../actions/actionCreators';
import {blueprintSummariesSchema, locationSchema, userSchema} from '../propTypes';
import * as selectors from '../selectors';

import BlueprintThumbnail from './BlueprintThumbnail';
import SearchForm from './SearchForm';
import TagForm from './TagForm';

const PAGE_SIZE = 60;

class MostFavoritedGrid extends PureComponent
{
	static propTypes = forbidExtraProps({
		subscribeToBlueprintSummaries: PropTypes.func.isRequired,
		subscribeToUser              : PropTypes.func.isRequired,
		filterOnTags                 : PropTypes.func.isRequired,
		user                         : userSchema,
		blueprintSummaries           : blueprintSummariesSchema,
		blueprintSummariesLoading    : PropTypes.bool,
		pageCount                    : PropTypes.number.isRequired,
		favoriteBlueprintSummaries   : PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
		location                     : locationSchema,
		history                      : PropTypes.object.isRequired,
		staticContext                : PropTypes.shape(forbidExtraProps({})),
		match                        : PropTypes.shape(forbidExtraProps({
			params : PropTypes.shape(forbidExtraProps({})).isRequired,
			path   : PropTypes.string.isRequired,
			url    : PropTypes.string.isRequired,
			isExact: PropTypes.bool.isRequired,
		})).isRequired,
	});

	state = {
		currentPage: 0,
	};

	componentWillMount()
	{
		this.props.subscribeToBlueprintSummaries();
		if (this.props.user)
		{
			this.props.subscribeToUser(this.props.user.uid);
		}
	}

	handlePageClick = ({selected}) =>
	{
		window.scrollTo(0, 0);
		this.setState({currentPage: selected});
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

	render()
	{
		if (this.props.blueprintSummariesLoading && isEmpty(this.props.favoriteBlueprintSummaries))
		{
			return (
				<Jumbotron>
					<h1>
						<FontAwesome name='cog' spin />
						{' Loading data'}
					</h1>
				</Jumbotron>
			);
		}

		const startIndex = PAGE_SIZE * this.state.currentPage;
		const endIndex   = startIndex + PAGE_SIZE;

		return (
			<Grid>
				<Row>
					<PageHeader>
						{'Viewing Most Favorited'}
					</PageHeader>
				</Row>
				<Row>
					<SearchForm />
					<TagForm />
				</Row>
				<Row>
					{
						this.props.favoriteBlueprintSummaries.slice(startIndex, endIndex)
							.map(key => <BlueprintThumbnail key={key} id={key} />)
					}
				</Row>
				<Row>
					<ReactPaginate
						previousLabel={'<'}
						nextLabel={'>'}
						pageCount={this.props.pageCount}
						marginPagesDisplayed={2}
						pageRangeDisplayed={5}
						onPageChange={this.handlePageClick}
						breakLabel={<span>...</span>}
						breakClassName={'break-me'}
						containerClassName={'pagination'}
						subContainerClassName={'pages pagination'}
						activeClassName={'active'}
					/>
				</Row>
			</Grid>
		);
	}
}

const mapStateToProps = (storeState) =>
{
	const favoriteBlueprintSummaries = selectors.getFavoriteBlueprintSummaries(storeState);
	return {
		user                     : selectors.getFilteredUser(storeState),
		blueprintSummaries       : selectors.getBlueprintSummariesData(storeState),
		blueprintSummariesLoading: selectors.getBlueprintSummariesLoading(storeState),
		pageCount                : favoriteBlueprintSummaries.length / PAGE_SIZE,
		favoriteBlueprintSummaries,
	};
};

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {
		subscribeToBlueprintSummaries,
		filterOnTags,
		subscribeToUser,
	};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(MostFavoritedGrid);
