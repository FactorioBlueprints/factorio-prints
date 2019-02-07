import {faAngleDoubleLeft, faAngleLeft, faAngleRight, faCog} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Button                 from 'react-bootstrap/lib/Button';
import ButtonToolbar          from 'react-bootstrap/lib/ButtonToolbar';
import Col                    from 'react-bootstrap/lib/Col';
import Grid                   from 'react-bootstrap/lib/Grid';
import Jumbotron              from 'react-bootstrap/lib/Jumbotron';
import PageHeader             from 'react-bootstrap/lib/PageHeader';
import Row                    from 'react-bootstrap/lib/Row';
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

import * as propTypes from '../propTypes';
import * as selectors from '../selectors';

import BlueprintThumbnail from './BlueprintThumbnail';
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
		blueprintSummaries           : propTypes.blueprintSummariesSchema,
		blueprintSummariesLoading    : PropTypes.bool,
		currentPage                  : PropTypes.number.isRequired,
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

	componentWillMount()
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
		if (this.props.blueprintSummariesLoading)
		{
			return (
				<Jumbotron>
					<h1>
						<FontAwesomeIcon icon={faCog} spin />
						{' Loading data'}
					</h1>
				</Jumbotron>
			);
		}

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
						this.props.blueprintSummaries.map(blueprintSummary =>
							<BlueprintThumbnail key={blueprintSummary.key} blueprintSummary={blueprintSummary} />)
					}
				</Row>
				<Row>
					<Col md={6} mdOffset={3}>
						<ButtonToolbar>
							<Button onClick={this.handleFirstPage} disabled={this.props.currentPage === 1} >
								<FontAwesomeIcon icon={faAngleDoubleLeft} size='lg' fixedWidth />
								{'First Page'}
							</Button>
							<Button onClick={this.handlePreviousPage} disabled={this.props.currentPage === 1}>
								<FontAwesomeIcon icon={faAngleLeft} size='lg' fixedWidth />
								{'Previous Page'}
							</Button>
							<Button bsStyle='link' disabled>
								{`Page: ${this.props.currentPage}`}
							</Button>
							<Button onClick={this.handleNextPage} disabled={this.props.isLastPage}>
								{'Next Page'}
								<FontAwesomeIcon icon={faAngleRight} size='lg' fixedWidth />
							</Button>
						</ButtonToolbar>
					</Col>
				</Row>
			</Grid>
		);
	}
}

const mapStateToProps = storeState => (
	{
		user                     : selectors.getFilteredUser(storeState),
		blueprintSummaries       : selectors.getFavoriteBlueprintSummaries(storeState),
		blueprintSummariesLoading: selectors.getBlueprintAllFavoritesLoading(storeState),
		currentPage              : storeState.blueprintAllFavorites.currentPage,
		isLastPage               : storeState.blueprintAllFavorites.isLastPage,
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
