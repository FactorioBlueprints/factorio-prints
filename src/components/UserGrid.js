import {forbidExtraProps} from 'airbnb-prop-types';
import isEmpty from 'lodash/isEmpty';
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
import NoMatch from './NoMatch';
import SearchForm from './SearchForm';
import TagForm from './TagForm';

import {userSchema, blueprintSummariesSchema} from '../propTypes';

class UserGrid extends PureComponent
{
	static propTypes = forbidExtraProps({
		id                           : PropTypes.string.isRequired,
		displayName                  : PropTypes.string,
		displayNameLoading           : PropTypes.bool.isRequired,
		userBlueprintsLoading        : PropTypes.bool.isRequired,
		subscribeToBlueprintSummaries: PropTypes.func.isRequired,
		subscribeToUser              : PropTypes.func.isRequired,
		filterOnTags                 : PropTypes.func.isRequired,
		user                         : userSchema,
		blueprintSummaries           : blueprintSummariesSchema,
		filteredBlueprintSummaries   : PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
	});

	componentWillMount()
	{
		this.props.subscribeToBlueprintSummaries();
		// Logged in user
		if (this.props.user)
		{
			this.props.subscribeToUser(this.props.user.uid);
		}
		// Blueprint author
		this.props.subscribeToUser(this.props.id);
	}

	render()
	{
		if (this.props.userBlueprintsLoading || this.props.displayNameLoading || this.props.blueprintSummariesLoading)
		{
			return <Jumbotron>
				<h1>
					<FontAwesome name='cog' spin />
					{' Loading data'}
				</h1>
			</Jumbotron>;
		}

		if (isEmpty(this.props.userBlueprints) && isEmpty(this.props.displayName))
		{
			return <NoMatch />;
		}

		return <Grid>
			<Row>
				<PageHeader>
					{'Viewing Blueprints by '}{this.props.displayName || '(Anonymous)'}
				</PageHeader>
			</Row>
			<Row>
				<SearchForm />
				<TagForm />
			</Row>
			<Row>
				{
					this.props.filteredBlueprintSummaries
						.map(key => <BlueprintThumbnail key={key} id={key} />)
				}
			</Row>
		</Grid>;
	}
}

const mapStateToProps = (storeState, props) =>
{
	return {
		user                      : selectors.getFilteredUser(storeState),
		filteredBlueprintSummaries: selectors.getUserFilteredBlueprintSummaries(storeState, props),
		blueprintSummaries        : selectors.getBlueprintSummariesData(storeState),
		displayName               : selectors.getUserDisplayName(storeState, props),
		displayNameLoading        : selectors.getUserDisplayNameLoading(storeState, props),
		userBlueprintsLoading     : selectors.getUserBlueprintsLoading(storeState, props),
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

export default connect(mapStateToProps, mapDispatchToProps)(UserGrid);
