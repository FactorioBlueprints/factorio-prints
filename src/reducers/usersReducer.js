import update from 'immutability-helper';

import {
	RECEIVED_USER_BLUEPRINTS_KEYS,
	RECEIVED_USER_BLUEPRINTS_SUMMARIES,
	RECEIVED_USER_DISPLAY_NAME,
	SUBSCRIBED_TO_USER_BLUEPRINTS_SUMMARIES,
	FETCHING_USER_DISPLAY_NAME,
} from '../actions/actionTypes';

export const initialUserState = {
	displayName: {
		loading: false,
		data   : undefined,
		error  : undefined,
	},
	blueprints: {
		loading: false,
		data   : [],
		error  : undefined,
	},
};

const userReducer = (state = initialUserState, action) =>
{
	switch (action.type)
	{
		case FETCHING_USER_DISPLAY_NAME:
			return update(state, {
				displayName: {
					loading: {$set: true},
					error  : undefined,
				},
			});
		case RECEIVED_USER_DISPLAY_NAME:
			return update(state, {
				displayName: {
					loading: {$set: false},
					data   : {$set: action.displayName},
					error  : undefined,
				},
			});
		case SUBSCRIBED_TO_USER_BLUEPRINTS_SUMMARIES:
			return update(state, {
				blueprints: {
					loading: {$set: true},
				},
			});
		case RECEIVED_USER_BLUEPRINTS_SUMMARIES:
			return update(state, {
				blueprints: {
					loading: {$set: false},
					data   : {$set: action.userBlueprints},
					error  : undefined,
				},
			});
		default:
			return state;
	}
};

const usersReducer = (state = {}, action) =>
{
	switch (action.type)
	{
		case RECEIVED_USER_DISPLAY_NAME:
		case FETCHING_USER_DISPLAY_NAME:
		case RECEIVED_USER_BLUEPRINTS_SUMMARIES:
		case RECEIVED_USER_BLUEPRINTS_KEYS:
		case SUBSCRIBED_TO_USER_BLUEPRINTS_SUMMARIES:
			return {
				...state,
				[action.userId]: userReducer(state[action.userId], action),
			};
		default:
			return state;
	}
};

export default usersReducer;
