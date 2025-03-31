import {faCog}                from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {useEffect}     from 'react';
import Container              from 'react-bootstrap/Container';
import Row                    from 'react-bootstrap/Row';
import {connect}              from 'react-redux';
import {useParams, useLocation, useNavigate} from 'react-router-dom';
import {bindActionCreators}   from 'redux';

import {filterOnTags, subscribeToUser} from '../actions/actionCreators';

import * as propTypes from '../propTypes';
import * as selectors from '../selectors';

import BlueprintThumbnail from './BlueprintThumbnail';
import NoMatch            from './NoMatch';
import PageHeader         from './PageHeader';
import SearchForm         from './SearchForm';
import TagForm            from './TagForm';

const UserGrid = ({
	id,
	exists,
	displayName,
	displayNameLoading,
	subscribeToUser,
	filterOnTags,
	user,
	blueprintSummaries,
	blueprintSummariesLoading,
	userBlueprintsLoading,
}) =>
{
	useEffect(() =>
	{
		// Logged in user
		if (user)
		{
			subscribeToUser(user.uid);
		}
		// Blueprint author
		subscribeToUser(id);
	}, [user, id, subscribeToUser]);

	if (blueprintSummariesLoading && (userBlueprintsLoading || displayNameLoading || blueprintSummariesLoading))
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

	if (exists === false)
	{
		return <NoMatch />;
	}

	const ownedByCurrentUser = user && user.uid === id;
	const you = ownedByCurrentUser ? ' (You)' : '';

	return (
		<Container fluid>
			<PageHeader title={`Blueprints by ${displayName || '(Anonymous)'}${you}`} />
			<Row>
				<SearchForm />
				<TagForm />
			</Row>
			<Row>
				{
					blueprintSummaries.map(blueprintSummary =>
						<BlueprintThumbnail key={blueprintSummary.key} blueprintSummary={blueprintSummary} />)
				}
			</Row>
		</Container>
	);
};

UserGrid.propTypes = forbidExtraProps({
	id                       : PropTypes.string.isRequired,
	exists                   : PropTypes.bool,
	displayName              : PropTypes.string,
	displayNameLoading       : PropTypes.bool.isRequired,
	subscribeToUser          : PropTypes.func.isRequired,
	filterOnTags             : PropTypes.func.isRequired,
	user                     : propTypes.userSchema,
	blueprintSummaries       : propTypes.blueprintSummariesSchema,
	blueprintSummariesLoading: PropTypes.bool,
	location                 : propTypes.locationSchema,
	history                  : PropTypes.object.isRequired,
	staticContext            : PropTypes.shape(forbidExtraProps({})),
	match                    : PropTypes.shape(forbidExtraProps({
		params: PropTypes.shape(forbidExtraProps({
			userId: PropTypes.string.isRequired,
		})).isRequired,
		path   : PropTypes.string.isRequired,
		url    : PropTypes.string.isRequired,
		isExact: PropTypes.bool.isRequired,
	})).isRequired,
});

const mapStateToProps = (storeState, ownProps) =>
{
	const id = ownProps.match.params.userId;
	const user = storeState.users[id];
	const exists = user && user.exists;

	return {
		id,
		user                     : selectors.getFilteredUser(storeState),
		blueprintSummaries       : selectors.getUserFilteredBlueprintSummaries(storeState, {id}),
		blueprintSummariesLoading: selectors.getUserBlueprintsLoading(storeState, {id}),
		displayName              : selectors.getUserDisplayName(storeState, {id}),
		displayNameLoading       : selectors.getUserDisplayNameLoading(storeState, {id}),
		exists,
	};
};

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {
		filterOnTags,
		subscribeToUser,
	};
	return bindActionCreators(actionCreators, dispatch);
};

const ConnectedUserGrid = connect(mapStateToProps, mapDispatchToProps)(UserGrid);

// Wrapper to provide router props to class component
function UserGridWrapper()
{
	const params = useParams();
	const location = useLocation();
	const navigate = useNavigate();

	return (
		<ConnectedUserGrid
			id={params.userId}
			location={location}
			history={{push: navigate}}
			match={{
				params : {userId: params.userId},
				path   : '/user/:userId',
				url    : `/user/${params.userId}`,
				isExact: true,
			}}
		/>
	);
}

export default UserGridWrapper;
