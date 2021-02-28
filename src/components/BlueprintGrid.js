import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Container              from 'react-bootstrap/Container';
import Row                    from 'react-bootstrap/Row';
import {connect}              from 'react-redux';
import {bindActionCreators}   from 'redux';

import {
	filterOnTags,
	goToFirstSummaries,
	goToNextSummaries,
	goToPreviousSummaries,
	subscribeToBlueprintSummaries,
} from '../actions/actionCreators';

import * as propTypes             from '../propTypes';
import BlueprintSummaryProjection from '../propTypes/BlueprintSummaryProjection';
import myPropTypes                from '../propTypes/myPropTypes';
import * as selectors             from '../selectors';
import EfficientBlueprintGrid     from './grid/EfficientBlueprintGrid';
import PageHeader                 from './PageHeader';
import SearchForm                 from './SearchForm';
import TagForm                    from './TagForm';

class BlueprintGrid extends PureComponent
{
	static propTypes = forbidExtraProps({
		my                           : myPropTypes,
		initialTag                   : PropTypes.string,
		subscribeToBlueprintSummaries: PropTypes.func.isRequired,
		goToPreviousSummaries        : PropTypes.func.isRequired,
		goToNextSummaries            : PropTypes.func.isRequired,
		goToFirstSummaries           : PropTypes.func.isRequired,
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
		if (this.props.initialTag)
		{
			this.props.filterOnTags([this.props.initialTag]);
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
				<PageHeader title='Most Recent' />
				<Row>
					<SearchForm />
					<TagForm />
				</Row>
				<EfficientBlueprintGrid />
			</Container>
		);
	}
}

const mapStateToProps = storeState => (
	{
		my                       : storeState.my,
		user                     : selectors.getFilteredUser(storeState),
		blueprintSummaries       : storeState.blueprintSummaries.data,
		blueprintSummariesLoading: storeState.blueprintSummaries.loading,
		currentPage              : storeState.blueprintSummaries.currentPage,
		numberOfPages            : storeState.blueprintSummaries.numberOfPages,
		isLastPage               : storeState.blueprintSummaries.currentPage === storeState.blueprintSummaries.numberOfPages,
	});

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {
		subscribeToBlueprintSummaries,
		goToPreviousSummaries,
		goToNextSummaries,
		goToFirstSummaries,
		filterOnTags,
	};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(BlueprintGrid);
