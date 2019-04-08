import {faCog} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Container              from 'react-bootstrap/Container';
import Jumbotron              from 'react-bootstrap/Jumbotron';
import Row                    from 'react-bootstrap/Row';
import {connect}              from 'react-redux';
import {bindActionCreators}   from 'redux';

import {filterOnTags, subscribeToUserBlueprintSummaries} from '../actions/actionCreators';

import * as propTypes             from '../propTypes';
import BlueprintSummaryProjection from '../propTypes/BlueprintSummaryProjection';
import myPropTypes                from '../propTypes/myPropTypes';
import * as selectors             from '../selectors';

import BlueprintThumbnail from './BlueprintThumbnail';
import PageHeader         from './PageHeader';
import SearchForm         from './SearchForm';
import TagForm            from './TagForm';

class MyFavoritesGrid extends PureComponent
{
	static propTypes = forbidExtraProps({
		my                           : myPropTypes,
		subscribeToUserBlueprintSummaries          : PropTypes.func.isRequired,
		filterOnTags             : PropTypes.func.isRequired,
		user                     : propTypes.userSchema,
		blueprintSummaries           : PropTypes.arrayOf(BlueprintSummaryProjection).isRequired,
		blueprintSummariesLoading: PropTypes.bool,
		location                 : propTypes.locationSchema,
		history                  : propTypes.historySchema,
		staticContext            : PropTypes.shape(forbidExtraProps({})),
		match                    : PropTypes.shape(forbidExtraProps({
			params : PropTypes.shape(forbidExtraProps({})).isRequired,
			path   : PropTypes.string.isRequired,
			url    : PropTypes.string.isRequired,
			isExact: PropTypes.bool.isRequired,
		})),
	});

	UNSAFE_componentWillMount()
	{
		if (this.props.user)
		{
			this.props.subscribeToUserBlueprintSummaries(this.props.user.uid);
		}
	}

	render()
	{
		if (!this.props.user)
		{
			return (
				<Jumbotron>
					<h1 className='display-4'>
						My Favorites
					</h1>
					<p className='lead'>
						Please log in with Google or GitHub in order to view your favorite blueprints.
					</p>
				</Jumbotron>
			);
		}

		if (this.props.blueprintSummariesLoading)
		{
			return (
				<Jumbotron>
					<h1 className='display-4'>
						<FontAwesomeIcon icon={faCog} spin />
						{' Loading data'}
					</h1>
				</Jumbotron>
			);
		}

		return (
			<Container fluid>
				<PageHeader title='My Favorites' />
				<Row>
					<SearchForm />
					<TagForm />
				</Row>
				<Row className='blueprint-grid-row justify-content-center'>
					{
						this.props.blueprintSummaries.map(blueprintSummary =>
							<BlueprintThumbnail key={blueprintSummary.key} blueprintSummary={blueprintSummary} my={this.props.my} />)
					}
				</Row>
			</Container>
		);
	}
}

const mapStateToProps = storeState => (
	{
		my                       : storeState.my,
		user                     : selectors.getFilteredUser(storeState),
		blueprintSummaries       : storeState.blueprintMyFavorites.data,
		blueprintSummariesLoading: storeState.blueprintMyFavorites.loading,
	});

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {
		filterOnTags,
		subscribeToUserBlueprintSummaries,
	};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(MyFavoritesGrid);
