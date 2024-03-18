import {faCog} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Container              from 'react-bootstrap/Container';
import Row                    from 'react-bootstrap/Row';
import {connect}              from 'react-redux';
import {bindActionCreators}   from 'redux';

import {filterOnTags, subscribeToUser} from '../actions/actionCreators';

import * as propTypes from '../propTypes';
import * as selectors from '../selectors';

import BlueprintThumbnail from './BlueprintThumbnail';
import PageHeader         from './PageHeader';
import SearchForm         from './SearchForm';
import TagForm            from './TagForm';

class MyFavoritesGrid extends PureComponent
{
	static propTypes = forbidExtraProps({
		subscribeToUser          : PropTypes.func.isRequired,
		filterOnTags             : PropTypes.func.isRequired,
		user                     : propTypes.userSchema,
		blueprintSummaries       : propTypes.blueprintSummariesSchema,
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
			this.props.subscribeToUser(this.props.user.uid);
		}
	}

	render()
	{
		if (!this.props.user)
		{
			return (
				<div className='p-5 rounded-lg jumbotron'>
					<h1 className='display-4'>
						My Favorites
					</h1>
					<p className='lead'>
						Please log in with Google or GitHub in order to view your favorite blueprints.
					</p>
				</div>
			);
		}

		if (this.props.blueprintSummariesLoading)
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
				<PageHeader title='My Favorites' />
				<Row>
					<SearchForm />
					<TagForm />
				</Row>
				<Row className='blueprint-grid-row justify-content-center'>
					{
						this.props.blueprintSummaries.map(blueprintSummary =>
							<BlueprintThumbnail key={blueprintSummary.key} blueprintSummary={blueprintSummary} />)
					}
				</Row>
			</Container>
		);
	}
}

const mapStateToProps = storeState => (
	{
		user                     : selectors.getFilteredUser(storeState),
		blueprintSummaries       : selectors.getMyFavoriteBlueprintSummaries(storeState),
		blueprintSummariesLoading: storeState.auth.myFavorites.loading,
	});

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {
		filterOnTags,
		subscribeToUser,
	};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(MyFavoritesGrid);
