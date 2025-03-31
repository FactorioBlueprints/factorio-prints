import {faAngleDoubleLeft, faAngleLeft, faAngleRight, faCog} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React, {useEffect} from 'react';
import Button             from 'react-bootstrap/Button';
import Col                from 'react-bootstrap/Col';
import Container          from 'react-bootstrap/Container';
import Row                from 'react-bootstrap/Row';
import {connect}          from 'react-redux';
import {bindActionCreators} from 'redux';

import {
	filterOnTags,
	goToFirstSummaries,
	goToNextSummaries,
	goToPreviousSummaries,
	subscribeToBlueprintSummaries,
	subscribeToTag,
	subscribeToUser,
} from '../actions/actionCreators';

import * as propTypes from '../propTypes';
import * as selectors from '../selectors';

import BlueprintThumbnail from './BlueprintThumbnail';
import PageHeader         from './PageHeader';
import SearchForm         from './SearchForm';
import TagForm            from './TagForm';

const BlueprintGrid = ({
	initialTag,
	subscribeToBlueprintSummaries,
	goToPreviousSummaries,
	goToNextSummaries,
	goToFirstSummaries,
	subscribeToUser,
	filterOnTags,
	subscribeToTag,
	user,
	blueprintSummaries,
	blueprintSummariesLoading,
	currentPage,
	isLastPage,
}) =>
{
	useEffect(() =>
	{
		subscribeToBlueprintSummaries();
		if (initialTag)
		{
			const formattedTagPath = initialTag.endsWith('/')
				? initialTag
				: initialTag + '/';

			const tagPath = [formattedTagPath];
			filterOnTags(tagPath);
			subscribeToTag(formattedTagPath);
		}
		if (user)
		{
			subscribeToUser(user.uid);
		}
	}, [initialTag, subscribeToBlueprintSummaries, filterOnTags, subscribeToTag, user, subscribeToUser]);

	const handlePreviousPage = () =>
	{
		window.scrollTo(0, 0);
		goToPreviousSummaries();
	};

	const handleNextPage = () =>
	{
		window.scrollTo(0, 0);
		goToNextSummaries();
	};

	const handleFirstPage = () =>
	{
		window.scrollTo(0, 0);
		goToFirstSummaries();
	};

	if (blueprintSummariesLoading)
	{
		return (
			<div className='p-5 rounded-lg jumbotron'>
				<h1 className='display-4'>
					<FontAwesomeIcon icon={faCog} spin />
					{' Loading data'}
				</h1>
			</div>
		);
	}

	return (
		<Container fluid>
			<PageHeader title='Most Recent' />
			<Row>
				<SearchForm />
				<TagForm />
			</Row>
			<Row className='blueprint-grid-row justify-content-center'>
				{
					blueprintSummaries.map(blueprintSummary =>
						<BlueprintThumbnail key={blueprintSummary.key} blueprintSummary={blueprintSummary} />)
				}
			</Row>
			<Row>
				<Col md={{span: 6, offset: 3}}>
					<Button type='button' onClick={handleFirstPage} disabled={currentPage === 1} >
						<FontAwesomeIcon icon={faAngleDoubleLeft} size='lg' fixedWidth />
						{'First Page'}
					</Button>
					<Button type='button' onClick={handlePreviousPage} disabled={currentPage === 1}>
						<FontAwesomeIcon icon={faAngleLeft} size='lg' fixedWidth />
						{'Previous Page'}
					</Button>
					<Button variant='link' type='button' disabled>
						{`Page: ${currentPage}`}
					</Button>
					<Button type='button' onClick={handleNextPage} disabled={isLastPage}>
						{'Next Page'}
						<FontAwesomeIcon icon={faAngleRight} size='lg' fixedWidth />
					</Button>
				</Col>
			</Row>
		</Container>
	);
};

BlueprintGrid.propTypes = forbidExtraProps({
	initialTag                   : PropTypes.string,
	subscribeToBlueprintSummaries: PropTypes.func.isRequired,
	goToPreviousSummaries        : PropTypes.func.isRequired,
	goToNextSummaries            : PropTypes.func.isRequired,
	goToFirstSummaries           : PropTypes.func.isRequired,
	subscribeToUser              : PropTypes.func.isRequired,
	filterOnTags                 : PropTypes.func.isRequired,
	subscribeToTag               : PropTypes.func.isRequired,
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

const mapStateToProps = storeState => (
	{
		user                     : selectors.getFilteredUser(storeState),
		blueprintSummaries       : selectors.getBlueprintSummaries(storeState),
		blueprintSummariesLoading: storeState.blueprintSummaries.loading,
		currentPage              : storeState.blueprintSummaries.currentPage,
		isLastPage               : storeState.blueprintSummaries.isLastPage,
	});

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {
		subscribeToTag,
		subscribeToBlueprintSummaries,
		goToPreviousSummaries,
		goToNextSummaries,
		goToFirstSummaries,
		filterOnTags,
		subscribeToUser,
	};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(BlueprintGrid);
