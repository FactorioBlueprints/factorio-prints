import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';

import Grid from 'react-bootstrap/lib/Grid';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import Row from 'react-bootstrap/lib/Row';

import FontAwesome from 'react-fontawesome';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {filterOnTags, subscribeToBlueprintSummaries, subscribeToUser} from '../actions/actionCreators';

import * as selectors from '../selectors';

import BlueprintThumbnail from './BlueprintThumbnail';
import SearchForm from './SearchForm';
import TagForm from './TagForm';

import ReactPaginate from 'react-paginate';

import {userSchema, blueprintSummariesSchema, locationSchema, historySchema} from '../propTypes';

const PAGE_SIZE = 60;

class FavoritesGrid extends PureComponent
{
	static propTypes = forbidExtraProps({
		subscribeToBlueprintSummaries: PropTypes.func.isRequired,
		subscribeToUser              : PropTypes.func.isRequired,
		filterOnTags                 : PropTypes.func.isRequired,
		user                         : userSchema,
		blueprintSummaries           : blueprintSummariesSchema,
		pageCount                    : PropTypes.number.isRequired,
		myFavoriteBlueprintSummaries : PropTypes.arrayOf(PropTypes.string.isRequired),
		match                : PropTypes.shape(forbidExtraProps({
			params           : PropTypes.shape(forbidExtraProps({
			})).isRequired,
			path             : PropTypes.string.isRequired,
			url              : PropTypes.string.isRequired,
			isExact          : PropTypes.bool.isRequired,
		})).isRequired,
		location             : locationSchema,
		history              : historySchema,
		staticContext        : PropTypes.shape(forbidExtraProps({
		})),
	});

	state = {
		currentPage: 0,
	};

	componentWillMount()
	{
		this.props.subscribeToBlueprintSummaries();
		if (this.props.initialTag)
		{
			this.props.filterOnTags([this.props.initialTag]);
		}
		if (this.props.user)
		{
			this.props.subscribeToUser(this.props.user.uid);
		}
	}

	handlePageClick = ({selected}) =>
	{
		window.scrollTo(0, 0);
		this.setState({currentPage: selected});
	}

	render()
	{
		if (!this.props.user)
		{
			return (
				<Jumbotron>
					<h1>{'My Favorites'}</h1>
					<p>{'Please log in with Google or GitHub in order to view your favorite blueprints.'}</p>
				</Jumbotron>
			);
		}

		if (this.props.blueprintSummariesLoading)
		{
			return <Jumbotron>
				<h1>
					<FontAwesome name='cog' spin />
					{' Loading data'}
				</h1>
			</Jumbotron>;
		}

		const startIndex = PAGE_SIZE * this.state.currentPage;
		const endIndex = startIndex + PAGE_SIZE;

		return (
			<Grid>
				<Row>
					<PageHeader>
						{'Viewing My Favorites'}
					</PageHeader>
				</Row>
				<Row>
					<SearchForm />
					<TagForm />
				</Row>
				<Row>
					{
						this.props.myFavoriteBlueprintSummaries.slice(startIndex, endIndex)
							.map(key => <BlueprintThumbnail key={key} id={key} />)
					}
				</Row>
			<Row>
				<ReactPaginate
					previousLabel={"<"}
					nextLabel={">"}
					pageCount={this.props.pageCount}
					marginPagesDisplayed={2}
					pageRangeDisplayed={5}
					onPageChange={this.handlePageClick}
					breakLabel={<span>...</span>}
					breakClassName={"break-me"}
					containerClassName={"pagination"}
					subContainerClassName={"pages pagination"}
					activeClassName={"active"}
				/>
			</Row>
			</Grid>
		);
	}
}

const mapStateToProps = (storeState) =>
{
	const myFavoriteBlueprintSummaries = selectors.getMyFavoriteBlueprintSummaries(storeState);
	return {
		user                      : selectors.getFilteredUser(storeState),
		blueprintSummaries        : selectors.getBlueprintSummariesData(storeState),
		myFavoriteBlueprintSummaries,
		pageCount                 : myFavoriteBlueprintSummaries.length / PAGE_SIZE,
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

export default connect(mapStateToProps, mapDispatchToProps)(FavoritesGrid);
