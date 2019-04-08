import {faAngleDoubleLeft, faAngleLeft, faAngleRight, faCog} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Button                 from 'react-bootstrap/Button';
import Col                    from 'react-bootstrap/Col';
import Container              from 'react-bootstrap/Container';
import Jumbotron              from 'react-bootstrap/Jumbotron';
import Row                    from 'react-bootstrap/Row';
import {connect}              from 'react-redux';
import {bindActionCreators}   from 'redux';

import {
	filterOnTags,
	goToFirstAllFavorites,
	goToNextAllFavorites,
	goToPreviousAllFavorites,
	subscribeToAllFavorites,
	subscribeToUser,
} from '../actions/actionCreators';

import * as propTypes             from '../propTypes';
import BlueprintSummaryProjection from '../propTypes/BlueprintSummaryProjection';
import * as selectors             from '../selectors';

import BlueprintThumbnail from './BlueprintThumbnail';
import PageHeader         from './PageHeader';
import SearchForm         from './SearchForm';
import TagForm            from './TagForm';

class MostFavoritedGrid extends PureComponent
{
	static propTypes = forbidExtraProps({
		subscribeToBlueprintSummaries: PropTypes.func.isRequired,
		goToPreviousSummaries        : PropTypes.func.isRequired,
		goToNextSummaries            : PropTypes.func.isRequired,
		goToFirstSummaries           : PropTypes.func.isRequired,
		subscribeToUser              : PropTypes.func.isRequired,
		filterOnTags                 : PropTypes.func.isRequired,
		user                         : propTypes.userSchema,
		blueprintSummaries           : PropTypes.arrayOf(BlueprintSummaryProjection).isRequired,
		blueprintSummariesLoading    : PropTypes.bool,
		currentPage                  : PropTypes.number.isRequired,
		numberOfPages                : PropTypes.number.isRequired,
		isLastPage                   : PropTypes.bool.isRequired,
		location                     : propTypes.locationSchema,
		history                      : propTypes.historySchema,
		staticContext                : PropTypes.shape(forbidExtraProps({})),
		match                        : PropTypes.shape(forbidExtraProps({
			params : PropTypes.shape(forbidExtraProps({})).isRequired,
			path   : PropTypes.string.isRequired,
			url    : PropTypes.string.isRequired,
			isExact: PropTypes.bool.isRequired,
		})),
	});

	UNSAFE_componentWillMount()
	{
		this.props.subscribeToBlueprintSummaries();
		if (this.props.user)
		{
			this.props.subscribeToUser(this.props.user.uid);
		}
	}

	handlePreviousPage = () =>
	{
		window.scrollTo(0, 0);
		this.props.goToPreviousSummaries();
	};

	handleNextPage = () =>
	{
		window.scrollTo(0, 0);
		this.props.goToNextSummaries();
	};

	handleFirstPage = () =>
	{
		window.scrollTo(0, 0);
		this.props.goToFirstSummaries();
	};

	render()
	{
		return (
			<Container fluid>
				<PageHeader title='Most Favorited' />
				<Row>
					<SearchForm />
					<TagForm />
				</Row>
				{
					this.props.blueprintSummariesLoading
						? this.renderLoadingSpinner()
						: this.renderMainGrid()
				}
			</Container>
		);
	}

	renderLoadingSpinner = () =>
		<Jumbotron>
			<h1 className='display-4'>
				<FontAwesomeIcon icon={faCog} spin />
				{' Loading data'}
			</h1>
		</Jumbotron>;

	renderMainGrid = () =>
		<>
			<Row className='blueprint-grid-row justify-content-center'>
				{
					this.props.blueprintSummaries.map(blueprintSummary =>
						<BlueprintThumbnail key={blueprintSummary.key} blueprintSummary={blueprintSummary} />)
				}
			</Row>
			<Row>
				<Col md={{span: 6, offset: 3}}>
					<Button type='button' onClick={this.handleFirstPage} disabled={this.props.currentPage === 1}>
						<FontAwesomeIcon icon={faAngleDoubleLeft} size='lg' fixedWidth />
						{'First Page'}
					</Button>
					<Button type='button' onClick={this.handlePreviousPage} disabled={this.props.currentPage === 1}>
						<FontAwesomeIcon icon={faAngleLeft} size='lg' fixedWidth />
						{'Previous Page'}
					</Button>
					<Button variant='link' type='button' disabled>
						{`Page: ${this.props.currentPage}`}
					</Button>
					<Button type='button' onClick={this.handleNextPage} disabled={this.props.isLastPage}>
						{'Next Page'}
						<FontAwesomeIcon icon={faAngleRight} size='lg' fixedWidth />
					</Button>
				</Col>
			</Row>
		</>;
}

const mapStateToProps = storeState => (
	{
		user                     : selectors.getFilteredUser(storeState),
		blueprintSummaries       : storeState.blueprintAllFavorites.data,
		blueprintSummariesLoading: storeState.blueprintAllFavorites.loading,
		currentPage              : storeState.blueprintAllFavorites.currentPage,
		numberOfPages            : storeState.blueprintAllFavorites.numberOfPages,
		isLastPage               : storeState.blueprintAllFavorites.currentPage === storeState.blueprintAllFavorites.numberOfPages,
	});

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {
		subscribeToBlueprintSummaries: subscribeToAllFavorites,
		goToPreviousSummaries        : goToPreviousAllFavorites,
		goToNextSummaries            : goToNextAllFavorites,
		goToFirstSummaries           : goToFirstAllFavorites,
		filterOnTags,
		subscribeToUser,
	};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(MostFavoritedGrid);
