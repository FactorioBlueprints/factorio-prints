import {faCog} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Grid                   from 'react-bootstrap/lib/Grid';
import Jumbotron              from 'react-bootstrap/lib/Jumbotron';
import PageHeader             from 'react-bootstrap/lib/PageHeader';
import Row                    from 'react-bootstrap/lib/Row';
import {connect}              from 'react-redux';
import {bindActionCreators}   from 'redux';

import {filterOnTags, subscribeToUser} from '../actions/actionCreators';

import * as propTypes from '../propTypes';
import * as selectors from '../selectors';

import BlueprintThumbnail from './BlueprintThumbnail';
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

	componentWillMount()
	{
		if (this.props.user)
		{
			this.props.subscribeToUser(this.props.user.uid);
		}
	}

	calls = 0;

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
						{'Viewing My Favorites'}
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
			</Grid>
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
